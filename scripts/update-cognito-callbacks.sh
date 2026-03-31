#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./cognito-common.sh
source "$SCRIPT_DIR/cognito-common.sh"

POOL_ID="${COGNITO_USER_POOL_ID:-$(get_user_pool_id)}"
CLIENT_ID="${COGNITO_CLIENT_ID:-$(get_client_id "$POOL_ID")}"

aws_cognito update-user-pool-client \
  --user-pool-id "$POOL_ID" \
  --client-id "$CLIENT_ID" \
  --callback-urls $(split_words "$CALLBACK_URLS") \
  --logout-urls $(split_words "$LOGOUT_URLS") \
  >/dev/null

echo "Updated callback and logout URLs for client $CLIENT_ID."
emit_cognito_values "$POOL_ID" "$CLIENT_ID"
