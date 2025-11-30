#!/bin/bash
# Wrapper script to ensure Node.js is in PATH for React Native CLI commands

# Add nvm node to PATH
export PATH="/Users/alpha/.nvm/versions/node/v20.19.5/bin:$PATH"

# Execute the command
exec "$@"
