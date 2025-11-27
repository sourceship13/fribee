# Backend IAP Integration - Complete Implementation Guide

## Overview
This guide shows you exactly how to integrate In-App Purchase verification with your backend, with complete working code examples.

---

## Architecture Overview

```
Mobile App (iOS/Android)
    ↓ Purchase completed
    ↓ Send receipt to backend
Backend Server
    ↓ Verify with Apple/Google
Apple/Google Servers
    ↓ Return verification result
Backend Server
    ↓ Save to database
    ↓ Return success to app
Mobile App
    ↓ Show success & continue
```

---

## Part 1: Database Setup

### Step 1: Create Database Tables

Run these SQL commands in your PostgreSQL database:

```sql
-- 1. Subscriptions table (stores active subscriptions)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Subscription Details
  product_id VARCHAR(255) NOT NULL,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android')),
  status VARCHAR(50) NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'expired', 'cancelled', 'pending', 'failed')),
  
  -- Purchase Information
  purchase_token TEXT NOT NULL,
  transaction_id VARCHAR(255),
  original_transaction_id VARCHAR(255),
  
  -- Receipt/Verification Data
  receipt_data TEXT,
  signature TEXT,
  
  -- Subscription Period
  start_date TIMESTAMP NOT NULL,
  expiry_date TIMESTAMP NOT NULL,
  auto_renewing BOOLEAN DEFAULT true,
  
  -- Metadata
  verified_at TIMESTAMP,
  last_verified_at TIMESTAMP,
  verification_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, purchase_token)
);

-- Create indexes for subscriptions
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_expiry ON subscriptions(expiry_date);
CREATE INDEX idx_subscriptions_product ON subscriptions(product_id);

-- 2. Subscription events (real-time events from app stores)
CREATE TABLE subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Event Information
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'initial_purchase', 'renewal', 'cancellation', 'expiration',
    'billing_issue', 'billing_recovery', 'price_change_confirmed',
    'refund', 'revoke', 'grace_period_start', 'grace_period_end',
    'pause', 'resume', 'product_change'
  )),
  event_subtype VARCHAR(50),
  
  -- Platform Details
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android')),
  notification_type VARCHAR(100), -- e.g., 'DID_RENEW', 'DID_CHANGE_RENEWAL_STATUS'
  
  -- Transaction Details
  transaction_id VARCHAR(255),
  original_transaction_id VARCHAR(255),
  product_id VARCHAR(255),
  
  -- Raw Data
  raw_payload JSONB NOT NULL, -- Complete webhook payload
  
  -- Processing
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP,
  error_message TEXT,
  
  -- Timestamps
  event_timestamp TIMESTAMP NOT NULL,
  received_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for subscription_events
CREATE INDEX idx_subscription_events_sub_id ON subscription_events(subscription_id);
CREATE INDEX idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX idx_subscription_events_type ON subscription_events(event_type);
CREATE INDEX idx_subscription_events_platform ON subscription_events(platform);
CREATE INDEX idx_subscription_events_processed ON subscription_events(processed);
CREATE INDEX idx_subscription_events_timestamp ON subscription_events(event_timestamp);
CREATE INDEX idx_subscription_events_transaction ON subscription_events(transaction_id);

-- 3. Subscription history (audit trail - processed events)
CREATE TABLE subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES subscription_events(id) ON DELETE SET NULL,
  
  -- Event Information
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'purchase', 'renewal', 'cancellation', 'expiration', 
    'refund', 'verification', 'grace_period', 'billing_issue',
    'billing_recovery', 'pause', 'resume', 'product_change'
  )),
  
  -- Previous State
  previous_status VARCHAR(50),
  previous_expiry_date TIMESTAMP,
  
  -- New State
  new_status VARCHAR(50),
  new_expiry_date TIMESTAMP,
  
  -- Details
  description TEXT,
  event_data JSONB, -- Structured event details
  
  -- Timestamps
  event_date TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for subscription_history
CREATE INDEX idx_subscription_history_sub_id ON subscription_history(subscription_id);
CREATE INDEX idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX idx_subscription_history_event_id ON subscription_history(event_id);
CREATE INDEX idx_subscription_history_event_type ON subscription_history(event_type);
CREATE INDEX idx_subscription_history_event_date ON subscription_history(event_date);

-- 4. Subscription products (product catalog)
CREATE TABLE subscription_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Product Identifiers
  product_id VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Pricing
  price_usd DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  billing_period VARCHAR(50) NOT NULL CHECK (billing_period IN (
    'weekly', 'monthly', 'quarterly', 'semi_annual', 'annual'
  )),
  billing_period_value INTEGER DEFAULT 1, -- e.g., 1 month, 3 months
  
  -- Trial Period
  trial_period_days INTEGER DEFAULT 0,
  trial_price DECIMAL(10, 2) DEFAULT 0.00,
  
  -- Features & Limits
  features JSONB, -- Array of feature strings
  max_deals INTEGER, -- Max deals allowed per period
  max_business_users INTEGER, -- Max team members
  priority_support BOOLEAN DEFAULT false,
  analytics_enabled BOOLEAN DEFAULT false,
  api_access BOOLEAN DEFAULT false,
  
  -- Platform Availability
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android', 'both')),
  
  -- Display
  display_order INTEGER DEFAULT 0,
  badge_text VARCHAR(50), -- e.g., "POPULAR", "BEST VALUE"
  highlight_color VARCHAR(7), -- Hex color for UI
  
  -- Status
  active BOOLEAN DEFAULT true,
  available_from TIMESTAMP,
  available_until TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for subscription_products
CREATE INDEX idx_subscription_products_product_id ON subscription_products(product_id);
CREATE INDEX idx_subscription_products_active ON subscription_products(active);
CREATE INDEX idx_subscription_products_platform ON subscription_products(platform);
CREATE INDEX idx_subscription_products_display_order ON subscription_products(display_order);
```

---

## Part 2: Backend Implementation (Node.js/Express)

### Step 1: Install Dependencies

```bash
npm install express pg jsonwebtoken
npm install node-fetch@2
npm install googleapis google-auth-library
```

### Step 2: Environment Variables

Create/update `.env` file:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/nolimitsera

# iOS App Store
APPLE_SHARED_SECRET=your_shared_secret_here

# Android Google Play
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/path/to/google-service-account.json
GOOGLE_PACKAGE_NAME=com.nolimitsera

# API
PORT=3000
JWT_SECRET=your_jwt_secret
```

### Step 3: Database Configuration

**File: `/backend/config/database.js`**

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

module.exports = pool;
```

### Step 4: Apple Receipt Verification Service

**File: `/backend/services/apple-iap.service.js`**

```javascript
const fetch = require('node-fetch');

// Apple endpoints
const SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';
const PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';

const SHARED_SECRET = process.env.APPLE_SHARED_SECRET;

/**
 * Verify Apple receipt with App Store
 */
async function verifyAppleReceipt(receiptData, transactionId) {
  console.log('🍎 Verifying Apple receipt...');
  
  try {
    // Try production first
    let response = await sendVerificationRequest(PRODUCTION_URL, receiptData);
    
    // If status 21007, it's a sandbox receipt
    if (response.status === 21007) {
      console.log('📱 Receipt is from sandbox, retrying with sandbox URL');
      response = await sendVerificationRequest(SANDBOX_URL, receiptData);
    }

    // Status 0 = valid receipt
    if (response.status !== 0) {
      console.error('❌ Invalid receipt status:', response.status);
      return {
        valid: false,
        error: getAppleStatusMessage(response.status)
      };
    }

    // Get the latest subscription info
    const latestInfo = response.latest_receipt_info?.[0] || response.receipt?.in_app?.[0];
    
    if (!latestInfo) {
      return { valid: false, error: 'No subscription info in receipt' };
    }

    // Extract subscription details
    const expiryTimestamp = parseInt(latestInfo.expires_date_ms || latestInfo.expires_date);
    const purchaseTimestamp = parseInt(latestInfo.purchase_date_ms || latestInfo.purchase_date);
    const isAutoRenewing = response.pending_renewal_info?.[0]?.auto_renew_status === '1';

    console.log('✅ Apple receipt verified successfully');

    return {
      valid: true,
      transactionId: latestInfo.transaction_id,
      originalTransactionId: latestInfo.original_transaction_id,
      productId: latestInfo.product_id,
      purchaseDate: new Date(purchaseTimestamp),
      expiryDate: new Date(expiryTimestamp),
      autoRenewing: isAutoRenewing,
      environment: response.status === 21007 ? 'Sandbox' : 'Production'
    };

  } catch (error) {
    console.error('❌ Apple receipt verification error:', error);
    return { valid: false, error: error.message };
  }
}

async function sendVerificationRequest(url, receiptData) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      'receipt-data': receiptData,
      'password': SHARED_SECRET,
      'exclude-old-transactions': true,
    }),
  });

  return response.json();
}

function getAppleStatusMessage(status) {
  const messages = {
    21000: 'App Store could not read the receipt',
    21002: 'Receipt data malformed',
    21003: 'Receipt could not be authenticated',
    21004: 'Shared secret does not match',
    21005: 'Receipt server is not available',
    21006: 'Receipt is valid but subscription has expired',
    21007: 'Receipt is from sandbox (test environment)',
    21008: 'Receipt is from production',
    21010: 'Receipt could not be authorized',
  };
  return messages[status] || `Unknown error (${status})`;
}

module.exports = { verifyAppleReceipt };
```

### Step 5: Google Play Verification Service

**File: `/backend/services/google-iap.service.js`**

```javascript
const { google } = require('googleapis');

// Initialize Google Play Developer API
const androidpublisher = google.androidpublisher('v3');

const PACKAGE_NAME = process.env.GOOGLE_PACKAGE_NAME;

let authClient = null;

/**
 * Initialize Google Auth
 */
async function initGoogleAuth() {
  if (authClient) return authClient;

  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });

  authClient = await auth.getClient();
  console.log('✅ Google Play auth initialized');
  return authClient;
}

/**
 * Verify Google Play purchase
 */
async function verifyGoogleReceipt(purchaseToken, productId) {
  console.log('🤖 Verifying Google Play purchase...');
  
  try {
    const auth = await initGoogleAuth();
    
    // Verify subscription purchase
    const response = await androidpublisher.purchases.subscriptions.get({
      auth: auth,
      packageName: PACKAGE_NAME,
      subscriptionId: productId,
      token: purchaseToken,
    });

    const purchase = response.data;

    // Check if subscription is valid (paymentState: 1 = paid, 0 = pending)
    if (!purchase || purchase.paymentState !== 1) {
      console.error('❌ Invalid Google Play purchase:', purchase);
      return { 
        valid: false, 
        error: 'Payment not received or pending' 
      };
    }

    const startTimeMillis = parseInt(purchase.startTimeMillis || '0');
    const expiryTimeMillis = parseInt(purchase.expiryTimeMillis || '0');
    const autoRenewing = purchase.autoRenewing || false;

    console.log('✅ Google Play purchase verified successfully');

    return {
      valid: true,
      transactionId: purchase.orderId || purchaseToken,
      originalTransactionId: purchase.orderId || purchaseToken,
      productId: productId,
      purchaseDate: new Date(startTimeMillis),
      expiryDate: new Date(expiryTimeMillis),
      autoRenewing: autoRenewing,
      environment: 'Production'
    };

  } catch (error) {
    console.error('❌ Google Play verification error:', error);
    return { 
      valid: false, 
      error: error.message 
    };
  }
}

module.exports = { verifyGoogleReceipt };
```

### Step 6: Database Service

**File: `/backend/services/subscription.service.js`**

```javascript
const pool = require('../config/database');

/**
 * Save or update subscription in database
 */
async function saveSubscription(data) {
  const {
    userId,
    platform,
    productId,
    purchaseToken,
    transactionId,
    originalTransactionId,
    receiptData,
    startDate,
    expiryDate,
    autoRenewing,
  } = data;

  console.log('💾 Saving subscription to database...');

  try {
    // Check if subscription already exists
    const existingQuery = `
      SELECT id, status, expiry_date FROM subscriptions 
      WHERE user_id = $1 AND purchase_token = $2
    `;
    const existing = await pool.query(existingQuery, [userId, purchaseToken]);

    if (existing.rows.length > 0) {
      const existingRow = existing.rows[0];
      
      // Update existing subscription
      const updateQuery = `
        UPDATE subscriptions 
        SET 
          status = 'active',
          expiry_date = $1,
          auto_renewing = $2,
          last_verified_at = NOW(),
          verification_count = verification_count + 1,
          updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `;
      const result = await pool.query(updateQuery, [
        expiryDate,
        autoRenewing,
        existingRow.id,
      ]);
      
      // Log history for renewal
      await logSubscriptionHistory({
        subscriptionId: existingRow.id,
        userId,
        eventType: 'renewal',
        previousStatus: existingRow.status,
        previousExpiryDate: existingRow.expiry_date,
        newStatus: 'active',
        newExpiryDate: expiryDate,
        description: 'Subscription renewed',
        eventData: { autoRenewing, platform }
      });
      
      console.log('✅ Subscription updated');
      return result.rows[0];
    } else {
      // Insert new subscription
      const insertQuery = `
        INSERT INTO subscriptions (
          user_id, product_id, platform, status, purchase_token,
          transaction_id, original_transaction_id, receipt_data,
          start_date, expiry_date, auto_renewing, 
          verified_at, last_verified_at
        )
        VALUES ($1, $2, $3, 'active', $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *
      `;
      const result = await pool.query(insertQuery, [
        userId,
        productId,
        platform,
        purchaseToken,
        transactionId,
        originalTransactionId,
        receiptData,
        startDate,
        expiryDate,
        autoRenewing,
      ]);
      
      // Log history for initial purchase
      await logSubscriptionHistory({
        subscriptionId: result.rows[0].id,
        userId,
        eventType: 'purchase',
        newStatus: 'active',
        newExpiryDate: expiryDate,
        description: 'New subscription purchased',
        eventData: { productId, platform, transactionId }
      });
      
      console.log('✅ New subscription created');
      return result.rows[0];
    }
  } catch (error) {
    console.error('❌ Error saving subscription:', error);
    throw error;
  }
}

/**
 * Log subscription history (processed events)
 */
async function logSubscriptionHistory(data) {
  const { 
    subscriptionId, 
    userId, 
    eventId = null,
    eventType, 
    previousStatus = null,
    previousExpiryDate = null,
    newStatus = null,
    newExpiryDate = null,
    description = null,
    eventData 
  } = data;

  const query = `
    INSERT INTO subscription_history (
      subscription_id, user_id, event_id, event_type,
      previous_status, previous_expiry_date,
      new_status, new_expiry_date,
      description, event_data
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;

  try {
    const result = await pool.query(query, [
      subscriptionId,
      userId,
      eventId,
      eventType,
      previousStatus,
      previousExpiryDate,
      newStatus,
      newExpiryDate,
      description,
      JSON.stringify(eventData),
    ]);
    
    console.log(`✅ Logged ${eventType} in history`);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error logging history:', error);
    throw error;
  }
}

/**
 * Save subscription event (raw webhook/notification data)
 */
async function saveSubscriptionEvent(data) {
  const {
    subscriptionId = null,
    userId,
    eventType,
    eventSubtype = null,
    platform,
    notificationType = null,
    transactionId = null,
    originalTransactionId = null,
    productId = null,
    rawPayload,
    eventTimestamp,
  } = data;

  const query = `
    INSERT INTO subscription_events (
      subscription_id, user_id, event_type, event_subtype,
      platform, notification_type, transaction_id, 
      original_transaction_id, product_id, raw_payload, event_timestamp
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;

  try {
    const result = await pool.query(query, [
      subscriptionId,
      userId,
      eventType,
      eventSubtype,
      platform,
      notificationType,
      transactionId,
      originalTransactionId,
      productId,
      JSON.stringify(rawPayload),
      eventTimestamp,
    ]);
    
    console.log(`✅ Saved ${eventType} event`);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error saving event:', error);
    throw error;
  }
}

/**
 * Get user's active subscription with product details
 */
async function getUserActiveSubscription(userId) {
  const query = `
    SELECT s.*, sp.name as product_name, sp.features, sp.max_deals
    FROM subscriptions s
    LEFT JOIN subscription_products sp ON s.product_id = sp.product_id
    WHERE s.user_id = $1 
      AND s.status = 'active'
      AND s.expiry_date > NOW()
    ORDER BY s.expiry_date DESC
    LIMIT 1
  `;

  const result = await pool.query(query, [userId]);
  return result.rows[0] || null;
}

/**
 * Get subscription products (catalog)
 */
async function getSubscriptionProducts(platform = 'both') {
  const query = `
    SELECT * FROM subscription_products
    WHERE active = true
      AND (platform = $1 OR platform = 'both')
      AND (available_from IS NULL OR available_from <= NOW())
      AND (available_until IS NULL OR available_until >= NOW())
    ORDER BY display_order ASC, price_usd ASC
  `;

  const result = await pool.query(query, [platform]);
  return result.rows;
}

/**
 * Get subscription product by ID
 */
async function getSubscriptionProduct(productId) {
  const query = `
    SELECT * FROM subscription_products
    WHERE product_id = $1 AND active = true
  `;

  const result = await pool.query(query, [productId]);
  return result.rows[0] || null;
}

/**
 * Check for expired subscriptions (run via cron)
 */
async function checkExpiredSubscriptions() {
  console.log('🔍 Checking for expired subscriptions...');

  const query = `
    UPDATE subscriptions
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active' 
      AND expiry_date < NOW()
      AND auto_renewing = false
    RETURNING *
  `;

  try {
    const result = await pool.query(query);

    if (result.rows.length > 0) {
      console.log(`⏰ Expired ${result.rows.length} subscriptions`);
      
      // Log history for each expired subscription
      for (const sub of result.rows) {
        await logSubscriptionHistory({
          subscriptionId: sub.id,
          userId: sub.user_id,
          eventType: 'expiration',
          previousStatus: 'active',
          previousExpiryDate: sub.expiry_date,
          newStatus: 'expired',
          newExpiryDate: sub.expiry_date,
          description: 'Subscription expired (not auto-renewing)',
          eventData: { expiredAt: new Date() }
        });
      }
    }
  } catch (error) {
    console.error('❌ Error checking expired subscriptions:', error);
  }
}

module.exports = {
  saveSubscription,
  logSubscriptionHistory,
  saveSubscriptionEvent,
  getUserActiveSubscription,
  getSubscriptionProducts,
  getSubscriptionProduct,
  checkExpiredSubscriptions,
};
```

### Step 7: Authentication Middleware

**File: `/backend/middleware/auth.middleware.js`**

```javascript
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Verify JWT token and attach user to request
 */
function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Missing or invalid authorization header'
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.userId, email: decoded.email };
    next();
  } catch (error) {
    console.error('❌ JWT verification failed:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
}

module.exports = { authenticateUser };
```

### Step 8: Subscription Routes

**File: `/backend/routes/subscription.routes.js`**

```javascript
const express = require('express');
const router = express.Router();

const { verifyAppleReceipt } = require('../services/apple-iap.service');
const { verifyGoogleReceipt } = require('../services/google-iap.service');
const { 
  saveSubscription, 
  logSubscriptionEvent,
  getUserActiveSubscription 
} = require('../services/subscription.service');
const { authenticateUser } = require('../middleware/auth.middleware');

/**
 * POST /api/subscriptions/verify
 * Verify and save subscription purchase
 */
router.post('/verify', authenticateUser, async (req, res) => {
  const { platform, purchaseToken, productId, transactionReceipt } = req.body;
  const userId = req.user.id;

  console.log('📥 Received verification request:', { 
    platform, 
    productId, 
    userId,
    hasPurchaseToken: !!purchaseToken,
    hasReceipt: !!transactionReceipt
  });

  // Validate input
  if (!platform || !purchaseToken || !productId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: platform, purchaseToken, productId'
    });
  }

  if (!['ios', 'android'].includes(platform)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid platform. Must be "ios" or "android"'
    });
  }

  try {
    let verificationResult;

    // Verify with appropriate platform
    if (platform === 'ios') {
      if (!transactionReceipt) {
        return res.status(400).json({
          success: false,
          error: 'Missing transactionReceipt for iOS purchase'
        });
      }
      
      verificationResult = await verifyAppleReceipt(
        transactionReceipt, 
        purchaseToken
      );
    } else if (platform === 'android') {
      verificationResult = await verifyGoogleReceipt(
        purchaseToken, 
        productId
      );
    }

    // Check if verification was successful
    if (!verificationResult.valid) {
      console.error('❌ Verification failed:', verificationResult.error);
      return res.status(400).json({
        success: false,
        error: verificationResult.error || 'Purchase verification failed'
      });
    }

    // Save subscription to database
    const subscription = await saveSubscription({
      userId,
      platform,
      productId,
      purchaseToken,
      transactionId: verificationResult.transactionId,
      originalTransactionId: verificationResult.originalTransactionId,
      receiptData: transactionReceipt,
      startDate: verificationResult.purchaseDate,
      expiryDate: verificationResult.expiryDate,
      autoRenewing: verificationResult.autoRenewing,
    });

    // Log the purchase event
    await logSubscriptionEvent({
      subscriptionId: subscription.id,
      userId,
      eventType: 'purchase',
      eventData: {
        platform,
        productId,
        environment: verificationResult.environment,
        verifiedAt: new Date()
      },
    });

    console.log('✅ Subscription verified and saved successfully');

    // Return success response
    res.json({
      success: true,
      data: {
        subscriptionId: subscription.id,
        status: subscription.status,
        expiryDate: subscription.expiry_date,
        productId: subscription.product_id,
        autoRenewing: subscription.auto_renewing
      }
    });

  } catch (error) {
    console.error('💥 Subscription verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify subscription. Please try again.'
    });
  }
});

/**
 * GET /api/subscriptions/status
 * Get user's current subscription status
 */
router.get('/status', authenticateUser, async (req, res) => {
  const userId = req.user.id;

  try {
    const subscription = await getUserActiveSubscription(userId);

    if (!subscription) {
      return res.json({
        success: true,
        data: {
          hasActiveSubscription: false
        }
      });
    }

    res.json({
      success: true,
      data: {
        hasActiveSubscription: true,
        subscriptionId: subscription.id,
        productId: subscription.product_id,
        platform: subscription.platform,
        status: subscription.status,
        expiryDate: subscription.expiry_date,
        autoRenewing: subscription.auto_renewing
      }
    });

  } catch (error) {
    console.error('❌ Error fetching subscription status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription status'
    });
  }
});

module.exports = router;
```

### Step 9: Main Server File

**File: `/backend/server.js`**

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const subscriptionRoutes = require('./routes/subscription.routes');
const { checkExpiredSubscriptions } = require('./services/subscription.service');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/subscriptions', subscriptionRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 Verify endpoint: http://localhost:${PORT}/api/subscriptions/verify`);
  
  // Run subscription expiry check every hour
  setInterval(checkExpiredSubscriptions, 60 * 60 * 1000);
  console.log('⏰ Subscription expiry checker scheduled (runs hourly)');
});
```

---

## Part 3: Testing the Backend

### Step 1: Start the Server

```bash
cd backend
npm install
node server.js
```

Expected output:
```
✅ Connected to PostgreSQL database
✅ Server running on port 3000
📍 Health check: http://localhost:3000/health
📍 Verify endpoint: http://localhost:3000/api/subscriptions/verify
⏰ Subscription expiry checker scheduled (runs hourly)
```

### Step 2: Test with cURL

**iOS Purchase:**
```bash
curl -X POST http://localhost:3000/api/subscriptions/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "platform": "ios",
    "purchaseToken": "1000000123456789",
    "productId": "com.nolimitsera.monthly.subscription.premium.staging",
    "transactionReceipt": "BASE64_RECEIPT_DATA_HERE"
  }'
```

**Android Purchase:**
```bash
curl -X POST http://localhost:3000/api/subscriptions/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "platform": "android",
    "purchaseToken": "abcdef123456.AO-J1OxXXXXX",
    "productId": "com.nolimitsera.monthly.subscription.premium.staging"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "subscriptionId": "uuid-here",
    "status": "active",
    "expiryDate": "2025-12-25T10:30:00.000Z",
    "productId": "com.nolimitsera.monthly.subscription.premium.staging",
    "autoRenewing": true
  }
}
```

### Step 3: Check Database

```sql
-- View subscriptions
SELECT * FROM subscriptions;

-- View subscription history
SELECT * FROM subscription_history ORDER BY created_at DESC;
```

---

## Part 4: Connecting Mobile App to Backend

Your mobile app already has the code! Just make sure your API base URL is correct:

**File: `/src/libs/utils/api.utils.ts`**

Make sure `apiURL` points to your backend:
```typescript
const apiURL = 'http://your-backend-server.com/api'; // or localhost:3000/api for testing
```

The app will automatically call `/api/subscriptions/verify` after a successful purchase!

---

## Part 5: Deployment Checklist

### Environment Variables for Production

```bash
# Production .env
DATABASE_URL=postgresql://user:pass@production-db:5432/nolimitsera
APPLE_SHARED_SECRET=your_production_shared_secret
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/etc/secrets/google-service-account.json
GOOGLE_PACKAGE_NAME=com.nolimitsera
PORT=3000
JWT_SECRET=your_strong_jwt_secret
NODE_ENV=production
```

### Deploy to Server

1. **Choose hosting** (AWS, Digital Ocean, Heroku, etc.)
2. **Set environment variables**
3. **Run migrations** (create tables)
4. **Start server**: `node server.js` or `pm2 start server.js`
5. **Set up SSL** (HTTPS required for production)
6. **Configure firewall** (allow port 3000 or 443)

---

## Quick Reference: File Structure

```
backend/
├── config/
│   └── database.js              # PostgreSQL connection
├── middleware/
│   └── auth.middleware.js       # JWT authentication
├── services/
│   ├── apple-iap.service.js     # Apple verification
│   ├── google-iap.service.js    # Google verification
│   └── subscription.service.js  # Database operations
├── routes/
│   └── subscription.routes.js   # API endpoints
├── server.js                    # Main server file
├── .env                         # Environment variables
└── package.json                 # Dependencies
```

---

## Summary

✅ **Database**: PostgreSQL with subscriptions & history tables  
✅ **iOS Verification**: Verifies receipts with Apple App Store  
✅ **Android Verification**: Verifies with Google Play Developer API  
✅ **API Endpoint**: `/api/subscriptions/verify` saves & returns data  
✅ **Authentication**: JWT-based user authentication  
✅ **Logging**: Complete audit trail of all subscription events  
✅ **Cron Jobs**: Automatic expiry checking  

Your backend is now ready to verify and manage in-app purchases! 🎉
