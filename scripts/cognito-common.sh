#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="${PROJECT_NAME:-cycle-sonoma-county}"
REGION="${AWS_REGION:-${REGION:-us-west-2}}"
USER_POOL_NAME="${COGNITO_USER_POOL_NAME:-$PROJECT_NAME}"
APP_CLIENT_NAME="${COGNITO_APP_CLIENT_NAME:-${PROJECT_NAME}-web}"
RAW_DOMAIN_PREFIX="${COGNITO_DOMAIN_PREFIX:-$PROJECT_NAME}"
DOMAIN_PREFIX="$(printf '%s' "$RAW_DOMAIN_PREFIX" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9-' '-')"
LOCAL_URL="${LOCAL_URL:-http://localhost:3000}"
PRODUCTION_URL="${PRODUCTION_URL:-}"
CALLBACK_URLS="${CALLBACK_URLS:-$LOCAL_URL/auth/callback ${PRODUCTION_URL:+$PRODUCTION_URL/auth/callback}}"
LOGOUT_URLS="${LOGOUT_URLS:-$LOCAL_URL ${PRODUCTION_URL:-}}"

aws_cognito() {
  aws --region "$REGION" cognito-idp "$@"
}

normalize_text() {
  local value="$1"
  if [[ "$value" == "None" || "$value" == "NONE" ]]; then
    return 1
  fi
  printf '%s' "$value"
}

join_json_array() {
  local result="["
  for item in "$@"; do
    [[ -z "$item" ]] && continue
    result="${result}\"${item}\","
  done
  result="${result%,}]"
  printf '%s' "$result"
}

split_words() {
  local value="$1"
  if [[ -z "$value" ]]; then
    return
  fi
  for item in $value; do
    printf '%s\n' "$item"
  done
}

get_user_pool_id() {
  local pool_id
  pool_id="$(aws_cognito list-user-pools --max-results 60 --query "UserPools[?Name=='$USER_POOL_NAME'].Id | [0]" --output text)"
  normalize_text "$pool_id"
}

ensure_user_pool() {
  if pool_id="$(get_user_pool_id 2>/dev/null)"; then
    printf '%s' "$pool_id"
    return
  fi

  aws_cognito create-user-pool \
    --pool-name "$USER_POOL_NAME" \
    --auto-verified-attributes email \
    --username-attributes email \
    --schema Name=email,AttributeDataType=String,Required=true \
    --query 'UserPool.Id' \
    --output text
}

get_client_id() {
  local pool_id="$1"
  local client_id
  client_id="$(aws_cognito list-user-pool-clients --user-pool-id "$pool_id" --max-results 60 --query "UserPoolClients[?ClientName=='$APP_CLIENT_NAME'].ClientId | [0]" --output text)"
  normalize_text "$client_id"
}

ensure_user_pool_client() {
  local pool_id="$1"
  if client_id="$(get_client_id "$pool_id" 2>/dev/null)"; then
    printf '%s' "$client_id"
    return
  fi

  aws_cognito create-user-pool-client \
    --user-pool-id "$pool_id" \
    --client-name "$APP_CLIENT_NAME" \
    --generate-secret \
    --allowed-o-auth-flows-user-pool-client \
    --allowed-o-auth-flows code \
    --allowed-o-auth-scopes openid email profile aws.cognito.signin.user.admin \
    --supported-identity-providers COGNITO \
    --callback-urls $(split_words "$CALLBACK_URLS") \
    --logout-urls $(split_words "$LOGOUT_URLS") \
    --explicit-auth-flows ALLOW_REFRESH_TOKEN_AUTH ALLOW_USER_PASSWORD_AUTH \
    --query 'UserPoolClient.ClientId' \
    --output text
}

configure_user_pool_client() {
  local pool_id="$1"
  local client_id="$2"

  aws_cognito update-user-pool-client \
    --user-pool-id "$pool_id" \
    --client-id "$client_id" \
    --allowed-o-auth-flows-user-pool-client \
    --allowed-o-auth-flows code \
    --allowed-o-auth-scopes openid email profile aws.cognito.signin.user.admin \
    --supported-identity-providers COGNITO \
    --callback-urls $(split_words "$CALLBACK_URLS") \
    --logout-urls $(split_words "$LOGOUT_URLS") \
    --explicit-auth-flows ALLOW_REFRESH_TOKEN_AUTH ALLOW_USER_PASSWORD_AUTH \
    >/dev/null
}

ensure_group() {
  local pool_id="$1"
  local group_name="$2"
  if aws_cognito get-group --user-pool-id "$pool_id" --group-name "$group_name" >/dev/null 2>&1; then
    return
  fi
  aws_cognito create-group --user-pool-id "$pool_id" --group-name "$group_name" >/dev/null
}

ensure_domain() {
  local pool_id="$1"
  local current_pool
  current_pool="$(aws_cognito describe-user-pool-domain --domain "$DOMAIN_PREFIX" --query 'DomainDescription.UserPoolId' --output text 2>/dev/null || true)"
  if [[ "$current_pool" == "$pool_id" ]]; then
    return
  fi
  if [[ -n "$current_pool" && "$current_pool" != "None" ]]; then
    echo "Domain prefix '$DOMAIN_PREFIX' is already attached to another pool." >&2
    exit 1
  fi
  aws_cognito create-user-pool-domain --user-pool-id "$pool_id" --domain "$DOMAIN_PREFIX" >/dev/null
}

resolve_username_by_email() {
  local pool_id="$1"
  local email="$2"
  local username
  username="$(aws_cognito list-users --user-pool-id "$pool_id" --filter "email = \"$email\"" --query 'Users[0].Username' --output text)"
  normalize_text "$username"
}

emit_cognito_values() {
  local pool_id="$1"
  local client_id="$2"
  local client_secret
  client_secret="$(aws_cognito describe-user-pool-client --user-pool-id "$pool_id" --client-id "$client_id" --query 'UserPoolClient.ClientSecret' --output text)"
  cat <<EOF
COGNITO_REGION=$REGION
COGNITO_USER_POOL_ID=$pool_id
COGNITO_CLIENT_ID=$client_id
COGNITO_CLIENT_SECRET=$client_secret
COGNITO_ISSUER=https://cognito-idp.$REGION.amazonaws.com/$pool_id
COGNITO_DOMAIN=https://$DOMAIN_PREFIX.auth.$REGION.amazoncognito.com
COGNITO_REDIRECT_URI=$LOCAL_URL/auth/callback
COGNITO_LOGOUT_URI=$LOCAL_URL
EOF
}
