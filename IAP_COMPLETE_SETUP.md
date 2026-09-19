# Complete In-App Purchase Setup Guide for iOS & Android

## What You Already Have ✅

✅ **react-native-iap** installed (v14.4.39)  
✅ **BusinessSubscriptionScreen** implemented with IAP code  
✅ **Backend verification** integrated  
✅ Product IDs defined:
  - iOS: `com.sera.fribee.monthly.subscription.premium.staging`
  - iOS: `com.sera.fribee.monthly.subscription.regular.staging`
  - Android: `com.sera.fribee.monthly.subscription.premium.staging`

---

## What You Still Need to Do

### 🍎 iOS Setup (App Store Connect)

#### Step 1: Add StoreKit Configuration to Info.plist

Add this to `/ios/fribee/Info.plist` before the closing `</dict>` tag:

```xml
<key>SKAdNetworkItems</key>
<array>
  <dict>
    <key>SKAdNetworkIdentifier</key>
    <string>cstr6suwn9.skadnetwork</string>
  </dict>
</array>
```

#### Step 2: Create Subscription Products in App Store Connect

1. **Go to App Store Connect**: https://appstoreconnect.apple.com
2. **Select Your App**: "Fribee" or your app name
3. **Navigate to**: Features → In-App Purchases (or Subscriptions)
4. **Create Subscription Group** (if not exists):
   - Click "+" next to Subscription Groups
   - Name: "Business Plans" or "Premium Subscriptions"
   - Click "Create"

5. **Create First Subscription** (Premium):
   - Click "+" in your subscription group
   - **Reference Name**: "Premium Business Monthly"
   - **Product ID**: `com.sera.fribee.monthly.subscription.premium.staging`
   - **Subscription Duration**: 1 month
   - Click "Create"
   
6. **Set Price**:
   - Click on your new subscription
   - Go to "Subscription Prices" section
   - Click "Add Subscription Price"
   - Select your starting territory (e.g., United States)
   - Set price (e.g., $0.99 for testing)
   - Set start date
   - Click "Next" and "Confirm"

7. **Add Localization**:
   - Go to "Subscription Localization" section
   - Click "+"
   - Select "English (U.S.)"
   - **Subscription Display Name**: "Premium Business"
   - **Description**: "Unlimited deals, advanced analytics, priority support"
   - Save

8. **Repeat for Regular Subscription**:
   - Product ID: `com.sera.fribee.monthly.subscription.regular.staging`
   - Price: $0.99 (testing) or your chosen price
   - Display Name: "Regular Business"
   - Description: "Up to 4 deals per month, basic analytics"

#### Step 3: Create Sandbox Test Account

1. **Go to App Store Connect** → Users and Access
2. Click **"Sandbox Testers"** (left sidebar)
3. Click **"+" button** to add tester
4. Fill in details:
   - **First Name**: Test
   - **Last Name**: User
   - **Email**: Use a NEW email (e.g., test+sandbox1@yourdomain.com)
   - **Password**: Create a strong password
   - **Country/Region**: United States (or your region)
5. **Click "Invite"**
6. **Save the credentials** - you'll need them for testing

#### Step 4: Submit Products for Review (If Required)

- If testing in sandbox, products don't need approval
- For production, submit each product for review
- Status must be "Ready to Submit" before app release

---

### 🤖 Android Setup (Google Play Console)

#### Step 1: No Additional Code Changes Needed
Android billing is automatically configured when you install `react-native-iap`.

#### Step 2: Create Subscription in Google Play Console

1. **Go to Google Play Console**: https://play.google.com/console
2. **Select Your App**
3. **Navigate to**: Monetize → Subscriptions
4. **Click "Create subscription"**

5. **Configure Premium Subscription**:
   - **Product ID**: `com.sera.fribee.monthly.subscription.premium.staging`
   - **Name**: Premium Business Monthly
   - **Description**: Unlimited deals, advanced analytics, and priority support
   - **Billing period**: 1 month (recurring every month)
   - **Base plans**:
     - Click "Add base plan"
     - **Billing period**: Monthly (1 month)
     - **Price**: Set price (e.g., $0.99 for testing)
     - **Auto-renewing**: Yes
   - **Save** and **Activate**

6. **Optional: Add Free Trial**:
   - Under "Offers" section
   - Click "Add offer"
   - Select "Free trial"
   - Duration: 7 days (or your choice)
   - Save

#### Step 3: Add License Testers

1. In Google Play Console, go to **Setup → License testing**
2. Under **"License testers"**, click "Add testers"
3. Add email addresses (Gmail accounts) that will test purchases
4. Click "Save"
5. These accounts can make test purchases without being charged

#### Step 4: Create Internal Test Track (Recommended)

1. Go to **Testing → Internal testing**
2. Click "Create new release"
3. Upload your signed APK/AAB
4. Add testers:
   - Create an email list with tester Gmail addresses
   - They'll receive an opt-in link via email
5. **Publish to internal testing**

**Note**: Subscriptions must be published to at least an internal test track before they can be purchased (even in testing).

---

## Testing In-App Purchases

### iOS Testing (Sandbox Mode)

1. **On your iOS device**:
   - Open Settings → App Store
   - **Sign out** of your regular Apple ID
   - DO NOT sign in with sandbox account yet

2. **Build and run your app** on the device:
   ```bash
   cd ios && pod install && cd ..
   npm run ios
   ```

3. **Navigate to subscription screen** in your app

4. **Tap "Subscribe Now"**
   - iOS will prompt: "Sign in with your Apple ID"
   - Enter your **sandbox test account** credentials
   - Complete the purchase (it's free)

5. **Verify purchase appears** in your app

**Sandbox Purchase Behavior**:
- Purchases are FREE
- Subscriptions auto-renew at accelerated rate (minutes instead of months)
- Can test multiple times
- Can cancel from iOS Settings → Apple ID → Subscriptions

### Android Testing (Internal Test Track)

1. **Install via Internal Test Track**:
   - Testers receive opt-in email
   - Click link and accept invitation
   - Install app from Play Store (will show "Internal test" badge)

2. **Make Purchase**:
   - Navigate to subscription screen
   - Tap "Subscribe Now"
   - Use **license tester Gmail account**
   - Complete purchase (test cards are FREE)

3. **Verify purchase**

**Test Purchase Behavior**:
- Purchases are FREE for license testers
- Subscriptions auto-renew normally (real timeline)
- Can test once per product per account (unless cancelled first)
- Can cancel from Play Store → Subscriptions

---

## Verifying Your Setup

### Check iOS Subscription Connection

```typescript
// In BusinessSubscriptionScreen.tsx, this should work:
const products = await RNIap.getSubscriptions({ 
  skus: SUBSCRIPTION_SKUS 
});
console.log('Available products:', products);
```

**Expected Output**:
```javascript
[
  {
    productId: "com.sera.fribee.monthly.subscription.premium.staging",
    title: "Premium Business Monthly",
    description: "Unlimited deals...",
    price: "$0.99",
    localizedPrice: "$0.99",
    currency: "USD"
  },
  // ... more products
]
```

**If products array is empty**:
- ❌ Products not created in App Store Connect
- ❌ Product IDs don't match exactly
- ❌ Products not approved/active
- ❌ Wrong Bundle ID in Xcode

### Check Android Subscription Connection

Same code, but Android-specific checks:
- ❌ Product not published to test track
- ❌ Google Play billing not initialized
- ❌ Package name doesn't match
- ❌ App not signed with release key

---

## Common Issues & Solutions

### iOS Issues

**"Cannot connect to iTunes Store"**
- ✅ Make sure you're signed out of regular App Store
- ✅ Use sandbox account credentials when prompted
- ✅ Device must be on iOS 12+ for StoreKit

**"Product IDs not found"**
- ✅ Wait 2-4 hours after creating products (App Store sync delay)
- ✅ Check Bundle ID matches exactly in Xcode
- ✅ Verify product IDs are typed correctly (case-sensitive)
- ✅ Make sure products are in "Ready to Submit" status

**"This Apple ID has not yet been used with the App Store"**
- ✅ Normal for sandbox accounts
- ✅ Just click "Review" and accept terms
- ✅ Don't add payment method

### Android Issues

**"Item not available for purchase"**
- ✅ Publish app to at least internal test track
- ✅ Wait 2-3 hours after publishing
- ✅ Make sure tester account is added to license testers
- ✅ Install app from Play Store (not direct APK)

**"Product not found"**
- ✅ Product must be "Active" status
- ✅ Package name must match exactly
- ✅ Version code in Play Console must match or exceed installed version

---

## Production Checklist

Before going to production:

### iOS Production
- [ ] Change `USE_SANDBOX = false` in BusinessSubscriptionScreen.tsx
- [ ] Submit all subscription products for App Store review
- [ ] Add privacy policy URL to App Store Connect
- [ ] Add terms of service for subscriptions
- [ ] Test with real Apple ID (not sandbox)
- [ ] Configure subscription pricing for all regions
- [ ] Set up App Store Server Notifications (webhooks)

### Android Production
- [ ] Publish subscriptions to production track
- [ ] Test with non-tester Google account
- [ ] Configure pricing for all countries
- [ ] Set up Google Play Developer Notifications (webhooks)
- [ ] Add subscription cancellation policy
- [ ] Ensure compliance with Google Play policies

### Backend Production
- [ ] Implement `/api/subscriptions/verify` endpoint (see BACKEND_IAP_SETUP.md)
- [ ] Get Apple Shared Secret from App Store Connect
- [ ] Get Google Service Account JSON from Google Cloud Console
- [ ] Set up webhook listeners for subscription events
- [ ] Implement subscription status checking
- [ ] Add cron job to check expired subscriptions

---

## Quick Start Commands

```bash
# Install dependencies (if not done)
npm install

# iOS: Install pods
cd ios && pod install && cd ..

# Run on iOS device (required for IAP testing)
npm run ios

# Build Android release for testing
cd android && ./gradlew assembleRelease
```

---

## File Locations Reference

- **iOS Info.plist**: `/ios/fribee/Info.plist`
- **Android build.gradle**: `/android/app/build.gradle`
- **Subscription Screen**: `/src/screens/Business/BusinessCreation/BusinessSubscriptionScreen.tsx`
- **API Service**: `/src/services/api.service.ts`
- **Backend Setup Guide**: `/BACKEND_IAP_SETUP.md`

---

## Support Resources

- **Apple IAP Docs**: https://developer.apple.com/in-app-purchase/
- **Google Play Billing**: https://developer.android.com/google/play/billing
- **react-native-iap**: https://github.com/dooboolab-community/react-native-iap
- **Sandbox Testing**: https://developer.apple.com/documentation/storekit/in-app_purchase/testing_in-app_purchases_with_sandbox

---

## Next Steps

1. ✅ **Add StoreKit config to iOS Info.plist**
2. ✅ **Create subscriptions in App Store Connect**
3. ✅ **Create sandbox test account**
4. ✅ **Test iOS purchase on device**
5. ✅ **Create subscriptions in Google Play Console**
6. ✅ **Add license testers**
7. ✅ **Create internal test track**
8. ✅ **Test Android purchase**
9. ✅ **Implement backend verification** (see BACKEND_IAP_SETUP.md)
10. ✅ **Configure webhooks for renewals/cancellations**

Your app is already configured for IAP - you just need to complete the App Store Connect and Google Play Console setup!
