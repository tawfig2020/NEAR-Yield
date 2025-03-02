# PowerShell script for security checks
param (
    [string]$ConfigPath = "..\config\security-monitoring.yaml"
)

# Import required modules
Import-Module powershell-yaml

# Load configuration
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$configAbsPath = Join-Path $scriptDir $ConfigPath
$config = Get-Content $configAbsPath | ConvertFrom-Yaml

# Setup logging
$logDir = Join-Path $PSScriptRoot "..\logs\security"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}
$logFile = Join-Path $logDir "check-$(Get-Date -Format 'yyyyMMdd').log"

function Write-Log {
    param($Message, $Severity = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$Severity] $timestamp - $Message" | Tee-Object -FilePath $logFile -Append
}

function Send-Alert {
    param($Message, $Severity)
    
    Write-Log $Message $Severity
    
    if ($config.securityMonitoring.alerts.channels.webhook.enabled) {
        try {
            $body = @{
                message = $Message
                severity = $Severity
                timestamp = Get-Date -Format "o"
                check_type = "security"
            } | ConvertTo-Json
            
            Invoke-RestMethod -Uri $config.securityMonitoring.alerts.channels.webhook.url `
                -Method Post -Body $body -ContentType "application/json"
        }
        catch {
            Write-Log "Failed to send webhook alert: $_" "ERROR"
        }
    }
}

function Test-KeyAge {
    Write-Log "Checking key age..." "INFO"
    
    $credentialsPath = Join-Path $env:USERPROFILE ".near-credentials"
    if (-not (Test-Path $credentialsPath)) {
        Send-Alert "NEAR credentials directory not found" "WARNING"
        return $false
    }
    
    try {
        $keyFiles = Get-ChildItem -Path $credentialsPath -Filter "*.json" -Recurse
        foreach ($file in $keyFiles) {
            $lastWrite = $file.LastWriteTime
            $daysSinceModified = (Get-Date) - $lastWrite
            
            if ($daysSinceModified.Days -gt $config.securityMonitoring.key_rotation.frequency_days) {
                Send-Alert "Key file $($file.Name) is older than $($config.securityMonitoring.key_rotation.frequency_days) days" "WARNING"
                return $false
            }
        }
        
        Write-Log "All keys are within age limits" "INFO"
        return $true
    }
    catch {
        Send-Alert "Error checking key age: $_" "ERROR"
        return $false
    }
}

function Test-ContractState {
    Write-Log "Checking contract state..." "INFO"
    
    try {
        # Get contract state using NEAR CLI
        $result = near view $config.contract.id get_state
        
        if ($result -match "error") {
            Send-Alert "Contract state check failed: $result" "ERROR"
            return $false
        }
        
        Write-Log "Contract state check passed" "INFO"
        return $true
    }
    catch {
        Send-Alert "Error checking contract state: $_" "ERROR"
        return $false
    }
}

function Test-AccessPatterns {
    Write-Log "Checking access patterns..." "INFO"
    
    try {
        $logs = Get-Content -Path $logFile -ErrorAction Stop
        $failedLogins = @{}
        
        foreach ($log in $logs) {
            if ($log -match "Failed login attempt from IP: (.+)") {
                $ip = $matches[1]
                $failedLogins[$ip] = if ($failedLogins.ContainsKey($ip)) { $failedLogins[$ip] + 1 } else { 1 }
                
                if ($failedLogins[$ip] -gt $config.securityMonitoring.intrusion_detection.max_failed_attempts) {
                    Send-Alert "Multiple failed login attempts detected from IP: $ip" "WARNING"
                    return $false
                }
            }
        }
        
        Write-Log "Access pattern check passed" "INFO"
        return $true
    }
    catch {
        Send-Alert "Error checking access patterns: $_" "ERROR"
        return $false
    }
}

# Run all security checks
Write-Log "Starting security checks..." "INFO"

$checks = @(
    @{ Name = "Key Age Check"; Function = { Test-KeyAge } },
    @{ Name = "Contract State Check"; Function = { Test-ContractState } },
    @{ Name = "Access Pattern Check"; Function = { Test-AccessPatterns } }
)

$allPassed = $true
foreach ($check in $checks) {
    Write-Log "Running $($check.Name)..." "INFO"
    if (-not (& $check.Function)) {
        $allPassed = $false
        Write-Log "$($check.Name) failed" "ERROR"
    }
    else {
        Write-Log "$($check.Name) passed" "INFO"
    }
}

if ($allPassed) {
    Write-Log "All security checks passed" "INFO"
    exit 0
}
else {
    Write-Log "Some security checks failed" "ERROR"
    exit 1
}
