# ============================================================
# QR Menü — Hostinger deploy (Windows PowerShell 5.1 native)
# Kullanım:  powershell -File scripts\deploy.ps1 [-SkipBuild]
#
# Akış: build doğrula → stage klasörü kur → tar.gz → scp → sunucuda
# atomic swap (source_new→source, .env.production korunur) → public_html
# statikleri → Passenger restart → smoke test.
# rsync YOK (Windows) → tar dosyası + scp deseni (PS5 binary pipe bozar).
# ============================================================

param(
  [switch]$SkipBuild,
  [string]$TargetDomain = "qrmenu.algow.net",
  # ~/.ssh/config içinde tanımlı host alias'ı (kimlik bilgisi repo'da tutulmaz)
  [string]$SshAlias = "algow"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$remoteBase = "domains/$TargetDomain"
# Sunucu home dizini runtime'da çözülür (hesap adı hardcode edilmez)
$remoteHome = (ssh $SshAlias 'echo $HOME').Trim()
if (-not $remoteHome) { throw "ssh '$SshAlias' ile home dizini alınamadı — ~/.ssh/config alias'ını kontrol et" }
$appRoot = "$remoteHome/$remoteBase/source"
# Supabase host'u .env.local'dan oku (CSP şablonuna gider)
$envLine = Select-String -Path ".env.local" -Pattern '^NEXT_PUBLIC_SUPABASE_URL=https://(.+)$' | Select-Object -First 1
if (-not $envLine) { throw ".env.local içinde NEXT_PUBLIC_SUPABASE_URL bulunamadı" }
$supabaseHost = $envLine.Matches[0].Groups[1].Value.Trim()

Write-Host "== QR Menü deploy → $TargetDomain ==" -ForegroundColor Cyan

# 1) Build
if (-not $SkipBuild) {
  Write-Host "[1/7] next build (standalone)..." -ForegroundColor Yellow
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "Build başarısız" }
} else {
  Write-Host "[1/7] Build atlandı (-SkipBuild)" -ForegroundColor DarkGray
}

# Artefakt doğrulama — sharp Linux binary'si standalone'a girmiş olmalı
if (-not (Test-Path ".next\standalone\server.js")) { throw ".next\standalone\server.js yok — output:'standalone' üretilmemiş" }
if (-not (Test-Path ".next\standalone\node_modules\@img\sharp-linux-x64")) {
  throw "sharp-linux-x64 standalone'da yok! Çalıştır: npm install -D --force @img/sharp-linux-x64 @img/sharp-libvips-linux-x64"
}

# 2) Stage
Write-Host "[2/7] Stage hazırlanıyor..." -ForegroundColor Yellow
$stage = "deploy\stage"
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Path "$stage\source", "$stage\public_html" | Out-Null

Copy-Item -Recurse ".next\standalone\*" "$stage\source\"
# Emniyet: trace'e sızmış ağır klasörleri stage'den at (tracing exclude'a ek kemer)
foreach ($junk in "deploy", ".uploads-dev", ".chatgpt-images") {
  if (Test-Path "$stage\source\$junk") { Remove-Item -Recurse -Force "$stage\source\$junk" }
}
New-Item -ItemType Directory -Force -Path "$stage\source\.next\static" | Out-Null
Copy-Item -Recurse ".next\static\*" "$stage\source\.next\static\"
if (Test-Path "public") { Copy-Item -Recurse "public" "$stage\source\public" -Force }
Copy-Item "scripts\start.js" "$stage\source\start.js"
New-Item -ItemType Directory -Force -Path "$stage\source\tmp" | Out-Null

# public_html: .htaccess + _next/static (LiteSpeed doğrudan servis — Node CPU sıfır)
$ht = Get-Content "deploy\htaccess-template" -Raw -Encoding UTF8
$ht = $ht.Replace("{{APP_ROOT}}", $appRoot).Replace("{{SUPABASE_HOST}}", $supabaseHost)
[System.IO.File]::WriteAllText("$root\$stage\public_html\.htaccess", $ht) # BOM'suz UTF8
New-Item -ItemType Directory -Force -Path "$stage\public_html\_next" | Out-Null
Copy-Item -Recurse ".next\static" "$stage\public_html\_next\static"

# Demo upload görselleri — yalnız pakete koy; sunucuda klasör YOKSA açılır (sonraki deploylar ezmez)
if (Test-Path ".uploads-dev\t") {
  New-Item -ItemType Directory -Force -Path "$stage\uploads-seed" | Out-Null
  Copy-Item -Recurse ".uploads-dev\t" "$stage\uploads-seed\t"
}

# 3) Arşiv
Write-Host "[3/7] tar.gz oluşturuluyor..." -ForegroundColor Yellow
$tarFile = "deploy\qrmenu-deploy.tar.gz"
if (Test-Path $tarFile) { Remove-Item -Force $tarFile }
tar -czf $tarFile -C $stage source public_html uploads-seed 2>$null
if (-not (Test-Path $tarFile)) { tar -czf $tarFile -C $stage source public_html } # uploads-seed yoksa
"{0:N1} MB" -f ((Get-Item $tarFile).Length / 1MB) | ForEach-Object { Write-Host "  paket: $_" }

# 4) Yükle
Write-Host "[4/7] scp ile yükleniyor..." -ForegroundColor Yellow
scp -q $tarFile "${SshAlias}:~/qrmenu-deploy.tar.gz"
if ($LASTEXITCODE -ne 0) { throw "scp başarısız" }

# 5) Sunucuda atomic swap
Write-Host "[5/7] Sunucuda açılıyor (atomic swap)..." -ForegroundColor Yellow
$remoteScript = @'
set -e
BASE=~/__REMOTE_BASE__
mkdir -p $BASE/public_html
rm -rf ~/qrmenu-extract && mkdir ~/qrmenu-extract
tar -xzf ~/qrmenu-deploy.tar.gz -C ~/qrmenu-extract
# .env.production'ı yeni source'a taşı (varsa)
if [ -f $BASE/source/.env.production ]; then
  cp $BASE/source/.env.production ~/qrmenu-extract/source/.env.production
  chmod 600 ~/qrmenu-extract/source/.env.production
fi
mkdir -p ~/qrmenu-extract/source/tmp
# swap
if [ -d $BASE/source ]; then mv $BASE/source $BASE/source_old; fi
mv ~/qrmenu-extract/source $BASE/source
rm -rf $BASE/source_old
# public_html: htaccess + _next/static güncelle (uploads'a DOKUNMA)
cp ~/qrmenu-extract/public_html/.htaccess $BASE/public_html/.htaccess
rm -rf $BASE/public_html/_next
cp -r ~/qrmenu-extract/public_html/_next $BASE/public_html/_next
# demo uploads: yalnız hiç yoksa aç
if [ ! -d $BASE/public_html/uploads ] && [ -d ~/qrmenu-extract/uploads-seed ]; then
  mkdir -p $BASE/public_html/uploads
  cp -r ~/qrmenu-extract/uploads-seed/t $BASE/public_html/uploads/t
fi
rm -rf ~/qrmenu-extract ~/qrmenu-deploy.tar.gz
# restart
touch $BASE/source/tmp/restart.txt
echo SWAP-OK
'@
$remoteScript = $remoteScript.Replace("__REMOTE_BASE__", $remoteBase).Replace("`r", "")
# Pipe DEĞİL dosya: PS5 pipe'a BOM bulaştırıp bash parse'ını bozabiliyor (2026-06-13 dersi).
# WriteAllText (encoding'siz) = BOM'suz UTF-8.
$swapFile = Join-Path $env:TEMP "qrmenu-swap.sh"
[System.IO.File]::WriteAllText($swapFile, $remoteScript)
scp -q $swapFile "${SshAlias}:~/qrmenu-swap.sh"
if ($LASTEXITCODE -ne 0) { throw "swap script scp başarısız" }
ssh $SshAlias "bash ~/qrmenu-swap.sh; rc=`$?; rm -f ~/qrmenu-swap.sh; exit `$rc"
if ($LASTEXITCODE -ne 0) { throw "Sunucu swap başarısız" }

# 6) .env.production kontrolü
Write-Host "[6/7] .env.production kontrol..." -ForegroundColor Yellow
$envCheck = ssh $SshAlias "test -f $remoteBase/source/.env.production && echo VAR || echo YOK"
if ($envCheck -match "YOK") {
  Write-Host "  ⚠ .env.production sunucuda YOK — ilk kurulum: scripts\setup-server-env.ps1 çalıştır" -ForegroundColor Red
}

# 7) Smoke
Write-Host "[7/7] Smoke test..." -ForegroundColor Yellow
Start-Sleep -Seconds 4
curl.exe -s -o NUL -w "  / -> %{http_code}`n" -m 25 "https://$TargetDomain/"
curl.exe -s -m 25 "https://$TargetDomain/safran-sofrasi" -o "$env:TEMP\qrmenu-smoke.html" -w "  /safran-sofrasi -> %{http_code} (%{time_total}s)`n"
if (Select-String -Path "$env:TEMP\qrmenu-smoke.html" -Pattern "Künefe" -Quiet) {
  Write-Host "  içerik dogrulandi (Künefe bulundu) ✓" -ForegroundColor Green
} else {
  Write-Host "  ⚠ menü içerigi dogrulanamadi — elle kontrol et" -ForegroundColor Red
}

Write-Host "== Deploy bitti ==" -ForegroundColor Cyan
