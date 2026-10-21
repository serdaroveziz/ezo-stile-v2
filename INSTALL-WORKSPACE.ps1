$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
Write-Host "Kaynak dosyalar ZIP'ten cikarilmis olmali. Bu betik test calistirir, yayin yapmaz."
node test_v2_workspace_runtime.cjs
if ($LASTEXITCODE -ne 0) { throw "Workspace testi gecmedi." }
node test_v2_booking_collision_runtime.cjs
if ($LASTEXITCODE -ne 0) { throw "Randevu testi gecmedi." }
node test_v2_admin_reentry_runtime.cjs
if ($LASTEXITCODE -ne 0) { throw "Admin testi gecmedi." }
node scripts/run-security-regressions.cjs
if ($LASTEXITCODE -ne 0) { throw "Regression testi gecmedi." }
Write-Host "Testler gecti. Preview: vercel.cmd --yes --scope serdaroveziz17-8085s-projects"
