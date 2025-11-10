# App Store Connect Sandbox Testing Setup

This guide explains how to test In-App Purchases using App Store Connect sandbox mode.

## Current Configuration

The app is configured with:
- **FORCE_DEV_MODE**: `false` (real IAP enabled)
- **USE_SANDBOX**: `true` (sandbox mode active)
- **iOS Product ID**: `com.nolimitsera.monthly.subscription.premium`
- **Android Product ID**: `com.nolimitsera.monthly.subscription`

## Testing Modes

### 1. Force Development Mode (No IAP)
Set `FORCE_DEV_MODE = true` in `BusinessSubscriptionScreen.tsx`:
- Completely bypasses IAP
- Simulates successful purchase after 1.5s
- No App Store Connect setup required
- Perfect for UI/flow testing

### 2. Sandbox Mode (Real IAP Testing)
Set `FORCE_DEV_MODE = false` and `USE_SANDBOX = true`:
- Tests real IAP flow
- Uses App Store Connect sandbox environment
- Requires product setup + sandbox account
- Recommended before production release

## App Store Connect Setup

### Step 1: Create Subscription Product

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app (NoLimit Sera Deals)
3. Navigate to **Features** → **In-App Purchases**
4. Click **+ (Create)** → **Auto-Renewable Subscription**

**Product Details:**
- Reference Name: `Monthly Premium Subscription`
- Product ID: `com.nolimitsera.monthly.subscription.premium`
- Subscription Group: Create new group called "Premium Subscriptions"

**Pricing:**
- Base Price: $1.99 USD/month
- Subscription Duration: 1 month
- Free Trial: Optional (e.g., 7 days)

**Localization (English):**
- Display Name: `Monthly Premium`
- Description: `Unlock unlimited deals creation, analytics dashboard, push notifications, and premium support.`

**Review Information:**
- Screenshot: Upload subscription screen screenshot
- Review Notes: "Monthly subscription for business owners to create and manage deals"

5. Click **Save**
6. Submit for review (or keep in "Ready to Submit" for sandbox testing)

### Step 2: Create Sandbox Test Account

1. In App Store Connect, go to **Users and Access**
2. Click **Sandbox** → **Testers**
3. Click **+ (Add Tester)**

**Test Account Details:**
- First Name: Test
- Last Name: User
- Email: Use a unique email (e.g., test.nolimitsera+sandbox1@gmail.com)
  - Note: Gmail allows + addresses (all go to same inbox)
- Password: Create secure password
- Country/Region: United States (or your test region)
- App Store Territory: United States

4. Click **Save**
5. **IMPORTANT**: Use this email ONLY for sandbox testing, never for production

### Step 3: Sign In on iOS Device

**Option A: Physical Device (Recommended)**
1. Go to **Settings** → **App Store**
2. Scroll down to **SANDBOX ACCOUNT**
3. Sign in with your sandbox test account
4. Keep your regular Apple ID signed in for App Store

**Option B: iOS Simulator**
1. Simulators automatically use sandbox environment
2. Sign in when prompted during purchase flow
3. First purchase will ask for sandbox credentials

**Important Notes:**
- DO NOT sign in to sandbox account in Settings if testing in simulator
- Sandbox purchases are FREE - you won't be charged
- Sandbox receipts are different from production
- Purchases auto-renew every few minutes for testing

## Testing Workflow

### Initial Setup
1. Ensure product created in App Store Connect
2. Create sandbox test account
3. Set `FORCE_DEV_MODE = false` in code
4. Build app: `npm run ios`

### Test Purchase Flow

1. **Navigate to Subscription Screen**
   - Complete Business Creation Steps 1-3
   - Reach subscription screen

2. **Verify Sandbox Mode Banner**
   - Should see blue banner: "Sandbox Mode: Testing with App Store Connect"
   - If yellow banner shows, `FORCE_DEV_MODE` is still true

3. **Tap "Subscribe Now"**
   - iOS will show Apple ID sign-in sheet
   - Sign in with sandbox test account
   - Confirm purchase (free in sandbox)

4. **Monitor Console Logs**
   ```
   🔵 Initiating sandbox purchase for: com.nolimitsera.monthly.subscription.premium
   🔵 Sandbox mode enabled: true
   ✅ Purchase request sent - waiting for App Store response
   📱 Make sure you're signed in with a sandbox test account
   ```

5. **Purchase Success**
   - Alert: "Sandbox Purchase Successful!"
   - Transaction verified with backend
   - Navigate to final business creation screen

6. **Purchase Failure Handling**
   - "Product Not Found": Product not created in App Store Connect
   - "E_USER_CANCELLED": User cancelled purchase
   - Other errors: Check console for details

### Verify Backend Integration

The app calls `POST /api/subscriptions/verify` with:
```json
{
  "platform": "ios",
  "purchaseToken": "1000000123456789",
  "productId": "com.nolimitsera.monthly.subscription.premium",
  "transactionReceipt": "base64EncodedReceipt..."
}
```

Ensure your backend:
1. Validates receipt with Apple servers
2. Stores subscription in database
3. Returns success response
4. Updates user's subscription status

## Troubleshooting

### "Product Not Found" Error
**Cause**: Product not created or not approved in App Store Connect
**Solution**: 
- Create product with exact ID: `com.nolimitsera.monthly.subscription.premium`
- Wait 15 minutes after creation
- Product must be "Ready to Submit" or approved

### "Invalid Credentials" During Sign In
**Cause**: Using production Apple ID instead of sandbox account
**Solution**: Use sandbox test account email created in Step 2

### Purchase Doesn't Complete
**Cause**: Network issues or backend verification failure
**Solution**: 
- Check internet connection
- Verify backend endpoint is running
- Check console logs for error details

### "Already Purchased" Error
**Cause**: Previous sandbox purchase not cleared
**Solution**: 
- Settings → App Store → Sandbox Account → Manage
- Clear purchase history

### Subscription Auto-Renews Too Fast
**Cause**: Sandbox environment accelerates renewals
**Solution**: 
- This is normal - sandbox subscriptions renew every 5 minutes
- 1 month subscription = 5 minutes in sandbox
- 1 year subscription = 1 hour in sandbox

## Console Logging

The app includes extensive logging for debugging:

**Success Path:**
```
🔵 Initiating sandbox purchase for: com.nolimitsera.monthly.subscription.premium
✅ Purchase request sent - waiting for App Store response
✅ Purchase updated (sandbox): {...}
📱 Transaction ID: 1000000123456789
🔵 Verifying purchase with backend...
✅ Purchase verified successfully
```

**Error Path:**
```
❌ Purchase request failed: {...}
❌ Purchase error: E_USER_CANCELLED
```

## Switching Between Modes

### Local Development (No IAP)
```typescript
const FORCE_DEV_MODE = true;
const USE_SANDBOX = true;
```
- Simulated purchases
- No App Store interaction
- Fast testing

### Sandbox Testing (Real IAP)
```typescript
const FORCE_DEV_MODE = false;
const USE_SANDBOX = true;
```
- Real IAP flow with sandbox
- App Store Connect required
- Production-like testing

### Production (Live IAP)
```typescript
const FORCE_DEV_MODE = false;
const USE_SANDBOX = false;
```
- Real IAP with production accounts
- Real charges to customers
- Only for production builds

## Best Practices

1. **Always Test in Sandbox First**
   - Never skip sandbox testing
   - Test all error scenarios
   - Verify backend integration

2. **Use Multiple Test Accounts**
   - Create 3-5 sandbox accounts
   - Test different scenarios
   - Verify subscription states

3. **Test Error Handling**
   - Cancel purchases
   - Network failures
   - Backend errors
   - Product not found

4. **Verify Receipt Validation**
   - Check backend receives receipts
   - Validate with Apple servers
   - Handle invalid receipts

5. **Test Subscription Management**
   - Purchase subscription
   - Check renewal
   - Cancel subscription
   - Restore purchases

## Production Checklist

Before releasing to production:

- [ ] Subscription product created in App Store Connect
- [ ] Product approved and published
- [ ] Tested with multiple sandbox accounts
- [ ] All error scenarios handled
- [ ] Backend receipt validation working
- [ ] Transaction finishing implemented
- [ ] Restore purchases functionality added
- [ ] Subscription management UI added
- [ ] Set `FORCE_DEV_MODE = false` and `USE_SANDBOX = false`
- [ ] Test with TestFlight before release
- [ ] Monitor purchase analytics

## Resources

- [App Store Connect](https://appstoreconnect.apple.com)
- [In-App Purchase Testing Guide](https://developer.apple.com/documentation/storekit/in-app_purchase/testing_in-app_purchases_with_sandbox)
- [Sandbox Testing Docs](https://developer.apple.com/documentation/storekit/in-app_purchase/testing_in-app_purchases)
- [Receipt Validation](https://developer.apple.com/documentation/appstorereceipts/verifying_receipts_with_the_app_store)

## Support

For issues with sandbox testing:
1. Check console logs for detailed error messages
2. Verify App Store Connect product configuration
3. Ensure sandbox account is properly set up
4. Review backend logs for verification errors
5. Test with `FORCE_DEV_MODE = true` to isolate IAP issues
