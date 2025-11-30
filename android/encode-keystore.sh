#!/bin/bash

# This script encodes the keystore file to base64 for CircleCI
# Run this script and copy the output to CircleCI environment variables

echo "=== Encoding keystore to base64 ==="
echo ""
echo "Copy the following base64 string and add it to CircleCI:"
echo "Environment Variable Name: ANDROID_KEYSTORE_BASE64"
echo ""
base64 -i app/nolimitsera-release.keystore
echo ""
echo "=== Done ==="
echo ""
echo "Next steps:"
echo "1. Go to CircleCI Project Settings → Environment Variables"
echo "2. Add new variable: ANDROID_KEYSTORE_BASE64"
echo "3. Paste the base64 string above as the value"
echo "4. The .circleci/config.yml will decode it automatically during builds"
