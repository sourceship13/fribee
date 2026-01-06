#!/bin/bash
# Wrapper to find and execute node
NODE_PATHS=(
    "/usr/local/bin/node"
    "$HOME/.nvm/versions/node/v20.19.5/bin/node"
    "/opt/homebrew/bin/node"
    "/usr/bin/node"
)

for NODE in "${NODE_PATHS[@]}"; do
    if [ -x "$NODE" ]; then
        exec "$NODE" "$@"
    fi
done

echo "Error: node not found in any known location" >&2
exit 1
