# PowerShell script for testing security features
using module Pester

param (
    [string]$ConfigPath = "..\..\config\security-monitoring.yaml"
)

BeforeAll {
    # Import required modules
    Import-Module powershell-yaml
    
    # Load configuration
    $script:config = Get-Content $ConfigPath | ConvertFrom-Yaml
    
    # Import security scripts
    . "..\security-check.ps1"
    . "..\rotate-keys.ps1"
}

Describe "Security Configuration Tests" {
    It "Has valid security monitoring configuration" {
        $config.securityMonitoring | Should -Not -BeNullOrEmpty
        $config.securityMonitoring.key_rotation | Should -Not -BeNullOrEmpty
        $config.securityMonitoring.intrusion_detection | Should -Not -BeNullOrEmpty
        $config.securityMonitoring.alerts | Should -Not -BeNullOrEmpty
    }
    
    It "Has valid key rotation settings" {
        $config.securityMonitoring.key_rotation.frequency_days | Should -BeGreaterThan 0
        $config.securityMonitoring.key_rotation.notification_before_days | Should -BeGreaterThan 0
        $config.securityMonitoring.key_rotation.backup_enabled | Should -Be $true
    }
    
    It "Has valid intrusion detection settings" {
        $config.securityMonitoring.intrusion_detection.scan_frequency_minutes | Should -BeGreaterThan 0
        $config.securityMonitoring.intrusion_detection.max_failed_attempts | Should -BeGreaterThan 0
        $config.securityMonitoring.intrusion_detection.suspicious_patterns.Count | Should -BeGreaterThan 0
    }
}

Describe "Security Check Tests" {
    BeforeAll {
        # Create mock functions
        function Test-KeyAge { return $true }
        function Test-ContractState { return $true }
        function Test-TransactionLimits { return $true }
        function Test-AccessPatterns { return $true }
    }
    
    It "Can send alerts" {
        { Send-Alert -Message "Test alert" -Severity "info" } | Should -Not -Throw
    }
    
    It "Can write logs" {
        { Write-Log -Message "Test log" -Severity "INFO" } | Should -Not -Throw
    }
}

Describe "Key Rotation Tests" {
    BeforeAll {
        $testBackupDir = "TestDrive:\backup"
        New-Item -ItemType Directory -Path $testBackupDir -Force
    }
    
    It "Can create backups" {
        { Backup-Keys -BackupDir $testBackupDir } | Should -Not -Throw
    }
    
    It "Validates rotation schedule" {
        $lastRotation = Get-Date
        $nextRotation = $lastRotation.AddDays($config.securityMonitoring.key_rotation.frequency_days)
        $daysUntilRotation = ($nextRotation - (Get-Date)).Days
        
        $daysUntilRotation | Should -BeGreaterOrEqual 0
        $daysUntilRotation | Should -BeLessOrEqual $config.securityMonitoring.key_rotation.frequency_days
    }
}

Describe "Scheduled Task Tests" {
    It "Has security check task registered" {
        $task = Get-ScheduledTask -TaskName "NEARYieldSecurityCheck" -ErrorAction SilentlyContinue
        $task | Should -Not -BeNullOrEmpty
        $task.State | Should -Be "Ready"
    }
    
    It "Has key rotation task registered" {
        $task = Get-ScheduledTask -TaskName "NEARYieldKeyRotation" -ErrorAction SilentlyContinue
        $task | Should -Not -BeNullOrEmpty
        $task.State | Should -Be "Ready"
    }
    
    It "Has key rotation notification task registered" {
        $task = Get-ScheduledTask -TaskName "NEARYieldKeyRotationNotification" -ErrorAction SilentlyContinue
        $task | Should -Not -BeNullOrEmpty
        $task.State | Should -Be "Ready"
    }
}
