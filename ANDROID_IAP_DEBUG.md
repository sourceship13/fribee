# Android Subscription Verification Debugging Guide

## Overview
This guide helps debug Android in-app subscription verification issues between the app and backend.

## What to Check in Logs

When a subscription purchase is made, the app logs detailed information. Look for these sections:

### 1. Purchase Object (from Google Play)
```
🔵 Full purchase object: { ... }
```
**Check:**
- `purchaseToken` exists and is a long string
- `productId` matches your expected SKU (e.g., `nolimitsera.subscription.premium.staging`)
- `transactionId` is present

### 2. Verification Data Sent to Backend
```
========== BACKEND VERIFICATION DEBUG ==========
📤 Sending to backend: { ... }
```
**Check:**
- `platform`: Should be `"android"`
- `productId`: Should match the purchased SKU
- `purchaseToken`: Should be present (long string from Google Play)
- `GOOGLE_PACKAGE_NAME`: Should be `"com.nolimitseradeals.staging"`
- `transactionReceipt`: Should contain full purchase object as JSON string

### 3. Backend Response
```
========== BACKEND RESPONSE DEBUG ==========
📥 Verification response received: { ... }
```
**Check:**
- `success`: Should be `true` for successful verification
- `message`: Contains error details if verification failed
- `error`: Contains error message if request failed

### 4. API Service Logs
```
========== API SERVICE: VERIFY SUBSCRIPTION ==========
📡 Full URL: https://your-api.com/subscriptions/verify
```
**Check:**
- Full URL is correct
- Request body matches verification data
- Any network errors or timeouts

## Common Issues & Solutions

### Issue 1: `purchaseToken` is undefined or missing
**Symptom:** Backend logs show no purchase token
**Solution:** 
- Check that `purchase.purchaseToken` exists in the purchase object
- Verify app is using correct field (not `transactionId` for Android)

### Issue 2: Backend returns "Invalid package name"
**Symptom:** `GOOGLE_PACKAGE_NAME` mismatch
**Solution:**
- Backend expects: `com.nolimitseradeals.staging`
- Check backend configuration for correct package name
- Verify app is sending `GOOGLE_PACKAGE_NAME` in request

### Issue 3: Backend returns "Invalid purchase token"
**Symptom:** Google Play API rejects the token
**Solution:**
- Ensure token hasn't expired (test with fresh purchase)
- Verify backend has correct Google Play service account credentials
- Check backend is using correct Google Play API endpoint

### Issue 4: Backend can't parse transaction receipt
**Symptom:** Backend error parsing `transactionReceipt`
**Solution:**
- Transaction receipt should be JSON stringified purchase object
- Contains all purchase metadata from Google Play
- Backend should parse this to extract additional verification data

## Data Flow

```
1. User completes purchase in Google Play
   ↓
2. App receives purchase object from react-native-iap
   ↓
3. App extracts:
   - purchaseToken (for Google Play API)
   - productId (SKU)
   - Full purchase object (as transactionReceipt)
   ↓
4. App sends to backend: /subscriptions/verify
   {
     "platform": "android",
     "purchaseToken": "...",
     "productId": "nolimitsera.subscription.premium.staging",
     "GOOGLE_PACKAGE_NAME": "com.nolimitseradeals.staging",
     "transactionReceipt": "{...}"
   }
   ↓
5. Backend verifies with Google Play Billing API
   ↓
6. Backend returns success/failure to app
```

## Required Backend Configuration

### Google Play Service Account
- Backend needs service account credentials JSON
- Service account must have access to Google Play Console
- Required API: Google Play Developer API

### Expected Request Format
```json
{
  "platform": "android",
  "purchaseToken": "long_token_from_google_play",
  "productId": "nolimitsera.subscription.premium.staging",
  "GOOGLE_PACKAGE_NAME": "com.nolimitseradeals.staging",
  "transactionReceipt": "{\"productId\":\"...\",\"purchaseToken\":\"...\",...}"
}
```

### Backend Verification Steps
1. Parse request body
2. Extract `purchaseToken` and `GOOGLE_PACKAGE_NAME`
3. Call Google Play Developer API:
   - Endpoint: `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{packageName}/purchases/subscriptions/{subscriptionId}/tokens/{purchaseToken}`
4. Verify response from Google
5. Check subscription is active and valid
6. Return success/error to app

## Testing Checklist

- [ ] App successfully makes purchase in Google Play
- [ ] Purchase object contains all required fields
- [ ] Verification request sent to correct backend endpoint
- [ ] Backend receives request with correct data format
- [ ] Backend can authenticate with Google Play API
- [ ] Backend successfully verifies token with Google
- [ ] Backend returns success response to app
- [ ] App navigates to BusinessProfile after success

## Contact Backend Team With:

When reporting issues, provide:
1. Full console logs (look for `========== BACKEND VERIFICATION DEBUG ==========`)
2. Purchase object JSON
3. Verification request body JSON
4. Backend response JSON
5. Backend error logs
6. Google Play Console package name and product ID

## Log Filtering

In Metro bundler console, search for:
- `BACKEND VERIFICATION DEBUG` - See what's sent to backend
- `BACKEND RESPONSE DEBUG` - See backend response
- `API SERVICE: VERIFY SUBSCRIPTION` - See network layer details
- `VERIFICATION FAILED` - See failure details
- `VERIFICATION EXCEPTION` - See error details
