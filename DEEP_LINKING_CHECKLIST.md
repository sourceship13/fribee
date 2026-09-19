# Deep Linking Implementation Checklist

Use this checklist to track the implementation status of deep linking.

## ✅ Phase 1: App Configuration (Complete)

- [x] iOS Info.plist updated with URL scheme (`fribee`)
 - [x] iOS Info.plist updated with Associated Domains (`applinks:fribee.io`)
- [x] Android Manifest updated with custom scheme intent filter
- [x] Android Manifest updated with App Links intent filter
- [x] React Navigation linking configuration added to AppNavigator
- [x] Route mapping configured for `deal/:dealId`
- [x] SMS message updated to include deep link
- [x] createShareMessage() updated in deal-sharing.service.ts

## ⏳ Phase 2: Web Server Setup (Pending)

### Required Actions:

- [ ] **Get Apple Team ID**
  - Visit: https://developer.apple.com/account
  - Note your Team ID (10-character string)
  - Location: Membership details section

- [ ] **Get Android Release Keystore SHA256**
  ```bash
  keytool -list -v -keystore /path/to/release.keystore -alias your-alias
  ```
  - Copy the SHA256 fingerprint (format: `XX:XX:XX:...`)
  - ⚠️ Must use RELEASE keystore, not debug!

- [ ] **Update Configuration Files**
  - [ ] `web-redirect/.well-known/apple-app-site-association`
    - Replace `TEAMID` with your Apple Team ID
  - [ ] `web-redirect/.well-known/assetlinks.json`
    - Replace `SHA256_FINGERPRINT_HERE` with your release SHA256
  - [ ] `web-redirect/index.html`
    - Update App Store URL (line 123)
    - Update Google Play URL (line 121)

 - [ ] **Deploy to Web Server**
   - [ ] Upload `index.html` to `https://fribee.io/`
   - [ ] Upload `.well-known/apple-app-site-association` to `https://fribee.io/.well-known/`
   - [ ] Upload `.well-known/assetlinks.json` to `https://fribee.io/.well-known/`
  - [ ] Configure server to serve `.well-known` files with `Content-Type: application/json`

- [ ] **Verify Web Files**
  ```bash
  # Check files are accessible
  curl https://fribee.io/index.html
  curl -I https://fribee.io/.well-known/apple-app-site-association
  curl -I https://fribee.io/.well-known/assetlinks.json
  
  # Verify content type
  # Should show: Content-Type: application/json
  ```

## ⏳ Phase 3: Testing (Pending)

### Local Testing (No Server Required)

- [ ] **Test Custom URL Scheme - iOS**
  ```bash
  xcrun simctl openurl booted "fribee://deal/123"
  ```
  - [ ] App opens
  - [ ] Navigates to DealDetail screen
  - [ ] Deal ID is passed correctly

- [ ] **Test Custom URL Scheme - Android**
  ```bash
  adb shell am start -W -a android.intent.action.VIEW \
    -d "fribee://deal/123" com.sera.fribee
  ```
  - [ ] App opens
  - [ ] Navigates to DealDetail screen
  - [ ] Deal ID is passed correctly

### Production Testing (Requires Server Setup)

 - [ ] **Validate AASA File (iOS)**
   - Visit: https://branch.io/resources/aasa-validator/
   - Enter: `fribee.io`
  - [ ] No errors shown
  - [ ] Paths configured correctly

 - [ ] **Test Universal Links - iOS** (Physical device required)
   - [ ] Open Safari on device
   - [ ] Navigate to `https://fribee.io/deal/123`
  - [ ] App opens automatically (or shows "Open in..." banner)
  - [ ] Navigates to correct deal

 - [ ] **Verify App Links - Android**
   ```bash
   adb shell pm get-app-links com.sera.fribee
   # Should show fribee.io as verified
   ```
  - [ ] Domain shows as verified
  - [ ] If not, run: `adb shell pm verify-app-links --re-verify com.sera.fribee`

 - [ ] **Test App Links - Android**
   ```bash
   adb shell am start -W -a android.intent.action.VIEW \
     -d "https://fribee.io/deal/123" com.sera.fribee
   ```
  - [ ] App opens automatically
  - [ ] Navigates to correct deal

### End-to-End SMS Testing

- [ ] **Test SMS Sharing Flow**
  1. [ ] Open app on Device A
  2. [ ] Navigate to a deal
  3. [ ] Tap "Share Deal"
  4. [ ] Select your own contact
  5. [ ] Send SMS
  6. [ ] Open SMS on Device A
  7. [ ] Tap the link in SMS
  8. [ ] App opens to correct deal

- [ ] **Test Cross-Device Sharing**
  1. [ ] Open app on Device A
  2. [ ] Share deal to Device B's phone number
  3. [ ] Receive SMS on Device B
  4. [ ] Tap link on Device B
  5. [ ] If app installed: Opens to deal
  6. [ ] If app not installed: Shows download page

## ⏳ Phase 4: Production Release (Pending)

### Pre-Release Checklist

 - [ ] **iOS Configuration**
   - [ ] Apple Team ID verified in Xcode
   - [ ] Associated Domains capability enabled
   - [ ] Correct domain configured: `applinks:fribee.io`
   - [ ] Universal Links tested on physical device
   - [ ] AASA file validated

- [ ] **Android Configuration**
  - [ ] Release keystore SHA256 in assetlinks.json
  - [ ] AutoVerify="true" in Manifest
  - [ ] App Links tested on physical device
  - [ ] Domain verification confirmed

- [ ] **Web Server**
  - [ ] All files deployed to production
  - [ ] HTTPS enabled
  - [ ] Correct content types configured
  - [ ] Files accessible publicly
  - [ ] App Store/Play Store URLs updated

- [ ] **App Stores**
  - [ ] App Store listing URL updated in index.html
  - [ ] Google Play listing URL updated in index.html
  - [ ] Deep links tested with production builds
  - [ ] Release notes mention sharing feature

### Post-Release Monitoring

- [ ] Monitor for "Link not working" user reports
- [ ] Check server logs for 404s on well-known paths
- [ ] Verify domain verification status remains valid
- [ ] Test deep links after each app update

## 🆘 Troubleshooting

### Common Issues

| Issue | Platform | Solution |
|-------|----------|----------|
| Link opens browser instead of app | iOS | Wait 24h for AASA cache, verify Team ID |
| Link opens browser instead of app | Android | Check SHA256 fingerprint, re-verify domain |
| App opens but wrong screen | Both | Check route mapping in AppNavigator |
| Deal doesn't load | Both | Verify deal ID extraction and API call |
| 404 on well-known files | Both | Check server paths and permissions |

### Getting Help

1. Check [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) troubleshooting section
2. Review [DEEP_LINKING_REFERENCE.md](DEEP_LINKING_REFERENCE.md) for quick commands
3. Test with custom URL scheme first (always works)
4. Check device/simulator logs for errors

## 📚 Documentation

- [Setup Guide](DEEP_LINKING_SETUP.md) - Initial setup instructions
- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Detailed deployment process
- [Quick Reference](DEEP_LINKING_REFERENCE.md) - Commands and URLs
- [Web Files README](web-redirect/README.md) - Web deployment instructions

## 🎯 Next Steps

Current priority: **Phase 2 - Web Server Setup**

1. Get Apple Team ID
2. Get Android release keystore SHA256
3. Update configuration files
4. Deploy to fribee.io
5. Test with physical devices

Once Phase 2 is complete, proceed to Phase 3 testing.
