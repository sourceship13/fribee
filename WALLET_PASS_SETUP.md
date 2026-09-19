# Wallet Pass Setup Guide

> **Setup Status:** ✅ iOS configuration complete (January 27, 2026)
>
> - Wallet capability enabled on both App IDs in Apple Developer Portal
> - Entitlements configured for staging and production
> - All provisioning profiles regenerated with Wallet capability
> - App builds successfully with Wallet support
> - **Backend implementation still required** (see Backend Implementation section)

This guide explains how to complete the setup for Apple Wallet (iOS) and Google Pay (Android) wallet pass integration in the Fribee Deals app.

## Overview

The wallet pass feature allows users to save their redeemed deals as passes in Apple Wallet (iOS) or Google Pay (Android). The UI and client-side integration is complete, but **backend server implementation is required** to sign and generate wallet passes.

## Current Implementation Status

✅ **Completed:**

- `react-native-wallet-manager` package installed and configured
- `WalletPassService` service layer created (`src/services/wallet-pass.service.ts`)
- "Save to Wallet" button added to RedemptionScreen
- Platform-specific UI (shows "Apple Wallet" on iOS, "Google Pay" on Android)
- Error handling and user feedback (alerts)

⚠️ **Requires Backend Implementation:**

- Apple Wallet pass signing (requires Apple Pass Type Certificate)
- Google Pay JWT signing (requires Google Service Account)
- Pass generation API endpoints
- Pass file hosting

## iOS - Apple Wallet Setup

### 1. Apple Developer Account Configuration

#### a. Create Pass Type ID

1. Go to [Apple Developer Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list)
2. Click the **+** button to create a new identifier
3. Select **Pass Type IDs** and click **Continue**
4. Enter a description: `Fribee Deals Pass`
5. Set the identifier: `pass.com.sera.fribee.deals`
6. Click **Register**

#### b. Create Pass Type Certificate

1. In the Pass Type IDs list, select the pass you just created
2. Click **Create Certificate**
3. Follow the instructions to create a Certificate Signing Request (CSR):
   ```bash
   # Open Keychain Access on macOS
   # Go to: Keychain Access > Certificate Assistant > Request a Certificate From a Certificate Authority
   # Enter your email and name
   # Select "Saved to disk"
   # Save the CSR file
   ```
4. Upload the CSR file
5. Download the certificate (`.cer` file)
6. Double-click to install it in your Keychain
7. Export the certificate as `.p12`:

### 2. Enable Wallet Capability in App IDs

**Important:** Before regenerating provisioning profiles, enable the Wallet capability on your App IDs in Apple Developer Portal using fastlane:

```bash
# Enable Wallet for staging
fastlane produce enable_services --app-identifier com.sera.fribee.staging --wallet --username aj@sera.dev

# Enable Wallet for production
fastlane produce enable_services --app-identifier com.sera.fribee --wallet --username aj@sera.dev
```

### 3. Enable Wallet Capability in Entitlements

- Right-click the certificate in Keychain Access
- Select **Export**
- Save as `AppleWalletPass.p12`
- Set a password (save this securely)

#### c. Update Entitlements and Regenerate Provisioning Profiles

The Wallet capability is configured via entitlements files. When using fastlane match:

1. **Entitlements are already configured** with Pass Type ID: `pass.fribee.deals`

   - Staging: `ios/fribee/fribee-staging.entitlements`
   - Production: `ios/fribee/fribee-prod.entitlements`

2. **Regenerate ALL provisioning profiles** to include Wallet capability:

   ```bash
   cd ios

   # Delete old profiles without Wallet capability
   fastlane match nuke distribution

   # Regenerate DEVELOPMENT profiles (for Debug builds)
   fastlane match development --app_identifier com.sera.fribee.staging
   fastlane match development --app_identifier com.sera.fribee

   # Regenerate DISTRIBUTION profiles (for Release/TestFlight builds)
   fastlane match appstore --app_identifier com.sera.fribee.staging
   fastlane match appstore --app_identifier com.sera.fribee
   ```

3. **Verify build configuration** (already configured):
   - Debug builds use Development profiles
   - Release builds use Distribution (AppStore) profiles
   - Both configurations use Manual code signing with fastlane match

### 2. Backend Implementation (Apple Wallet)

Create an API endpoint that generates and signs Apple Wallet passes:

```typescript
// Example Node.js backend endpoint
import { PKPass } from 'passkit-generator';
import fs from 'fs';
import path from 'path';

app.post('/api/wallet/apple/generate-pass', async (req, res) => {
  const { redemptionCode, businessName, description, expiryDate } = req.body;

  try {
    // Load certificates
    const certificates = {
      wwdr: fs.readFileSync(path.resolve(__dirname, 'certs/wwdr.pem')),
      signerCert: fs.readFileSync(
        path.resolve(__dirname, 'certs/signerCert.pem'),
      ),
      signerKey: fs.readFileSync(
        path.resolve(__dirname, 'certs/signerKey.pem'),
      ),
      signerKeyPassphrase: process.env.PASS_CERTIFICATE_PASSWORD,
    };

    // Create pass
    const pass = new PKPass(
      {}, // Template files (logo, icon, etc.)
      certificates,
      {
        serialNumber: redemptionCode,
        description: 'Fribee Deal',
      },
    );

    // Set pass data
    pass.type = 'coupon';
    pass.setBarcodes({
      message: redemptionCode,
      format: 'PKBarcodeFormatCode128',
      messageEncoding: 'iso-8859-1',
    });

    pass.headerFields.push({
      key: 'business',
      label: 'BUSINESS',
      value: businessName,
    });

    pass.primaryFields.push({
      key: 'offer',
      label: 'DEAL',
      value: description,
    });

    pass.secondaryFields.push({
      key: 'code',
      label: 'REDEMPTION CODE',
      value: redemptionCode,
    });

    if (expiryDate) {
      pass.auxiliaryFields.push({
        key: 'expires',
        label: 'EXPIRES',
        value: expiryDate,
        dateStyle: 'PKDateStyleShort',
      });
    }

    // Generate the pass
    const buffer = pass.getAsBuffer();

    // Save to file or cloud storage
    const passUrl = `https://yourdomain.com/passes/${redemptionCode}.pkpass`;
    // Upload buffer to S3/Cloud Storage...

    res.json({
      success: true,
      passUrl,
    });
  } catch (error) {
    console.error('Error generating Apple Wallet pass:', error);
    res.status(500).json({ error: 'Failed to generate pass' });
  }
});
```

### 3. Update WalletPassService (iOS)

Update [src/services/wallet-pass.service.ts](src/services/wallet-pass.service.ts):

```typescript
private async addAppleWalletPass(passData: WalletPassData): Promise<void> {
  try {
    // Call your backend API to generate the pass
    const response = await fetch('https://api.yourdomain.com/api/wallet/apple/generate-pass', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(passData),
    });

    const result = await response.json();

    if (!result.success || !result.passUrl) {
      throw new Error('Failed to generate pass');
    }

    // Add the pass to Apple Wallet
    await RNWalletManager.addPassFromUrl(result.passUrl);
  } catch (error) {
    console.error('Error creating Apple Wallet pass:', error);
    throw error;
  }
}
```

## Android - Google Pay Setup

### 1. Google Cloud Console Configuration

#### a. Create a Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Wallet API**:
   - Go to **APIs & Services > Library**
   - Search for "Google Wallet API"
   - Click **Enable**
4. Create a Service Account:
   - Go to **IAM & Admin > Service Accounts**
   - Click **Create Service Account**
   - Name: `fribee-wallet-service`
   - Grant role: **Wallet Objects Admin**
   - Click **Create**
5. Create a Key:
   - Click on the service account
   - Go to **Keys** tab
   - Click **Add Key > Create new key**
   - Select **JSON**
   - Download the JSON key file (save securely)

#### b. Create Pass Class

1. Go to [Google Pay & Wallet Console](https://pay.google.com/business/console)
2. Select your project
3. Create a **Generic Pass Class**:
   - Class ID: `com.sera.fribee.deals.deal`
   - Class name: `Fribee Deal`
   - Issuer name: `Fribee`
   - Configure logo, colors, etc.

### 2. Backend Implementation (Google Pay)

Create an API endpoint that generates and signs Google Pay passes:

```typescript
// Example Node.js backend endpoint
import { GoogleAuth } from 'google-auth-library';
import jwt from 'jsonwebtoken';

app.post('/api/wallet/google/generate-pass', async (req, res) => {
  const { redemptionCode, businessName, description, expiryDate } = req.body;

  try {
    const serviceAccountKey = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, 'google-service-account.json'),
        'utf8',
      ),
    );

    // Create pass object
    const objectSuffix = `${Date.now()}_${redemptionCode}`;
    const objectId = `${serviceAccountKey.client_email}.${objectSuffix}`;

    const genericObject = {
      id: objectId,
      classId: 'com.sera.fribee.deals.deal',
      genericType: 'GENERIC_TYPE_UNSPECIFIED',
      hexBackgroundColor: '#FF9500',
      logo: {
        sourceUri: {
          uri: 'https://yourdomain.com/logo.png',
        },
      },
      cardTitle: {
        defaultValue: {
          language: 'en',
          value: businessName,
        },
      },
      header: {
        defaultValue: {
          language: 'en',
          value: 'Fribee Deal',
        },
      },
      subheader: {
        defaultValue: {
          language: 'en',
          value: description,
        },
      },
      barcode: {
        type: 'CODE_128',
        value: redemptionCode,
        alternateText: redemptionCode,
      },
      textModulesData: [
        {
          header: 'Redemption Code',
          body: redemptionCode,
          id: 'code',
        },
      ],
    };

    if (expiryDate) {
      genericObject.textModulesData.push({
        header: 'Expires',
        body: expiryDate,
        id: 'expiry',
      });
    }

    // Create JWT
    const claims = {
      iss: serviceAccountKey.client_email,
      aud: 'google',
      typ: 'savetowallet',
      iat: Math.floor(Date.now() / 1000),
      origins: [],
      payload: {
        genericObjects: [genericObject],
      },
    };

    const token = jwt.sign(claims, serviceAccountKey.private_key, {
      algorithm: 'RS256',
    });

    const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

    res.json({
      success: true,
      passUrl: saveUrl,
      token,
    });
  } catch (error) {
    console.error('Error generating Google Pay pass:', error);
    res.status(500).json({ error: 'Failed to generate pass' });
  }
});
```

### 3. Update WalletPassService (Android)

Update [src/services/wallet-pass.service.ts](src/services/wallet-pass.service.ts):

```typescript
private async addGooglePayPass(passData: WalletPassData): Promise<void> {
  try {
    // Call your backend API to generate the pass
    const response = await fetch('https://api.yourdomain.com/api/wallet/google/generate-pass', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(passData),
    });

    const result = await response.json();

    if (!result.success || !result.passUrl) {
      throw new Error('Failed to generate pass');
    }

    // Open the Google Pay save URL
    await Linking.openURL(result.passUrl);
  } catch (error) {
    console.error('Error creating Google Pay pass:', error);
    throw error;
  }
}
```

## Environment Variables

Add these to your `.env` file:

```bash
# Apple Wallet
APPLE_PASS_TYPE_ID=pass.com.sera.fribee.deals
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_PASS_CERTIFICATE_PASSWORD=your_p12_password

# Google Pay
GOOGLE_SERVICE_ACCOUNT_EMAIL=fribee-wallet-service@your-project.iam.gserviceaccount.com
GOOGLE_WALLET_ISSUER_ID=your_issuer_id
GOOGLE_WALLET_CLASS_ID=com.sera.fribee.deals.deal
```

## Backend Dependencies

### Node.js

```bash
npm install passkit-generator google-auth-library jsonwebtoken
```

### Python (Alternative)

```bash
pip install google-auth google-auth-httplib2 google-auth-oauthlib PyJWT
```

## Testing

### iOS Testing

1. Use a physical device (Wallet passes don't work in simulator)
2. Install a debug build
3. Navigate to a redeemed deal
4. Tap "Save to Apple Wallet"
5. The pass should open in Wallet app for confirmation

### Android Testing

1. Use a physical device with Google Play Services
2. Install a debug build
3. Navigate to a redeemed deal
4. Tap "Save to Google Pay"
5. Browser should open with "Save to Google Pay" prompt

## Troubleshooting

### iOS Issues

**"Cannot read pass data"**

- Check that your pass is properly signed with the correct certificate
- Verify the Pass Type ID matches in both Apple Developer and your pass JSON

**"Pass already exists"**

- Each pass needs a unique serial number
- Consider adding a timestamp to the redemption code

### Android Issues

**"Unable to save pass"**

- Verify Google Wallet API is enabled in Google Cloud Console
- Check that the service account has proper permissions
- Ensure the JWT is signed correctly

**"Invalid class ID"**

- Make sure the class ID matches exactly what you created in Google Pay Console
- Class IDs are case-sensitive

## Security Considerations

1. **Never expose certificates in client code**

   - All pass signing must happen on the backend
   - Use environment variables for sensitive data

2. **Validate user authentication**

   - Only allow authenticated users to generate passes
   - Verify the user owns the deal before generating a pass

3. **Rate limiting**

   - Implement rate limiting on pass generation endpoints
   - Prevent abuse of the pass generation API

4. **Pass expiration**
   - Set appropriate expiration dates on passes
   - Implement pass revocation if a deal is refunded

## Resources

- [Apple Wallet Developer Guide](https://developer.apple.com/wallet/)
- [Google Wallet API Documentation](https://developers.google.com/wallet)
- [react-native-wallet-manager Documentation](https://github.com/AwesomeCode/react-native-wallet-manager)
- [passkit-generator (Node.js)](https://github.com/alexandercerutti/passkit-generator)

## Next Steps

1. Set up Apple Pass Type ID and certificate
2. Set up Google Service Account and Wallet API
3. Implement backend pass generation endpoints
4. Update `WalletPassService` with your API URLs
5. Add environment variables to your deployment pipeline
6. Test on physical devices (both iOS and Android)
7. Monitor pass generation errors and usage metrics

## Cost Considerations

- **Apple Wallet**: Free (requires Apple Developer Program membership $99/year)
- **Google Pay**: Free (requires Google Cloud account, no monthly fees for basic usage)
- **Cloud Storage**: Consider costs for hosting `.pkpass` files (if using S3/Cloud Storage)

## Support

For questions or issues, contact the development team or refer to the official documentation for Apple Wallet and Google Pay.
