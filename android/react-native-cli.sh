#!/bin/bash
# Wrapper script to ensure Node.js is in PATH for React Native CLI commands

# Check if running in CI environment
if [ "$CI" = "true" ] || [ "$CIRCLECI" = "true" ]; then
    # In CI, use node from PATH (already configured)
    exec "$@"
else
    # Local development - add nvm node to PATH
    export PATH="/Users/alpha/.nvm/versions/node/v20.19.5/bin:$PATH"
    exec "$@"
fi
