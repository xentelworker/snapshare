$ErrorActionPreference = "Stop"
Write-Host "SnapShare 1.0.2 upgrade helper" -ForegroundColor Cyan

if (-not (Test-Path "wrangler.toml")) { throw "Run this from the SnapShare project folder." }

Write-Host "`nInstalling/updating dependencies..." -ForegroundColor Yellow
npm install

Write-Host "`nApplying database migrations to the existing snapshare-db..." -ForegroundColor Yellow
npm run db:migrate:remote

Write-Host "`nRunning release checks..." -ForegroundColor Yellow
npm run check

Write-Host "`nDeploying updated Worker and frontend..." -ForegroundColor Yellow
npm run deploy

Write-Host "`nUpgrade complete. Hard-refresh the site (Ctrl+F5) and test event navigation and feature toggles, including Audio Guestbook." -ForegroundColor Green
