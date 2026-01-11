# Deep Link Tracking - Backend Implementation Guide

## Overview
This document describes the backend changes needed to track deep link clicks and identify users based on their IP address when they open the app.

## Database Schema

### Table: `deeplink_clicks`

Create a new table to store deep link click tracking data:

```sql
CREATE TABLE deeplink_clicks (
    id BIGSERIAL PRIMARY KEY,
    deal_id INTEGER NOT NULL,
    public_ip VARCHAR(45) NOT NULL,
    city VARCHAR(100),
    region VARCHAR(100),
    country VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    user_agent TEXT,
    platform VARCHAR(100),
    language VARCHAR(10),
    screen_resolution VARCHAR(20),
    referrer TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    user_id INTEGER NULL,  -- Will be populated when user is identified in app
    clicked_at TIMESTAMP NOT NULL DEFAULT NOW()
    
    -- Foreign key if you want to link to deals table
    -- Uncomment these if you have deals and users tables
    -- FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
    -- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for faster lookups
CREATE INDEX idx_deeplink_public_ip ON deeplink_clicks(public_ip);
CREATE INDEX idx_deeplink_deal_id ON deeplink_clicks(deal_id);
CREATE INDEX idx_deeplink_timestamp ON deeplink_clicks(timestamp);
CREATE INDEX idx_deeplink_user_id ON deeplink_clicks(user_id);
CREATE INDEX idx_deeplink_clicked_at ON deeplink_clicks(clicked_at);
```

### Table: `user_device_tracking`

Optional table to store user device information for better identification:

```sql
CREATE TABLE user_device_tracking (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    public_ip VARCHAR(45),
    device_info JSONB,  -- Store device details as JSON
    last_seen TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
    
    -- Uncomment if you have a users table
    -- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for faster lookups
CREATE INDEX idx_device_tracking_user_id ON user_device_tracking(user_id);
CREATE INDEX idx_device_tracking_public_ip ON user_device_tracking(public_ip);
CREATE INDEX idx_device_tracking_last_seen ON user_device_tracking(last_seen);
```

## API Endpoints

### 1. Track Deep Link Click (Called from Web)

**Endpoint:** `POST /api/deeplink/track`

**Request Body:**
```json
{
  "dealId": "123",
  "publicIp": "203.0.113.0",
  "city": "San Francisco",
  "region": "California",
  "country": "United States",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "userAgent": "Mozilla/5.0 ...",
  "platform": "MacIntel",
  "language": "en-US",
  "screenResolution": "1920x1080",
  "timestamp": "2026-01-11T10:30:00Z",
  "referrer": "https://instagram.com"
}
```

**Response:**
```json
{
  "success": true,
  "trackingId": "uuid-here"
}
```

**Implementation Example (Node.js/Express):**

```javascript
app.post('/api/deeplink/track', async (req, res) => {
  try {
    const {
      dealId,
      publicIp,
      city,
      region,
      country,
      latitude,
      longitude,
      userAgent,
      platform,
      language,
      screenResolution,
      timestamp,
      referrer
    } = req.body;

    // Validate required fields
    if (!dealId || !publicIp) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: dealId and publicIp'
      });
    }

    // Insert into database
    const result = await db.query(
      `INSERT INTO deeplink_clicks 
       (deal_id, public_ip, city, region, country, latitude, longitude, 
        user_agent, platform, language, screen_resolution, referrer, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
      [dealId, publicIp, city, region, country, latitude, longitude,
       userAgent, platform, language, screenResolution, referrer, timestamp]
    );

    res.json({
      success: true,
      trackingId: result.rows[0].id
    });
  } catch (error) {
    console.error('Error tracking deep link click:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track deep link click'
    });
  }
});
```

### 2. Identify User by IP (Called from App)

**Endpoint:** `POST /api/deeplink/identify`

**Request Body:**
```json
{
  "publicIp": "203.0.113.0",
  "userId": 456,
  "deviceInfo": {
    "deviceId": "device-uuid",
    "model": "iPhone 14 Pro",
    "os": "iOS 17.2",
    "appVersion": "1.0.0"
  }
}
```

**Response:**
```json
{
  "success": true,
  "recentClick": {
    "dealId": "123",
    "clickedAt": "2026-01-11T10:30:00Z",
    "city": "San Francisco"
  }
}
```

**Implementation Example (Node.js/Express):**

```javascript
app.post('/api/deeplink/identify', async (req, res) => {
  try {
    const { publicIp, userId, deviceInfo } = req.body;

    if (!publicIp || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: publicIp and userId'
      });
    }

    // Find recent deep link clicks from this IP (within last 24 hours)
    const recentClick = await db.query(
      `SELECT deal_id, clicked_at, city, region, country
       FROM deeplink_clicks
       WHERE public_ip = $1 
       AND user_id IS NULL
       AND clicked_at > NOW() - INTERVAL '24 hours'
       ORDER BY clicked_at DESC
       LIMIT 1`,
      [publicIp]
    );

    // Update the click record with user ID
    if (recentClick.rows.length > 0) {
      await db.query(
        `UPDATE deeplink_clicks 
         SET user_id = $1 
         WHERE public_ip = $2 
         AND user_id IS NULL
         AND clicked_at > NOW() - INTERVAL '24 hours'`,
        [userId, publicIp]
      );
    }

    // Store device tracking info
    await db.query(
      `INSERT INTO user_device_tracking (user_id, public_ip, device_info, last_seen)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, public_ip) 
       DO UPDATE SET last_seen = NOW(), device_info = $3`,
      [userId, publicIp, JSON.stringify(deviceInfo)]
    );

    res.json({
      success: true,
      recentClick: recentClick.rows.length > 0 ? {
        dealId: recentClick.rows[0].deal_id,
        clickedAt: recentClick.rows[0].clicked_at,
        city: recentClick.rows[0].city
      } : null
    });
  } catch (error) {
    console.error('Error identifying user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to identify user'
    });
  }
});
```

## Analytics Queries

### Get Deep Link Performance by Deal

```sql
SELECT 
    d.id,
    d.title,
    COUNT(dc.id) as total_clicks,
    COUNT(DISTINCT dc.public_ip) as unique_ips,
    COUNT(dc.user_id) as identified_users,
    COUNT(dc.user_id)::FLOAT / COUNT(dc.id) * 100 as conversion_rate
FROM deals d
LEFT JOIN deeplink_clicks dc ON d.id = dc.deal_id
WHERE dc.clicked_at > NOW() - INTERVAL '30 days'
GROUP BY d.id, d.title
ORDER BY total_clicks DESC;
```

### Get Recent Unidentified Clicks

```sql
SELECT 
    deal_id,
    public_ip,
    city,
    country,
    clicked_at,
    user_agent
FROM deeplink_clicks
WHERE user_id IS NULL
AND clicked_at > NOW() - INTERVAL '24 hours'
ORDER BY clicked_at DESC;
```

## Important Notes

1. **Privacy Considerations:**
   - Inform users in your privacy policy that you track IP addresses for analytics
   - Consider GDPR/CCPA compliance requirements
   - Implement data retention policies (e.g., delete tracking data after 90 days)

2. **IP Address Limitations:**
   - Multiple users behind the same NAT/corporate network will have the same public IP
   - Mobile users on cellular networks may have changing IPs
   - VPN users will have different IPs than their actual location

3. **MAC Address:**
   - **Cannot be accessed from web browsers** for security reasons
   - Can only be collected from native apps (iOS/Android)
   - Consider using device identifiers instead (IDFA on iOS, AAID on Android)

4. **Rate Limiting:**
   - Implement rate limiting on the tracking endpoint to prevent abuse
   - Example: 10 requests per IP per minute

5. **CORS Configuration:**
   - Ensure your backend allows requests from your web domain
   - Add proper CORS headers

## Configuration

Update your web-redirect/index.html with your backend URL:

```javascript
const backendUrl = 'https://your-api-domain.com/api/deeplink/track';
```

## Testing

Test the tracking flow:

1. Open a deep link URL in a browser: `https://your-domain.com/deal/123`
2. Check the database for a new record in `deeplink_clicks`
3. Open the app and verify the identify endpoint is called
4. Check that the `user_id` is populated in the tracking record
