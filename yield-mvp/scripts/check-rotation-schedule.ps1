$config = Get-Content 'C:\Users\Lenovo\CascadeProjects\NEAR Deep Yield\CascadeProjects\windsurf-project\yield-mvp\scripts\..\config\security-monitoring.yaml' | ConvertFrom-Yaml
$lastRotation = Get-Content (Join-Path 'C:\Users\Lenovo\CascadeProjects\NEAR Deep Yield\CascadeProjects\windsurf-project\yield-mvp\scripts\..\logs\security\key-rotation' 'last-rotation.txt')
$lastRotationDate = [DateTime]::Parse($lastRotation)
$nextRotation = $lastRotationDate.AddDays($config.securityMonitoring.key_rotation.frequency_days)
$daysUntilRotation = ($nextRotation - (Get-Date)).Days

if ($daysUntilRotation -le $config.securityMonitoring.key_rotation.notification_before_days) {
    $body = @{
        message = "Key rotation scheduled in $daysUntilRotation days"
        severity = "info"
        timestamp = Get-Date -Format "o"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri $config.securityMonitoring.alerts.channels.webhook.url 
        -Method Post -Body $body -ContentType "application/json"
}
