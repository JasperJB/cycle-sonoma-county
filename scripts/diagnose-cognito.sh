#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./cognito-common.sh
source "$SCRIPT_DIR/cognito-common.sh"

POOL_ID="${COGNITO_USER_POOL_ID:-$(get_user_pool_id)}"
CLIENT_ID="${COGNITO_CLIENT_ID:-$(get_client_id "$POOL_ID")}"

echo "Region: $REGION"
echo "User pool name: $USER_POOL_NAME"
echo "User pool id: $POOL_ID"
echo "App client id: $CLIENT_ID"
echo "Issuer: https://cognito-idp.$REGION.amazonaws.com/$POOL_ID"
echo "Managed login domain: https://$DOMAIN_PREFIX.auth.$REGION.amazoncognito.com"
echo
echo "Callback URLs:"
aws_cognito describe-user-pool-client --user-pool-id "$POOL_ID" --client-id "$CLIENT_ID" --query 'UserPoolClient.CallbackURLs' --output text
echo
echo "Logout URLs:"
aws_cognito describe-user-pool-client --user-pool-id "$POOL_ID" --client-id "$CLIENT_ID" --query 'UserPoolClient.LogoutURLs' --output text
echo
echo "Groups:"
aws_cognito list-groups --user-pool-id "$POOL_ID" --query 'Groups[].GroupName' --output text
