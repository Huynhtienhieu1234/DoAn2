param(
    [Parameter(Mandatory = $true)][string]$Server,
    [Parameter(Mandatory = $true)][string]$Database,
    [string]$Username = "",
    [string]$Password = "",
    [switch]$IntegratedSecurity,
    [switch]$UpdateWebConfig,
    [switch]$UpdateWebConfigOnly
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sqlFile = Join-Path $scriptDir "Deploy_Somee_MainDB.sql"

if (-not $IntegratedSecurity -and ([string]::IsNullOrWhiteSpace($Username) -or [string]::IsNullOrWhiteSpace($Password))) {
    throw "Vui long truyen -Username va -Password (hoac dung -IntegratedSecurity khi test local)."
}

$rawConn = if ($IntegratedSecurity) {
    "data source=$Server;initial catalog=$Database;integrated security=True;trustservercertificate=True;MultipleActiveResultSets=True;App=EntityFramework"
} else {
    "data source=$Server;initial catalog=$Database;persist security info=True;user id=$Username;password=$Password;encrypt=False;trustservercertificate=True;MultipleActiveResultSets=True;App=EntityFramework"
}

if (-not $UpdateWebConfigOnly) {
    if (-not (Test-Path $sqlFile)) {
        throw "Khong tim thay file SQL: $sqlFile"
    }

    Write-Host "Dang doc script SQL (UTF-8)..." -ForegroundColor Cyan
    $sqlText = [System.IO.File]::ReadAllText($sqlFile, [System.Text.Encoding]::UTF8)
    $batches = [System.Text.RegularExpressions.Regex]::Split(
        $sqlText,
        '^\s*GO\s*$',
        [System.Text.RegularExpressions.RegexOptions]::Multiline -bor [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
    ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

    $deployConnStr = if ($IntegratedSecurity) {
        "Server=$Server;Database=$Database;Integrated Security=True;TrustServerCertificate=True;Connect Timeout=30;"
    } else {
        "Server=$Server;Database=$Database;User Id=$Username;Password=$Password;Encrypt=False;TrustServerCertificate=True;Connect Timeout=30;"
    }
    Write-Host "Dang ket noi toi $Server ($Database)..." -ForegroundColor Cyan

    $conn = New-Object System.Data.SqlClient.SqlConnection($deployConnStr)
    try {
        $conn.Open()
        $total = @($batches).Count
        $idx = 0
        foreach ($batch in $batches) {
            $idx++
            $cmd = $conn.CreateCommand()
            $cmd.CommandTimeout = 120
            $cmd.CommandText = $batch
            [void]$cmd.ExecuteNonQuery()
            $cmd.Dispose()
            if ($idx % 10 -eq 0 -or $idx -eq $total) {
                Write-Host ("  Da chay batch {0}/{1}" -f $idx, $total) -ForegroundColor DarkCyan
            }
        }
        Write-Host "Deploy database chinh (QuanLyLaoDongSinhVien) len Somee THANH CONG!" -ForegroundColor Green
    }
    finally {
        if ($conn.State -ne [System.Data.ConnectionState]::Closed) {
            $conn.Close()
        }
        $conn.Dispose()
    }
}

if ($UpdateWebConfig -or $UpdateWebConfigOnly) {
    $webConfigPath = Join-Path (Split-Path -Parent $scriptDir) "Web.config"
    [xml]$xml = Get-Content $webConfigPath -Encoding UTF8
    foreach ($node in $xml.configuration.connectionStrings.add) {
        if ($node.name -eq "DB_QLNLD4ROLEEntities" -or $node.name -eq "DB_QLNLD4ROLEEntities1") {
            $node.connectionString = "metadata=res://*/Models.QuanLyDangKyLaoDong.csdl|res://*/Models.QuanLyDangKyLaoDong.ssdl|res://*/Models.QuanLyDangKyLaoDong.msl;provider=System.Data.SqlClient;provider connection string=`"$rawConn`""
        }
        elseif ($node.name -eq "QuanLyAuditLogConnection") {
            $node.connectionString = "DISABLED"
        }
    }
    $xml.Save($webConfigPath)
    Write-Host "Da cap nhat Web.config tro ve Somee.com va tat QuanLyAuditLogConnection!" -ForegroundColor Green
}
