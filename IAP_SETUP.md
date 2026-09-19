# In-App Purchase (IAP) Setup Guide

## Overview
The Business Subscription Screen has been added to the business creation flow. Users will see a subscription page before submitting their business for creation.

## Current Flow
1. BusinessCreationScreen1 (Business Info)
2. BusinessCreationScreen2 (Logo & Cover)
3. BusinessCreationScreen3 (Business Images)
4. **BusinessSubscriptionScreen (NEW - Monthly Subscription)**
5. BusinessCreationScreen4 (Review & Submit)

## Installation Steps

### 1. Install react-native-iap
```bash
npm install react-native-iap
# or
yarn add react-native-iap
```

### 2. iOS Setup
```bash
cd ios && pod install && cd ..
```

Add to `ios/fribee/Info.plist`:
```xml
<key>SKAdNetworkItems</key>
<array>
  <dict>
    <key>SKAdNetworkIdentifier</key>
    <string>cstr6suwn9.skadnetwork</string>
  </dict>
</array>
```

### 3. Android Setup
No additional setup required for Android.

## App Store / Google Play Configuration

### iOS (App Store Connect)
1. Go to App Store Connect > My Apps > [Your App]
2. Navigate to "Features" > "In-App Purchases"
3. Click "+" to create new subscription
4. Select "Auto-Renewable Subscription"
5. Configure:
   - **Product ID**: `com.sera.fribee.monthly.subscription`
   - **Reference Name**: Monthly Business Subscription
   - **Subscription Group**: Business Plans
   - **Price**: $29.99/month
   - **Localization**: Add descriptions

### Android (Google Play Console)
1. Go to Google Play Console > [Your App] > Monetize
2. Click "Subscriptions" > "Create subscription"
3. Configure:
   - **Product ID**: `com.sera.fribee.monthly.subscription`
   - **Name**: Monthly Business Subscription
   - **Description**: Access all business features
   - **Price**: $29.99/month
   - **Billing period**: 1 month
   - **Free trial**: Optional

## Code Integration

### Enable IAP in BusinessSubscriptionScreen.tsx

Uncomment the IAP code sections:

```typescript
// 1. Import (line 16)
import * as RNIap from 'react-native-iap';

// 2. Initialize IAP (line 71-78)
const result = await RNIap.initConnection();
console.log('IAP connection result:', result);

const products = await RNIap.getSubscriptions({ skus: SUBSCRIPTION_SKUS });
setSubscriptions(products);

// 3. Purchase handling (line 111-133)
const purchase = await RNIap.requestSubscription({
  sku: SUBSCRIPTION_SKUS[0],
});

console.log('Purchase successful:', purchase);

// Verify purchase with backend
const response = await ApiService.verifySubscription({
  platform: Platform.OS,
  purchaseToken: purchase.purchaseToken,
  productId: purchase.productId,
  transactionReceipt: purchase.transactionReceipt,
});
```

### Backend API Endpoint

Create a new endpoint to verify and store subscriptions:

```typescript
POST /api/subscriptions/verify
Body: {
  platform: 'ios' | 'android',
  purchaseToken: string,
  productId: string,
  transactionReceipt?: string
}
```

Add to `src/services/api.service.ts`:

```typescript
async verifySubscription(data: {
  platform: string;
  purchaseToken: string;
  productId: string;
  transactionReceipt?: string;
}): Promise<ApiResponse> {
  return this.makeRequest('/subscriptions/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
```

## Testing

### iOS Testing (Sandbox)
1. Create sandbox test account in App Store Connect
2. Sign out of App Store on device
3. When prompted during purchase, sign in with test account
4. Test purchases are free and auto-renewing

### Android Testing
1. Add test accounts in Google Play Console
2. Create internal test track
3. Install app from test track
4. Make test purchases (no charge)

## Features Implemented

✅ Subscription screen added to business creation flow  
✅ Monthly plan card with features list  
✅ "Skip for now" option  
✅ Loading states and error handling  
✅ Dark mode support  
✅ Purchase simulation (remove when IAP is integrated)  
✅ Navigation flow updated  

## TODO

⬜ Install react-native-iap package  
⬜ Configure App Store Connect / Google Play Console products  
⬜ Uncomment IAP code in BusinessSubscriptionScreen.tsx  
⬜ Create backend verification endpoint  
⬜ Add subscription status to user profile  
⬜ Handle subscription expiry and renewals  
⬜ Add restore purchases functionality  
⬜ Test with sandbox accounts  

## Current Behavior

Currently, the subscription screen **simulates** a purchase:
- Shows the subscription plan
- Displays a 2-second loading animation when "Subscribe" is tapped
- Shows success alert and proceeds to final screen
- Can be skipped with "I'll set this up later"

Once IAP is integrated, replace the simulation code with actual IAP calls.

## Notes

- Subscriptions are managed by Apple/Google, not directly by the app
- Users can cancel from device settings
- Backend should verify receipts to prevent fraud
- Consider offering free trial period
- Add subscription management in Settings screen
