# Deep Linking Setup Guide

## Overview
This app supports deep linking to allow users to open specific deals directly from SMS messages.

## Deep Link Format
```
fribee://deal/{dealId}
```

Example: `fribee://deal/12345`

## Universal Links (iOS)
Domain: `https://fribee.io/deal/{dealId}`

## App Links (Android)  
Domain: `https://fribee.io/deal/{dealId}`

## Setup Steps

### 1. iOS Configuration

#### a. Update Info.plist
The Info.plist has been updated with:
- URL Types for custom scheme `fribee://`
- Associated Domains for Universal Links `applinks:fribee.io`

#### b. Configure Apple App Site Association (AASA)
Host this file at `https://fribee.io/.well-known/apple-app-site-association`:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.sera.fribee",
        "paths": ["/deal/*"]
      }
    ]
  }
}
```

Replace `TEAM_ID` with your Apple Team ID.

### 2. Android Configuration

#### a. AndroidManifest.xml
The AndroidManifest.xml has been updated with intent filters for:
- Custom scheme: `fribee://deal/*`
- App Links: `https://fribee.io/deal/*`

#### b. Configure Digital Asset Links
Host this file at `https://fribee.io/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.sera.fribee",
    "sha256_cert_fingerprints": [
      "YOUR_SHA256_FINGERPRINT_HERE"
    ]
  }
}]
```

Get your SHA256 fingerprint:
```bash
cd android
./gradlew signingReport
```

### 3. Web Redirect Page (Optional)
Create a simple redirect page at `https://fribee.io/deal/{dealId}` that:
- Detects if on mobile
- Attempts to open the app via deep link
- Falls back to App Store/Play Store if app not installed

Example HTML:
```html
<!DOCTYPE html>
<html>
<head>
  <title>Opening Deal...</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <h1>Opening deal...</h1>
  <p>If the app doesn't open, <a href="APP_STORE_LINK">download it here</a>.</p>
  <script>
    const dealId = window.location.pathname.split('/deal/')[1];
    const deepLink = `fribee://deal/${dealId}`;
    
    // Try to open app
    window.location.href = deepLink;
    
    // Fallback to store after 2 seconds
    setTimeout(() => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const storeUrl = isIOS 
        ? 'https://apps.apple.com/app/YOUR_APP_ID'
        : 'https://play.google.com/store/apps/details?id=com.sera.fribee';
      window.location.href = storeUrl;
    }, 2000);
  </script>
</body>
</html>
```

### 4. Testing

#### iOS Simulator:
```bash
xcrun simctl openurl booted "fribee://deal/12345"
```

#### Android Emulator/Device:
```bash
adb shell am start -W -a android.intent.action.VIEW -d "fribee://deal/12345" com.sera.fribee
```

#### Test Universal/App Links:
```bash
# iOS
xcrun simctl openurl booted "https://fribee.io/deal/12345"

# Android  
adb shell am start -W -a android.intent.action.VIEW -d "https://fribee.io/deal/12345"
```

## Notes
- Make sure the domain (fribee.io) is under your control
- AASA and assetlinks.json files must be served over HTTPS
- Files should be accessible without authentication
- Changes to native configuration require rebuilding the app
