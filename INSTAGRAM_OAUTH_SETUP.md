# Instagram OAuth Login Setup Guide

## Overview
Instagram login has been implemented using Instagram Basic Display API and OAuth 2.0 flow.

## Status
✅ Code implemented
⚠️ Requires configuration in Facebook Developer Console

## Setup Steps

### 1. Create Facebook Developer Account
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Sign up or log in with your Facebook account
3. Complete developer registration if needed

### 2. Create or Configure App
1. Go to [My Apps](https://developers.facebook.com/apps)
2. Click "Create App" or select existing app
3. Choose app type: "Consumer" or "Business"
4. Fill in app details:
   - App Name: "NoLimit Sera Deals"
   - Contact Email: your@email.com

### 3. Add Instagram Basic Display Product
1. In your app dashboard, click "Add Product"
2. Find "Instagram Basic Display" and click "Set Up"
3. Click "Create New App" in Instagram Basic Display section
4. Accept Instagram API Terms

### 4. Configure Instagram Basic Display

**Client OAuth Settings:**
- Valid OAuth Redirect URIs:
  ```
  com.nolimitseradeals://oauth
  ```
- Deauthorize Callback URL:
  ```
  https://yourbackend.com/auth/instagram/deauthorize
  ```
- Data Deletion Request URL:
  ```
  https://yourbackend.com/auth/instagram/delete
  ```

**App Review (Optional for testing):**
- Not needed for development/testing
- Required for production with public users
- You can test with Instagram test users without app review

### 5. Get Your Credentials
1. In Instagram Basic Display settings
2. Copy your **Instagram App ID**
3. Copy your **Instagram App Secret**

### 6. Add Credentials to .env

Edit your `.env` file:
```bash
# Instagram OAuth
INSTAGRAM_APP_ID=your_instagram_app_id_here
INSTAGRAM_APP_SECRET=your_instagram_app_secret_here
```

### 7. Add Instagram Test Users
Since your app isn't reviewed, you need to add test users:

1. Go to Instagram Basic Display → User Token Generator
2. Click "Add Instagram Test User"
3. Search for Instagram accounts to add as testers
4. Test users must accept the invitation in their Instagram account settings

### 8. Backend Implementation Required

Your backend needs to handle Instagram authentication:

**Endpoint:** `POST /auth/instagram`

**Request Body:**
```json
{
  "accessToken": "instagram_access_token",
  "instagramUserId": "12345678",
  "username": "instagram_username"
}
```

**Backend Steps:**
1. Verify the Instagram access token with Instagram API:
   ```
   GET https://graph.instagram.com/me?fields=id,username&access_token={token}
   ```
2. Check if user exists in your database (by Instagram user ID)
3. Create new user or login existing user
4. Return your app's JWT token

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "your_app_jwt_token",
    "user": {
      "id": "123",
      "email": "user@example.com",
      "name": "User Name",
      "instagramUsername": "instagram_username"
    }
  }
}
```

## Testing

### Development Testing
1. Configure credentials in `.env`
2. Rebuild app: `npm run android` or `npm run ios`
3. Tap "Sign in with Instagram"
4. Login with Instagram test user account
5. Authorize the app
6. Check logs for OAuth flow progress

### Troubleshooting

**"Instagram Login Not Configured" alert:**
- Check `.env` file has INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET
- Rebuild the app after adding credentials
- Verify credentials are correct in Facebook Developer Console

**OAuth redirect fails:**
- Android: Check `android/app/src/main/AndroidManifest.xml` has intent-filter for `com.nolimitseradeals://oauth`
- iOS: Check `ios/nolimitseradeals/Info.plist` has URL scheme for `com.nolimitseradeals`
- Verify redirect URI in Facebook Developer Console matches exactly

**"Invalid redirect_uri" error:**
- Make sure redirect URI in Facebook Developer Console is: `com.nolimitseradeals://oauth`
- No trailing slashes
- Must match exactly

**Backend error:**
- Implement `POST /auth/instagram` endpoint
- Verify Instagram token with Instagram API
- Return proper JWT token for your app

## Production Considerations

### App Review
For production release, you need Instagram App Review:
1. Submit app for review in Facebook Developer Console
2. Provide use case for Instagram Basic Display
3. Record video showing how Instagram data is used
4. Wait for approval (usually 1-2 weeks)

### Alternative: Instagram Graph API
Instagram Basic Display is being deprecated. Consider migrating to:
- Instagram Graph API (requires Instagram Business account)
- Facebook Login (users connect Instagram through Facebook)

## Files Modified

1. `src/services/instagram-auth.service.ts` - Instagram OAuth service
2. `src/screens/SignIn/SignIn.tsx` - Added Instagram login handler
3. `android/app/src/main/AndroidManifest.xml` - OAuth redirect for Android
4. `ios/nolimitseradeals/Info.plist` - OAuth redirect for iOS
5. `.env` - Add INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET

## Next Steps

1. ✅ Complete Facebook Developer Console setup
2. ✅ Add credentials to `.env` file
3. ✅ Implement backend `/auth/instagram` endpoint
4. ✅ Add Instagram test users
5. ✅ Test OAuth flow
6. ⚠️ Submit for App Review (production only)

## Support Resources

- [Instagram Basic Display Documentation](https://developers.facebook.com/docs/instagram-basic-display-api)
- [Facebook App Development](https://developers.facebook.com/docs/development)
- [OAuth 2.0 Spec](https://oauth.net/2/)
