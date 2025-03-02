# PowerShell script to start the workflow manager

# Set environment variables
$env:NETWORK_ID = "testnet"
$env:CONTRACT_NAME = "safety-proxy.tawfig2030ai.testnet"
$env:ACCOUNT_ID = "tawfig2030ai.testnet"

# Create required directories
New-Item -ItemType Directory -Force -Path "$PSScriptRoot\logs"
New-Item -ItemType Directory -Force -Path "$PSScriptRoot\data"

Write-Host "Starting NEAR Yield Platform..." -ForegroundColor Blue

# Start the workflow manager
Write-Host "Starting Workflow Manager..." -ForegroundColor Blue
Set-Location -Path "$PSScriptRoot\..\services\workflow-manager"
npm start

# Trap Ctrl+C to gracefully shutdown services
$null = Register-ObjectEvent -InputObject ([System.Console]) -EventName CancelKeyPress -Action {
    Write-Host "`nShutting down services..." -ForegroundColor Yellow
    Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
    Write-Host "Services stopped successfully" -ForegroundColor Green
    exit 0
}

# Keep the script running
while ($true) {
    Start-Sleep -Seconds 1
}
