# Web Redirect Files

This folder contains the web files that need to be deployed to `deals.sera.dev` for deep linking to work.

## Files Overview

### `index.html`
The main redirect page that users see when clicking a deal link without the app installed.

**Features:**
- Auto-detects platform (iOS/Android)
- Attempts to open the app automatically
- Provides download links to App Store/Google Play
- 3-second countdown before attempting to open app
- Responsive design that works on all devices

**Before Deploying:**
Update the App Store and Google Play URLs (lines 121-125):
```javascript
if (isAndroid) {
    downloadBtn.href = 'https://play.google.com/store/apps/details?id=com.nolimitseradeals';
} else {
    downloadBtn.href = 'https://apps.apple.com/app/nolimit-sera-deals/idYOUR_APP_ID';
}
```

### `.well-known/apple-app-site-association`
iOS Universal Links verification file.

**Before Deploying:**
Replace `TEAMID` with your actual Apple Team ID (found at developer.apple.com):
```json
{
  "applinks": {
    "details": [
      {
        "appID": "YOUR_TEAM_ID.com.nolimitseradeals",
        ...
      }
    ]
  }
}
```

**Important:**
- Must be served with `Content-Type: application/json`
- Must be accessible at `https://deals.sera.dev/.well-known/apple-app-site-association`
- No file extension
- Must be accessible over HTTPS

### `.well-known/assetlinks.json`
Android App Links verification file.

**Before Deploying:**
Replace `SHA256_FINGERPRINT_HERE` with your app's SHA256 fingerprint:

```bash
# Get fingerprint from your release keystore
keytool -list -v -keystore /path/to/release.keystore -alias your-alias
```

Copy the SHA256 value (format: `XX:XX:XX:...`) and update the file:
```json
{
  "sha256_cert_fingerprints": [
    "XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX"
  ]
}
```

**Important:**
- Must be served with `Content-Type: application/json`
- Must be accessible at `https://deals.sera.dev/.well-known/assetlinks.json`
- Must use SHA256 from RELEASE keystore (not debug)

## Deployment

### Quick Deploy

1. Update configuration files:
   - Apple Team ID in `apple-app-site-association`
   - Android SHA256 in `assetlinks.json`
   - App Store/Play Store URLs in `index.html`

2. Upload files to web server maintaining this structure:
   ```
   deals.sera.dev/
   ├── index.html
   ├── .well-known/
       ├── apple-app-site-association
       └── assetlinks.json
   ```

3. Verify files are accessible:
   ```bash
   curl https://deals.sera.dev/index.html
   curl https://deals.sera.dev/.well-known/apple-app-site-association
   curl https://deals.sera.dev/.well-known/assetlinks.json
   ```

### Server Configuration

Ensure your web server serves the `.well-known` files with correct content type.

**Nginx:**
```nginx
location ~ ^/.well-known/(apple-app-site-association|assetlinks.json)$ {
    add_header Content-Type application/json;
    add_header Access-Control-Allow-Origin *;
}
```

**Apache:**
```apache
<FilesMatch "(apple-app-site-association|assetlinks.json)">
    Header set Content-Type "application/json"
    Header set Access-Control-Allow-Origin "*"
</FilesMatch>
```

## Verification

### Test Files Are Accessible
```bash
# Should return HTML
curl https://deals.sera.dev/index.html

# Should return JSON with Content-Type: application/json
curl -I https://deals.sera.dev/.well-known/apple-app-site-association
curl -I https://deals.sera.dev/.well-known/assetlinks.json
```

### Validate iOS Universal Links
Visit: https://branch.io/resources/aasa-validator/
Enter: `deals.sera.dev`

### Test Android App Links
```bash
adb shell pm get-app-links com.nolimitseradeals
```

## Troubleshooting

### Files Return 404
- Check file paths on server
- Ensure `.well-known` directory exists
- Check file permissions (should be readable)

### Wrong Content-Type
- Add server configuration to force `application/json`
- Clear browser cache and retry

### Domain Not Verified (iOS)
- Wait up to 24 hours for Apple's CDN to cache
- Verify Team ID is correct
- Reinstall app to force re-check

### Domain Not Verified (Android)
- Check SHA256 fingerprint matches release keystore
- Run: `adb shell pm verify-app-links --re-verify com.nolimitseradeals`
- Ensure `autoVerify="true"` in AndroidManifest.xml

## Resources

- [Full Deployment Guide](../DEPLOYMENT_GUIDE.md)
- [Quick Reference](../DEEP_LINKING_REFERENCE.md)
- [Setup Documentation](../DEEP_LINKING_SETUP.md)
