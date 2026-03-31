#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./cognito-common.sh
source "$SCRIPT_DIR/cognito-common.sh"

POOL_ID="${COGNITO_USER_POOL_ID:-$(get_user_pool_id)}"
CLIENT_ID="${COGNITO_CLIENT_ID:-$(get_client_id "$POOL_ID")}"

configure_user_pool_client "$POOL_ID" "$CLIENT_ID"

echo "Updated Cognito client settings for $CLIENT_ID."
emit_cognito_values "$POOL_ID" "$CLIENT_ID"
