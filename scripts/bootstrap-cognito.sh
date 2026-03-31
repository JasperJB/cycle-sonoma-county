#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./cognito-common.sh
source "$SCRIPT_DIR/cognito-common.sh"

POOL_ID="$(ensure_user_pool)"
CLIENT_ID="$(ensure_user_pool_client "$POOL_ID")"
ensure_group "$POOL_ID" member
ensure_group "$POOL_ID" organizer
ensure_group "$POOL_ID" admin
ensure_domain "$POOL_ID"

echo "Bootstrap complete."
emit_cognito_values "$POOL_ID" "$CLIENT_ID"
