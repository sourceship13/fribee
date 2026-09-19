# Deep Linking Deployment Guide

This guide covers the complete deployment process for deep linking with Fribee Deals.

## Overview

Deep linking allows users to open specific deals in your app by clicking on links shared via SMS or other channels. The system supports:

- **Custom URL Scheme**: `fribee://deal/{dealId}` (always works, no verification needed)
- **Universal Links (iOS)**: `https://deals.sera.dev/deal/{dealId}` (seamless, no browser prompt)
- **App Links (Android)**: `https://deals.sera.dev/deal/{dealId}` (seamless, no browser prompt)

## Prerequisites

1. Access to deals.sera.dev domain
2. Apple Developer account with Team ID
3. Android app signing certificate
4. Web server to host redirect page and verification files

## Deployment Steps

### 1. Web Server Setup (deals.sera.dev)

#### Upload Files

Upload the following files from the `web-redirect/` directory to your web server:

```
deals.sera.dev/
├── index.html                                    # Main redirect page
├── .well-known/
    ├── apple-app-site-association               # iOS Universal Links
    └── assetlinks.json                          # Android App Links
```

#### Configure Apple App Site Association

1. Find your Apple Team ID:
   - Go to https://developer.apple.com/account
   - Look for "Team ID" in your membership details

2. Update `.well-known/apple-app-site-association`:
   ```json
   {
     "applinks": {
       "apps": [],
       "details": [
         {
           "appID": "YOUR_TEAM_ID.com.sera.fribee",
           "paths": ["/deal/*"]
         }
       ]
     }
   }
   ```

3. Upload to server at: `https://deals.sera.dev/.well-known/apple-app-site-association`
   - Must be served with `Content-Type: application/json`
   - Must be accessible over HTTPS
   - No file extension required

#### Configure Android Asset Links

1. Get your app's SHA256 fingerprint:
   ```bash
   # For debug builds
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

   # For release builds  
   keytool -list -v -keystore /path/to/release.keystore -alias your-alias
   ```

2. Copy the SHA256 fingerprint from the output (format: `XX:XX:XX:...`)

3. Update `.well-known/assetlinks.json`:
   ```json
   [
     {
       "relation": ["delegate_permission/common.handle_all_urls"],
       "target": {
         "namespace": "android_app",
         "package_name": "com.sera.fribee",
         "sha256_cert_fingerprints": [
           "XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX"
         ]
       }
     }
   ]
   ```

4. Upload to server at: `https://deals.sera.dev/.well-known/assetlinks.json`
   - Must be served with `Content-Type: application/json`
   - Must be accessible over HTTPS

#### Update Web Redirect Page

Update the App Store and Google Play URLs in `index.html`:

```javascript
if (isAndroid) {
    downloadBtn.href = 'https://play.google.com/store/apps/details?id=com.sera.fribee';
} else {
    downloadBtn.href = 'https://apps.apple.com/app/fribee/idYOUR_APP_ID';
}
```

### 2. iOS Configuration

The iOS configuration is already complete in the project:

✅ `ios/fribee/Info.plist`:
- URL scheme: `fribee`
- Associated Domains: `applinks:deals.sera.dev`

**Additional Steps:**

1. In Xcode, verify Associated Domains capability:
   - Open `fribee.xcworkspace`
   - Select project → Target → Signing & Capabilities
   - Ensure "Associated Domains" capability is enabled
   - Verify domain: `applinks:deals.sera.dev`

2. Update Team ID if needed:
   - Select project → Target → Signing & Capabilities
   - Ensure correct Team is selected

### 3. Android Configuration

The Android configuration is already complete in the project:

✅ `android/app/src/main/AndroidManifest.xml`:
- Custom scheme: `fribee://deal/*`
- App Links: `https://deals.sera.dev/deal/*` with `autoVerify="true"`

**No additional steps required.**

### 4. App Configuration

The app navigation is already configured:

✅ `src/AppNavigator.tsx`:
- Linking configuration with prefixes
- Route mapping for `deal/:dealId`

**No additional steps required.**

### 5. Verification

#### Test Custom URL Scheme (No setup required)

```bash
# iOS Simulator
xcrun simctl openurl booted "fribee://deal/123"

# Android Emulator
adb shell am start -W -a android.intent.action.VIEW -d "fribee://deal/123" com.sera.fribee
```

#### Test Universal Links (iOS) - Requires web server setup

1. Verify AASA file is accessible:
   ```bash
   curl -I https://deals.sera.dev/.well-known/apple-app-site-association
   # Should return: Content-Type: application/json
   ```

2. Validate AASA file:
   - Visit: https://branch.io/resources/aasa-validator/
   - Enter: `deals.sera.dev`
   - Check for errors

3. Test on device (Simulator doesn't support Universal Links):
   ```bash
   # Send link via Messages app
   # Or use Safari and tap link
   ```

4. Debug Universal Links:
   ```bash
   # Check device logs
   xcrun simctl spawn booted log stream --predicate 'subsystem == "com.apple.appstorecomponents"' --level debug
   ```

#### Test App Links (Android) - Requires web server setup

1. Verify assetlinks.json is accessible:
   ```bash
   curl https://deals.sera.dev/.well-known/assetlinks.json
   ```

2. Test on device:
   ```bash
   adb shell am start -W -a android.intent.action.VIEW -d "https://deals.sera.dev/deal/123" com.sera.fribee
   ```

3. Debug App Links:
   ```bash
   # Check verified domains
   adb shell pm get-app-links com.sera.fribee
   
   # Force reverification
   adb shell pm verify-app-links --re-verify com.sera.fribee
   ```

### 6. Testing SMS Flow

1. Build and install the app on a test device
2. Get your test device's phone number
3. Navigate to a deal in the app
4. Tap "Share Deal"
5. Select your own contact (for testing)
6. Send the SMS
7. Tap the link in the SMS
8. App should open directly to that deal

### 7. Production Checklist

Before going live:

- [ ] Web server is configured and accessible at `deals.sera.dev`
- [ ] AASA file uploaded and verified at `https://deals.sera.dev/.well-known/apple-app-site-association`
- [ ] assetlinks.json uploaded and verified at `https://deals.sera.dev/.well-known/assetlinks.json`
- [ ] Apple Team ID is correct in AASA file
- [ ] Android SHA256 fingerprint is correct in assetlinks.json (for RELEASE builds!)
- [ ] App Store and Google Play URLs are updated in index.html
- [ ] Universal Links tested on physical iOS device
- [ ] App Links tested on physical Android device
- [ ] Custom URL scheme tested on both platforms
- [ ] SMS sharing tested end-to-end

## Troubleshooting

### iOS Universal Links Not Working

1. **Check AASA file accessibility:**
   ```bash
   curl -v https://deals.sera.dev/.well-known/apple-app-site-association
   ```
   - Must return 200 OK
   - Must have `Content-Type: application/json`
   - Must be valid JSON

2. **Verify Team ID:**
   - Check in Xcode: Project → Signing & Capabilities → Team
   - Must match Team ID in AASA file

3. **Clear iOS cache:**
   - Uninstall and reinstall app
   - Or wait 24 hours for Apple's CDN to update

4. **Test with Safari:**
   - Open `https://deals.sera.dev/deal/123` in Safari
   - Long press the link
   - Should show "Open in Fribee Deals"

### Android App Links Not Working

1. **Check assetlinks.json:**
   ```bash
   curl https://deals.sera.dev/.well-known/assetlinks.json
   ```
   - Must be accessible
   - Must have correct package name
   - Must have correct SHA256 fingerprint

2. **Verify domain:**
   ```bash
   adb shell pm get-app-links com.sera.fribee
   ```
   - Should show `deals.sera.dev` as verified

3. **Re-verify domain:**
   ```bash
   adb shell pm verify-app-links --re-verify com.sera.fribee
   ```

4. **Check certificate:**
   - Ensure SHA256 fingerprint matches your RELEASE keystore
   - Debug and release builds have different fingerprints!

### Custom URL Scheme Not Working

1. **Check app is installed**
- **Universal Links (iOS)**: `https://fribee.io/deal/{dealId}` (seamless, no browser prompt)
- **App Links (Android)**: `https://fribee.io/deal/{dealId}` (seamless, no browser prompt)
   - Android: `android/app/src/main/AndroidManifest.xml`
3. **Rebuild app after manifest changes**

### Deal Not Loading

1. **Check deal ID extraction:**
   - Add console log in AppNavigator linking config
   - Verify `dealId` parameter is captured correctly

2. **Check DealDetail screen:**
   - Verify it accepts `dealId` route param
   - Verify it loads deal data with that ID

3. **Test with known deal ID:**
   ```bash
   # Replace 123 with actual deal ID from your database
   fribee://deal/123
   ```

## Server Configuration Examples

### Nginx

```nginx
server {
    listen 443 ssl;
    server_name deals.sera.dev;

    # SSL configuration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    root /var/www/deals.sera.dev;
    index index.html;

    # Serve well-known files with correct content type
    location ~ ^/.well-known/(apple-app-site-association|assetlinks.json)$ {
        add_header Content-Type application/json;
        add_header Access-Control-Allow-Origin *;
    }

    # Main redirect page
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Apache

```apache
<VirtualHost *:443>
    ServerName deals.sera.dev
    DocumentRoot /var/www/deals.sera.dev

    SSLEngine on
    SSLCertificateFile /path/to/cert.pem
    SSLCertificateKeyFile /path/to/key.pem

    # Set content type for well-known files
    <FilesMatch "(apple-app-site-association|assetlinks.json)">
        Header set Content-Type "application/json"
        Header set Access-Control-Allow-Origin "*"
    </FilesMatch>

    # Redirect all other requests to index.html
    <Directory /var/www/deals.sera.dev>
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
</VirtualHost>
```

## Resources

- [Apple Universal Links](https://developer.apple.com/ios/universal-links/)
- [Android App Links](https://developer.android.com/training/app-links)
- [React Navigation Deep Linking](https://reactnavigation.org/docs/deep-linking/)
- [Branch AASA Validator](https://branch.io/resources/aasa-validator/)

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review console logs in the app
3. Test with custom URL scheme first (always works)
4. Verify web server files are accessible
5. Contact development team with specific error messages
