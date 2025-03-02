# PowerShell script for key rotation
param (
    [string]$ConfigPath = "..\config\security-monitoring.yaml",
    [switch]$Force
)

# Import required modules
Import-Module powershell-yaml

# Load configuration
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$configAbsPath = Join-Path $scriptDir $ConfigPath
$config = Get-Content $configAbsPath | ConvertFrom-Yaml

# Setup logging
$logDir = Join-Path $PSScriptRoot "..\logs\security\key-rotation"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}
$logFile = Join-Path $logDir "rotation-$(Get-Date -Format 'yyyyMMdd').log"

function Write-Log {
    param($Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Tee-Object -FilePath $logFile -Append
}

function Send-Alert {
    param($Message, $Severity)
    
    Write-Log $Message
    
    if ($config.securityMonitoring.alerts.channels.webhook.enabled) {
        try {
            $body = @{
                message = $Message
                severity = $Severity
                timestamp = Get-Date -Format "o"
                check_type = "key_rotation"
            } | ConvertTo-Json
            
            Invoke-RestMethod -Uri $config.securityMonitoring.alerts.channels.webhook.url `
                -Method Post -Body $body -ContentType "application/json"
        }
        catch {
            Write-Log "Failed to send webhook alert: $_"
        }
    }
    
    if ($config.securityMonitoring.alerts.channels.email.enabled) {
        foreach ($recipient in $config.securityMonitoring.alerts.channels.email.recipients) {
            Write-Log "Would send email to $($recipient): $Message"
        }
    }
}

function Backup-Keys {
    param($BackupDir)
    
    Write-Log "Starting key backup..."
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupPath = Join-Path $BackupDir "keys_backup_$timestamp"
    
    try {
        # Create backup directory
        New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
        
        # Backup NEAR credentials
        $credentialsPath = Join-Path $env:USERPROFILE ".near-credentials"
        if (Test-Path $credentialsPath) {
            Copy-Item -Path $credentialsPath -Destination $backupPath -Recurse
            Write-Log "Successfully backed up NEAR credentials"
        }
        
        # Backup encrypted keys
        $encryptedPath = Join-Path $env:USERPROFILE ".near-credentials-encrypted"
        if (Test-Path $encryptedPath) {
            Copy-Item -Path $encryptedPath -Destination $backupPath -Recurse
            Write-Log "Successfully backed up encrypted keys"
        }
        
        Write-Log "Key backup completed successfully"
        return $true
    }
    catch {
        Write-Log "Failed to backup keys: $_"
        return $false
    }
}

function Rotate-NearKeys {
    Write-Log "Starting NEAR key rotation..."
    
    try {
        # Get list of accounts
        $credentialsPath = Join-Path $env:USERPROFILE ".near-credentials"
        $accounts = Get-ChildItem -Path $credentialsPath -Filter "*.json" -Recurse
        
        foreach ($account in $accounts) {
            $accountName = $account.BaseName
            Write-Log "Rotating keys for account: $accountName"
            
            # Generate new key pair
            $result = near generate-key $accountName --force
            if ($LASTEXITCODE -ne 0) {
                Write-Log "Failed to generate new key for $accountName"
                return $false
            }
            
            Write-Log "Successfully rotated keys for $accountName"
        }
        
        Write-Log "Key rotation completed successfully"
        return $true
    }
    catch {
        Write-Log "Failed to rotate NEAR keys: $_"
        return $false
    }
}

# Check if key rotation is needed
$lastRotationFile = Join-Path $logDir "last-rotation.txt"
$forceRotation = $Force.IsPresent

if (Test-Path $lastRotationFile) {
    $lastRotation = Get-Content $lastRotationFile | Get-Date
    $daysSinceRotation = ((Get-Date) - $lastRotation).Days
    
    if ($daysSinceRotation -lt $config.securityMonitoring.key_rotation.frequency_days -and -not $forceRotation) {
        Write-Log "Key rotation not needed yet. Last rotation was $daysSinceRotation days ago."
        exit 0
    }
}

# Create backup directory if it doesn't exist
$backupDir = Join-Path $PSScriptRoot $config.securityMonitoring.key_rotation.backup_location
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

# Perform key rotation
Write-Log "Starting key rotation process..."

if (-not (Backup-Keys -BackupDir $backupDir)) {
    Send-Alert "Key backup failed, aborting rotation" "ERROR"
    exit 1
}

if (-not (Rotate-NearKeys)) {
    Send-Alert "Key rotation failed" "ERROR"
    exit 1
}

# Update last rotation timestamp
Get-Date | Out-File $lastRotationFile -Force

Send-Alert "Key rotation completed successfully" "INFO"
Write-Log "Key rotation process completed"
exit 0
