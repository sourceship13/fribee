#!/bin/bash
set -e

echo "🧹 Cleaning build directories..."
cd android
rm -rf .gradle app/.cxx app/build

echo "📦 Creating react-native-config codegen directory..."
mkdir -p ../node_modules/react-native-config/android/build/generated/source/codegen/jni

echo "🔧 Generating codegen artifacts..."
export SENTRY_DISABLE_AUTO_UPLOAD=true
./gradlew generateCodegenArtifactsFromSchema --no-daemon --stacktrace || {
    echo "❌ Codegen generation failed, continuing anyway..."
}

echo "🏗️  Building Staging AAB..."
./gradlew bundleStagingRelease --no-daemon --stacktrace

echo "✅ Build complete!"
echo "📁 AAB location: android/app/build/outputs/bundle/stagingRelease/app-staging-release.aab"

# Open in Finder
open app/build/outputs/bundle/stagingRelease/
