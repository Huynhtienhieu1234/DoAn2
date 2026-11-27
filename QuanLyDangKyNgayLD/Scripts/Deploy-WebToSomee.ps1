param(
    [switch]$SkipBuild,
    [string]$FtpServer = "",
    [string]$FtpUsername = "",
    [string]$FtpPassword = "",
    [string]$RemoteFolder = "www.ngaylaodong.somee.com"
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectDir = Split-Path -Parent $scriptDir
$csproj = Join-Path $projectDir "QuanLyDangKyNgayLD.csproj"
$publishRoot = Join-Path $projectDir "Publish\Somee"
$siteDir = Join-Path $publishRoot "site"
$zipPath = Join-Path $publishRoot "ngaylaodong_somee.zip"

if (-not $SkipBuild) {
    $msbuild = "C:\Program Files\Microsoft Visual Studio\18\Community\MSBuild\Current\Bin\MSBuild.exe"
    if (-not (Test-Path $msbuild)) {
        throw "Khong tim thay MSBuild.exe tai: $msbuild"
    }

    Write-Host "Dang build & precompile Release cho Somee..." -ForegroundColor Cyan
    & $msbuild $csproj /p:Configuration=Release /p:DeployOnBuild=true /p:PublishProfile=SomeeRelease /nologo /v:minimal
    if ($LASTEXITCODE -ne 0) {
        throw "MSBuild Publish that bai (exit code $LASTEXITCODE)."
    }
}

if (-not (Test-Path $siteDir)) {
    throw "Khong tim thay thu muc publish: $siteDir"
}

# Sau khi PrecompileBeforePublish=True da bien dich toan bo view Razor thanh DLL trong bin\,
# co the xoa thu muc bin\roslyn (~18 MB) va go <system.codedom> khoi Web.config ban publish
# de tranh loi shared hosting IIS chan chay roslyn\csc.exe.
$roslynDir = Join-Path $siteDir "bin\roslyn"
if (Test-Path $roslynDir) {
    Remove-Item $roslynDir -Recurse -Force
}

$pubWebConfig = Join-Path $siteDir "Web.config"
[xml]$xml = Get-Content $pubWebConfig -Encoding UTF8
if ($xml.configuration."system.codedom") {
    [void]$xml.configuration.RemoveChild($xml.configuration."system.codedom")
    $xml.Save($pubWebConfig)
}

# Copy thu muc Uploads (avatar, icon) neu ton tai trong project
$srcUploads = Join-Path $projectDir "Uploads"
$dstUploads = Join-Path $siteDir "Uploads"
if (Test-Path $srcUploads) {
    New-Item -ItemType Directory -Force -Path $dstUploads | Out-Null
    Copy-Item (Join-Path $srcUploads "*") $dstUploads -Recurse -Force
}

# Bao dam thu muc Logs ton tai trong goi publish (khong copy log local cu)
$dstLogs = Join-Path $siteDir "Logs"
New-Item -ItemType Directory -Force -Path $dstLogs | Out-Null

# Dong goi file ZIP de upload truc tiep qua Somee File Manager -> Upload Archive
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($siteDir, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)

$siteBytes = (Get-ChildItem $siteDir -Recurse -File | Measure-Object Length -Sum).Sum
$zipBytes = (Get-Item $zipPath).Length
Write-Host ("Da dong goi xong! Unzip size: {0:N2} MB | ZIP size: {1:N2} MB -> {2}" -f ($siteBytes / 1MB), ($zipBytes / 1MB), $zipPath) -ForegroundColor Green

if (-not [string]::IsNullOrWhiteSpace($FtpServer) -and -not [string]::IsNullOrWhiteSpace($FtpUsername) -and -not [string]::IsNullOrWhiteSpace($FtpPassword)) {
    Write-Host "Dang upload thu muc publish len FTP Somee ($FtpServer/$RemoteFolder)..." -ForegroundColor Cyan
    $baseUri = "ftp://$FtpServer/$RemoteFolder"
    $cred = New-Object System.Net.NetworkCredential($FtpUsername, $FtpPassword)

    function Ensure-FtpDir([string]$uri) {
        try {
            $req = [System.Net.FtpWebRequest]::Create($uri)
            $req.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
            $req.Credentials = $cred
            $req.UsePassive = $true
            $resp = $req.GetResponse()
            $resp.Close()
        } catch {
            # Thu muc da ton tai hoac khong can tao lai
        }
    }

    Ensure-FtpDir $baseUri
    $dirs = Get-ChildItem $siteDir -Recurse -Directory | Sort-Object FullName
    foreach ($d in $dirs) {
        $rel = $d.FullName.Substring($siteDir.Length + 1).Replace("\", "/")
        Ensure-FtpDir "$baseUri/$rel"
    }

    $files = Get-ChildItem $siteDir -Recurse -File
    $count = 0
    foreach ($f in $files) {
        $count++
        $rel = $f.FullName.Substring($siteDir.Length + 1).Replace("\", "/")
        $uri = "$baseUri/$rel"
        $req = [System.Net.FtpWebRequest]::Create($uri)
        $req.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
        $req.Credentials = $cred
        $req.UseBinary = $true
        $req.UsePassive = $true
        $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
        $req.ContentLength = $bytes.Length
        $stream = $req.GetRequestStream()
        $stream.Write($bytes, 0, $bytes.Length)
        $stream.Close()
        $resp = $req.GetResponse()
        $resp.Close()
        if ($count % 25 -eq 0 -or $count -eq $files.Count) {
            Write-Host ("  Uploaded {0}/{1} files" -f $count, $files.Count) -ForegroundColor DarkCyan
        }
    }
    Write-Host "Upload FTP len Somee THANH CONG!" -ForegroundColor Green
}
