# NEXT_STEPS

## GitHub

```powershell
git branch -M main
winget install --id GitHub.cli -e
gh auth login
gh repo create cycle-sonoma-county --source . --remote origin --private --push
```

## Vercel

```powershell
npx vercel login
npx vercel project add cycle-sonoma-county
npx vercel link --yes --project cycle-sonoma-county
npx vercel git connect (git remote get-url origin)
npx vercel integration add neon --name cycle-sonoma-county-db -e production -e preview -m region=pdx1
npx vercel blob create-store cycle-sonoma-county-assets --access public --region sfo1
```

## Vercel Env

```powershell
$authSecret = [Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 } | ForEach-Object { [byte]$_ }))
$cronSecret = [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 } | ForEach-Object { [byte]$_ }))
$authSecret | npx vercel env add AUTH_SECRET production --sensitive --force
$authSecret | npx vercel env add AUTH_SECRET preview --sensitive --force
$cronSecret | npx vercel env add CRON_SECRET production --sensitive --force
$cronSecret | npx vercel env add CRON_SECRET preview --sensitive --force
'false' | npx vercel env add DEV_AUTH_ENABLED production --force
'false' | npx vercel env add DEV_AUTH_ENABLED preview --force
'thursday' | npx vercel env add NEWSLETTER_SEND_DAY production --force
'thursday' | npx vercel env add NEWSLETTER_SEND_DAY preview --force
```

## Deploy

```powershell
$previewUrl = (npx vercel --yes).Trim()
$prodUrl = (npx vercel --prod --yes).Trim()
$cognitoEnv = & 'C:\Program Files\Git\bin\bash.exe' -lc "cd '/c/Users/jaspe/Documents/cycle-sonoma-county' && AWS_REGION=us-west-2 PROJECT_NAME=cycle-sonoma-county COGNITO_DOMAIN_PREFIX=cycle-sonoma-county-879555867547 LOCAL_URL=http://localhost:3000 PRODUCTION_URL=$prodUrl ./scripts/update-cognito-callbacks.sh"
$cognitoEnv | Where-Object { $_ -match '^COGNITO_' } | ForEach-Object {
  $name, $value = $_ -split '=', 2
  if ($name -match 'SECRET$') {
    $value | npx vercel env add $name production --sensitive --force
  } else {
    $value | npx vercel env add $name production --force
  }
}
$prodUrl | npx vercel env add APP_URL production --force
$prodUrl | npx vercel env add NEXT_PUBLIC_SITE_URL production --force
npx vercel --prod --yes
npx vercel curl / --deployment $previewUrl
npx vercel curl / --deployment $prodUrl
npx vercel logs --environment production --level error --since 5m
```

## Cognito Admin

```powershell
& 'C:\Program Files\Git\bin\bash.exe' -lc "cd '/c/Users/jaspe/Documents/cycle-sonoma-county' && AWS_REGION=us-west-2 COGNITO_USER_POOL_ID=us-west-2_MeRFBb8Gv ./scripts/create-admin-user.sh admin@example.com"
```
