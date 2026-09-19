# Deep Link Tracking Integration - App Startup

## Overview
This guide explains how to integrate deep link tracking into your app's startup flow.

## Integration Steps

### 1. Install Required Packages

```bash
npm install react-native-device-info @react-native-community/netinfo
cd ios && pod install && cd ..
```

### 2. Add to App.tsx (or your root component)

Add this code to the `App.tsx` or `AppNavigator.tsx` file to identify users on app startup:

```typescript
import { useEffect } from 'react';
import { useAuth } from './libs/hooks/useAuth';
import deepLinkTrackingService from './services/deeplink-tracking.service';
import { useNavigation } from '@react-navigation/native';

// Inside your main App component
const App = () => {
  const { user, isAuthenticated } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    // This should be the FIRST call in your app
    const identifyUserAndNavigate = async () => {
      if (isAuthenticated && user?.id) {
        try {
          console.log('🚀 App startup: Identifying user for deep link tracking...');
          
          // Check if user clicked a deep link recently
          const result = await deepLinkTrackingService.identifyUserAndCheckDeepLink(user.id);
          
          if (result.dealId) {
            console.log(`✅ User clicked deep link for deal ${result.dealId}, navigating...`);
            
            // Navigate to the deal they clicked
            navigation.navigate('DealDetail', { 
              dealId: parseInt(result.dealId),
              fromDeepLink: true 
            });
          }
          
          // Also track general app open for analytics
          await deepLinkTrackingService.trackAppOpen(user.id);
        } catch (error) {
          console.error('❌ Error in deep link identification:', error);
          // Don't block app startup if this fails
        }
      }
    };

    identifyUserAndNavigate();
  }, [isAuthenticated, user?.id]);

  // ... rest of your App component
};
```

### 3. Alternative: Add to Auth Context

If you want tighter integration with authentication, add it to your `AuthContext`:

```typescript
// In AuthContext.tsx or useAuth hook
useEffect(() => {
  if (isAuthenticated && user?.id) {
    // Identify user and check for deep link clicks
    deepLinkTrackingService.identifyUserAndCheckDeepLink(user.id)
      .then(result => {
        if (result.dealId) {
          // Store in state to be consumed by navigator
          setPendingDeepLinkDealId(result.dealId);
        }
      });
  }
}, [isAuthenticated, user?.id]);
```

### 4. Update Backend URL in HTML

In `web-redirect/index.html`, update the backend URL:

```javascript
// Replace this line
const backendUrl = 'https://your-api-domain.com/api/deeplink/track';

// With your actual backend URL
const backendUrl = 'https://api.fribee.com/api/deeplink/track';
```

## Flow Diagram

```
1. User clicks deep link on web/social media
   ↓
2. Web page loads, tracks click with IP + deal ID → Backend Database
   ↓
3. Web page redirects to app
   ↓
4. App launches
   ↓
5. App calls identifyUserAndCheckDeepLink() with user ID + IP
   ↓
6. Backend matches IP to recent click, returns deal ID
   ↓
7. App navigates user to the specific deal
   ↓
8. Backend updates click record with user ID (linking click to user)
```

## Important Considerations

### Timing
- The identification call should happen **FIRST** on app startup
- It should run before any other API calls
- It should not block the UI or prevent app from launching

### Error Handling
- If tracking fails, the app should continue normally
- Log errors for debugging but don't show them to users
- Don't crash or hang if the backend is unavailable

### Privacy
- Inform users in your privacy policy that you collect IP addresses
- Consider GDPR/CCPA compliance requirements
- Implement data retention policies

### IP Address Limitations
- Multiple users behind same WiFi will have same IP
- Mobile users on cellular may have changing IPs
- VPN users will show different locations
- Time window: Only match clicks within 24 hours (configurable)

## Testing

1. **Test the Web Tracking:**
   ```bash
   # Open a deep link in browser
   open https://your-domain.com/deal/123
   
   # Check browser console for tracking logs
   # Check backend database for new record in deeplink_clicks table
   ```

2. **Test the App Identification:**
   ```bash
   # Run the app
   npm run ios  # or npm run android
   
   # Check app logs for identification messages:
   # "🔍 Identifying user and checking for deep link clicks..."
   # "✅ Found recent deep link click!"
   ```

3. **Test End-to-End:**
   - Click deep link in browser
   - Wait for redirect to app
   - Verify app opens to the correct deal
   - Check database that user_id is populated in deeplink_clicks table

## Troubleshooting

### App doesn't navigate to deal
- Check app logs for identification messages
- Verify backend API endpoint is correct
- Check that user clicked link within 24-hour window
- Verify IP address matches between web click and app open

### Tracking not working
- Check CORS configuration on backend
- Verify ipapi.co is accessible (may be blocked in some regions)
- Check network requests in browser dev tools
- Verify backend endpoint returns 200 status

### Multiple users, same IP
- This is expected for corporate networks/WiFi
- Consider adding additional device fingerprinting
- Or use shorter time windows (e.g., 1 hour instead of 24)

## Analytics Queries

Once data is collected, you can analyze:

```sql
-- Conversion rate: clicks to identified users
SELECT 
  COUNT(*) as total_clicks,
  COUNT(user_id) as identified_users,
  COUNT(user_id)::FLOAT / COUNT(*) * 100 as conversion_rate
FROM deeplink_clicks
WHERE clicked_at > NOW() - INTERVAL '30 days';

-- Most shared deals
SELECT 
  deal_id,
  COUNT(*) as click_count,
  COUNT(DISTINCT public_ip) as unique_users
FROM deeplink_clicks
WHERE clicked_at > NOW() - INTERVAL '7 days'
GROUP BY deal_id
ORDER BY click_count DESC
LIMIT 10;
```
