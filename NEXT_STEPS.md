# NEXT_STEPS

## GitHub

```powershell
gh auth login
gh repo create cycle-sonoma-county --source . --remote origin --private --push
```

## Cognito Admin

```powershell
& 'C:\Program Files\Git\bin\bash.exe' -lc "cd '/c/Users/jaspe/Documents/cycle-sonoma-county' && AWS_REGION=us-west-2 COGNITO_USER_POOL_ID=us-west-2_MeRFBb8Gv ./scripts/create-admin-user.sh admin@example.com"
```
