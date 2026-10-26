#!/bin/sh
# Runs when the container starts. Checks the shop's name and writes the file the page reads (shop-config.json).
# A bad name stops the container, so a mistake shows up as "unhealthy" in Coolify instead of a shop that loads nothing.
set -eu

case "${SHOP_SLUG:-}" in
  ''|*[!a-z0-9-]*|-*|*-) echo "SHOP_SLUG is missing or not a valid shop name" >&2; exit 1 ;;
esac
case "${ERP_HOST:-}" in
  ''|*[!a-z0-9.-]*|.*|*.) echo "ERP_HOST is missing or not a valid host name" >&2; exit 1 ;;
esac

printf '{"slug":"%s"}\n' "$SHOP_SLUG" > /usr/share/nginx/html/shop-config.json
