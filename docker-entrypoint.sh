#!/bin/bash
set -e

PUID=${PUID:-65534}
PGID=${PGID:-65534}

if ! getent group "$PGID" >/dev/null 2>&1; then
    groupadd -g "$PGID" imagor-studio
else
    GROUP_NAME=$(getent group "$PGID" | cut -d: -f1)
fi

if ! getent passwd "$PUID" >/dev/null 2>&1; then
    useradd -u "$PUID" -g "$PGID" -d /app -s /bin/bash imagor-studio
else
    USER_NAME=$(getent passwd "$PUID" | cut -d: -f1)
    GROUP_NAME=${GROUP_NAME:-$(getent passwd "$PUID" | cut -d: -f4)}
fi

USER_NAME=${USER_NAME:-$(getent passwd "$PUID" | cut -d: -f1)}
GROUP_NAME=${GROUP_NAME:-$(getent group "$PGID" | cut -d: -f1)}

echo "Starting with UID: $PUID ($USER_NAME) GID: $PGID ($GROUP_NAME)"

mkdir -p /app/data /app/gallery
chown -R "$PUID:$PGID" /app/data /app/gallery

exec gosu "$PUID:$PGID" "$@"
