# PowerShell script to set up scheduled security tasks
param (
    [string]$ConfigPath = "..\config\security-monitoring.yaml"
)

# Import required modules
Import-Module powershell-yaml

# Get the absolute path to the config file
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$configAbsPath = Join-Path $scriptDir $ConfigPath

# Load configuration
Write-Host "Loading configuration from: $configAbsPath"
$config = Get-Content $configAbsPath | ConvertFrom-Yaml

# Setup logging
$logDir = Join-Path $PSScriptRoot "..\logs\security"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

function Write-Log {
    param($Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Tee-Object -FilePath "$logDir\setup.log" -Append
}

# Create the security check task
Write-Log "Setting up security check scheduled task..."
$securityCheckAction = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$PSScriptRoot\security-check.ps1`"" `
    -WorkingDirectory $PSScriptRoot

$securityCheckTrigger = New-ScheduledTaskTrigger `
    -Once `
    -At (Get-Date) `
    -RepetitionInterval (New-TimeSpan -Minutes $config.securityMonitoring.intrusion_detection.scan_frequency_minutes)

$securityCheckSettings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable

Register-ScheduledTask `
    -TaskName "NEARYieldSecurityCheck" `
    -Action $securityCheckAction `
    -Trigger $securityCheckTrigger `
    -Settings $securityCheckSettings `
    -Description "Regular security checks for NEAR Yield platform"

Write-Log "Security check task created successfully"

# Create the key rotation task
Write-Log "Setting up key rotation scheduled task..."
$keyRotationAction = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$PSScriptRoot\rotate-keys.ps1`"" `
    -WorkingDirectory $PSScriptRoot

$keyRotationTrigger = New-ScheduledTaskTrigger `
    -Daily `
    -At "00:00" `
    -DaysInterval $config.securityMonitoring.key_rotation.frequency_days

$keyRotationSettings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable

Register-ScheduledTask `
    -TaskName "NEARYieldKeyRotation" `
    -Action $keyRotationAction `
    -Trigger $keyRotationTrigger `
    -Settings $keyRotationSettings `
    -Description "Automated key rotation for NEAR Yield platform"

Write-Log "Key rotation task created successfully"

# Create email notification task for upcoming key rotations
Write-Log "Setting up key rotation notification task..."
$notificationScript = @"
`$config = Get-Content '$configAbsPath' | ConvertFrom-Yaml
`$lastRotation = Get-Content (Join-Path '$logDir\key-rotation' 'last-rotation.txt')
`$lastRotationDate = [DateTime]::Parse(`$lastRotation)
`$nextRotation = `$lastRotationDate.AddDays(`$config.securityMonitoring.key_rotation.frequency_days)
`$daysUntilRotation = (`$nextRotation - (Get-Date)).Days

if (`$daysUntilRotation -le `$config.securityMonitoring.key_rotation.notification_before_days) {
    `$body = @{
        message = "Key rotation scheduled in `$daysUntilRotation days"
        severity = "info"
        timestamp = Get-Date -Format "o"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri `$config.securityMonitoring.alerts.channels.webhook.url `
        -Method Post -Body `$body -ContentType "application/json"
}
"@

$notificationScriptPath = Join-Path $PSScriptRoot "check-rotation-schedule.ps1"
$notificationScript | Set-Content $notificationScriptPath

$notificationAction = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$notificationScriptPath`"" `
    -WorkingDirectory $PSScriptRoot

$notificationTrigger = New-ScheduledTaskTrigger `
    -Daily `
    -At "09:00"

$notificationSettings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable

Register-ScheduledTask `
    -TaskName "NEARYieldKeyRotationNotification" `
    -Action $notificationAction `
    -Trigger $notificationTrigger `
    -Settings $notificationSettings `
    -Description "Key rotation notification for NEAR Yield platform"

Write-Log "Key rotation notification task created successfully"

Write-Log "All security tasks have been set up successfully"

# Display task status
Write-Host "`nCreated scheduled tasks:"
Get-ScheduledTask -TaskName "NEARYield*" | Format-Table TaskName, State, LastRunTime, NextRunTime

Write-Host "`nSecurity monitoring is now active. Check the logs at $logDir for details."
