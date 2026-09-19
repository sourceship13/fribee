# Deep Linking Quick Reference

## URLs

### Custom Scheme (Always Works)
```
fribee://deal/{dealId}
```

https://fribee.io/deal/{dealId}
```
https://deals.sera.dev/deal/{dealId}
```

## Testing Commands

### iOS Simulator
```bash
# Custom scheme
xcrun simctl openurl booted "fribee://deal/123"

# Universal Links (device only - simulator doesn't support)
# Open in Safari or Messages app
```

### Android Emulator/Device
```bash
# Custom scheme
adb shell am start -W -a android.intent.action.VIEW -d "fribee://deal/123" com.sera.fribee
adb shell am start -W -a android.intent.action.VIEW -d "https://fribee.io/deal/123" com.sera.fribee
# App Links
adb shell am start -W -a android.intent.action.VIEW -d "https://deals.sera.dev/deal/123" com.sera.fribee

# Verify App Links status
adb shell pm get-app-links com.sera.fribee

# Re-verify domain
adb shell pm verify-app-links --re-verify com.sera.fribee
```

## SMS Message Format

The SMS automatically includes the deep link:

```
🎉 Check out this amazing deal at {Business Name}!

View this deal: https://fribee.io/deal/123

View this deal: https://deals.sera.dev/deal/123
```

## File Locations
### iOS Configuration
Associated Domains: `applinks:fribee.io`
  - URL Scheme: `fribee`
  - Associated Domains: `applinks:deals.sera.dev`
### Android Configuration
- **Manifest**: `android/app/src/main/AndroidManifest.xml`
  - Custom scheme intent filter
  - App Links intent filter with `autoVerify="true"`
### App Code
  - Linking configuration with route mapping
- **SMS Service**: `src/services/deal-sharing.service.ts`
  - `createShareMessage()` method generates SMS with deep link
- **AASA (iOS)**: `web-redirect/.well-known/apple-app-site-association`
- **Asset Links (Android)**: `web-redirect/.well-known/assetlinks.json`

## Route Mapping

```typescript
DealDetail: 'deal/:dealId'
```

When a user taps `fribee://deal/123`, the app:
1. Opens to MainTabs (if authenticated) or SignIn (if not)
2. Navigates to DealDetail screen
3. Passes `dealId: '123'` as route param

## Development Workflow

### 1. Local Testing (No Server Required)
Use custom URL scheme:
```bash
fribee://deal/123
```

### 2. Production Testing (Requires Server)
1. Deploy web files to deals.sera.dev
2. Update AASA with Apple Team ID
3. Update assetlinks.json with Android SHA256
   https://fribee.io/deal/123
   ```
   https://deals.sera.dev/deal/123
   ```

## Common Issues

### Link Opens in Browser Instead of App
- Wrong Team ID in AASA file
- Domain not verified (can take up to 24 hours)
- Wrong package name or SHA256 fingerprint
- Domain not verified (check with `pm get-app-links`)

**Solution:**
Use custom URL scheme for immediate testing:
```
fribee://deal/123
```

### Deal Not Loading

1. Check deal ID is being passed correctly
2. Verify DealDetail screen reads `route.params.dealId`
3. Test with known valid deal ID
4. Check console logs for navigation errors

## Verification URLs

### Check Files Are Accessible
curl https://fribee.io/.well-known/apple-app-site-association
# AASA (iOS)
curl https://deals.sera.dev/.well-known/apple-app-site-association
curl https://fribee.io/.well-known/assetlinks.json
# Asset Links (Android)
curl https://deals.sera.dev/.well-known/assetlinks.json
```

### Validate AASA
https://branch.io/resources/aasa-validator/

## Next Steps for Production

1. **Get Apple Team ID** from developer.apple.com
2. **Get Android SHA256 fingerprint** from release keystore
3. **Update web files** with correct IDs
4. **Deploy to deals.sera.dev**
5. **Test on physical devices** (Universal Links don't work in simulators)
6. **Update App Store/Play Store URLs** in index.html

- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [React Navigation Docs](https://reactnavigation.org/docs/deep-linking/)
