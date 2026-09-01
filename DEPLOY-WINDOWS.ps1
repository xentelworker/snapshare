$ErrorActionPreference = "Stop"
Write-Host "SnapShare 1.0 deployment helper" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js 20+ is required." }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw "npm is required." }

npm install
npx wrangler login

Write-Host "`nCreating D1 database..." -ForegroundColor Yellow
$d1 = npx wrangler d1 create snapshare-db 2>&1 | Out-String
Write-Host $d1
$dbId = [regex]::Match($d1, 'database_id\s*=\s*"([^"]+)"').Groups[1].Value
if (-not $dbId) {
  $dbId = Read-Host "Paste the D1 database_id shown above"
}
if (-not $dbId) { throw "A D1 database_id is required." }

$toml = Get-Content "wrangler.toml" -Raw
$toml = $toml -replace 'database_id = "REPLACE_WITH_D1_DATABASE_ID"', ('database_id = "' + $dbId + '"')

$siteKey = Read-Host "Turnstile site key (press Enter to configure later)"
if ($siteKey) {
  $toml = $toml -replace 'TURNSTILE_SITE_KEY = ""', ('TURNSTILE_SITE_KEY = "' + $siteKey + '"')
}
Set-Content "wrangler.toml" $toml -Encoding utf8

Write-Host "`nCreating R2 bucket..." -ForegroundColor Yellow
try { npx wrangler r2 bucket create snapshare-media } catch { Write-Host "Bucket may already exist; continuing." -ForegroundColor DarkYellow }

Write-Host "`nApplying D1 migrations..." -ForegroundColor Yellow
npm run db:migrate:remote

if ($siteKey) {
  Write-Host "`nPaste your Turnstile SECRET key at the Wrangler prompt." -ForegroundColor Yellow
  npx wrangler secret put TURNSTILE_SECRET_KEY
}

Write-Host "`nRunning release checks..." -ForegroundColor Yellow
npm run check

Write-Host "`nDeploying..." -ForegroundColor Yellow
npm run deploy

Write-Host "`nDeployment complete. Add your custom domain in Cloudflare and then test the production checklist in README.md." -ForegroundColor Green
