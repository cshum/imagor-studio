#!/bin/bash
set -e

# Default values
PUID=${PUID:-65534}
PGID=${PGID:-65534}

# Create group if it doesn't exist
if ! getent group "$PGID" >/dev/null 2>&1; then
    groupadd -g "$PGID" imagor-studio
else
    GROUP_NAME=$(getent group "$PGID" | cut -d: -f1)
fi

# Create user if it doesn't exist
if ! getent passwd "$PUID" >/dev/null 2>&1; then
    useradd -u "$PUID" -g "$PGID" -d /app -s /bin/bash imagor-studio
else
    USER_NAME=$(getent passwd "$PUID" | cut -d: -f1)
    GROUP_NAME=${GROUP_NAME:-$(getent passwd "$PUID" | cut -d: -f4)}
fi

# Get the actual user and group names
USER_NAME=${USER_NAME:-$(getent passwd "$PUID" | cut -d: -f1)}
GROUP_NAME=${GROUP_NAME:-$(getent group "$PGID" | cut -d: -f1)}

echo "Starting with UID: $PUID ($USER_NAME) GID: $PGID ($GROUP_NAME)"

# Ensure data directories exist and have correct ownership
mkdir -p /app/data /app/gallery
chown -R "$PUID:$PGID" /app/data /app/gallery

# If running the main application, switch to the specified user
if [ "$1" = "/usr/local/bin/imagor-studio" ] || [ "$1" = "imagor-studio" ]; then
    exec gosu "$PUID:$PGID" "$@"
else
    # For other commands (like migration), run as specified user
    exec gosu "$PUID:$PGID" "$@"
fi
