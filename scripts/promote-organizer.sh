#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./cognito-common.sh
source "$SCRIPT_DIR/cognito-common.sh"

EMAIL="${1:?Usage: ./scripts/promote-organizer.sh user@example.com}"
POOL_ID="${COGNITO_USER_POOL_ID:-$(get_user_pool_id)}"
USERNAME="$(resolve_username_by_email "$POOL_ID" "$EMAIL")"

aws_cognito admin-add-user-to-group --user-pool-id "$POOL_ID" --username "$USERNAME" --group-name member >/dev/null || true
aws_cognito admin-add-user-to-group --user-pool-id "$POOL_ID" --username "$USERNAME" --group-name organizer >/dev/null

echo "Promoted organizer: $EMAIL"
