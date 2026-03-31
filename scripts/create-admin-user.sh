#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./cognito-common.sh
source "$SCRIPT_DIR/cognito-common.sh"

EMAIL="${1:?Usage: ./scripts/create-admin-user.sh admin@example.com [TemporaryPassword123!]}"
TEMP_PASSWORD="${2:-TempPassword123!}"
POOL_ID="${COGNITO_USER_POOL_ID:-$(get_user_pool_id)}"

USERNAME="$(resolve_username_by_email "$POOL_ID" "$EMAIL" 2>/dev/null || true)"
if [[ -z "$USERNAME" ]]; then
  USERNAME="$EMAIL"
  aws_cognito admin-create-user \
    --user-pool-id "$POOL_ID" \
    --username "$USERNAME" \
    --temporary-password "$TEMP_PASSWORD" \
    --user-attributes Name=email,Value="$EMAIL" Name=email_verified,Value=true \
    --desired-delivery-mediums EMAIL \
    >/dev/null
fi

aws_cognito admin-add-user-to-group --user-pool-id "$POOL_ID" --username "$USERNAME" --group-name member >/dev/null || true
aws_cognito admin-add-user-to-group --user-pool-id "$POOL_ID" --username "$USERNAME" --group-name organizer >/dev/null || true
aws_cognito admin-add-user-to-group --user-pool-id "$POOL_ID" --username "$USERNAME" --group-name admin >/dev/null || true

echo "Admin user ready: $EMAIL"
