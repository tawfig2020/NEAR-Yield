# PowerShell script for setting up GCP security

# Variables
$PROJECT_ID = "nearagents"
$REGION = "asia-southeast1"

Write-Host "🔒 Setting up comprehensive GCP security measures..." -ForegroundColor Blue

# 1. Enable required APIs
Write-Host "`n1. Enabling required APIs..." -ForegroundColor Blue
$apis = @(
    "cloudresourcemanager.googleapis.com",
    "cloudasset.googleapis.com",
    "cloudkms.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
    "secretmanager.googleapis.com",
    "vpcaccess.googleapis.com"
)

foreach ($api in $apis) {
    Write-Host "Enabling $api..."
    gcloud services enable $api --project=$PROJECT_ID
}

# 2. Set up audit logging
Write-Host "`n2. Setting up audit logging..." -ForegroundColor Blue
$auditPolicy = @"
auditConfigs:
- auditLogConfigs:
  - logType: ADMIN_READ
  - logType: DATA_READ
  - logType: DATA_WRITE
  service: allServices
"@
$auditPolicy | Out-File -FilePath "audit-policy.yaml"
gcloud projects get-iam-policy $PROJECT_ID --format=yaml | Add-Content -Path "audit-policy.yaml"
gcloud projects set-iam-policy $PROJECT_ID audit-policy.yaml

# 3. Create VPC for secure networking
Write-Host "`n3. Setting up VPC network..." -ForegroundColor Blue
gcloud compute networks create near-yield-vpc `
    --project=$PROJECT_ID `
    --subnet-mode=custom `
    --mtu=1460 `
    --bgp-routing-mode=regional

# Create subnet
gcloud compute networks subnets create near-yield-subnet `
    --project=$PROJECT_ID `
    --range=10.0.0.0/24 `
    --network=near-yield-vpc `
    --region=$REGION

# 4. Set up Cloud KMS
Write-Host "`n4. Setting up Cloud KMS..." -ForegroundColor Blue
gcloud kms keyrings create near-yield-keyring `
    --location=$REGION `
    --project=$PROJECT_ID

gcloud kms keys create near-yield-key `
    --location=$REGION `
    --keyring=near-yield-keyring `
    --purpose=encryption `
    --project=$PROJECT_ID

# 5. Create secure service accounts
Write-Host "`n5. Setting up service accounts..." -ForegroundColor Blue

# Cloud Build service account
gcloud iam service-accounts create cloud-build-near `
    --display-name="NEAR Yield Cloud Build Service Account" `
    --project=$PROJECT_ID

# Container Registry service account
gcloud iam service-accounts create container-registry-near `
    --display-name="NEAR Yield Container Registry Service Account" `
    --project=$PROJECT_ID

# Set minimal IAM roles
gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:cloud-build-near@$PROJECT_ID.iam.gserviceaccount.com" `
    --role="roles/cloudbuild.builds.builder"

gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:container-registry-near@$PROJECT_ID.iam.gserviceaccount.com" `
    --role="roles/storage.objectViewer"

# 6. Set up secrets in Secret Manager
Write-Host "`n6. Setting up Secret Manager..." -ForegroundColor Blue
$secrets = @(
    "NEAR_PRIVATE_KEY",
    "DATABASE_URL",
    "API_KEY",
    "CLOUD_BUILD_KEY",
    "CONTAINER_REGISTRY_KEY"
)

foreach ($secret in $secrets) {
    Write-Host "Creating secret: $secret"
    gcloud secrets create $secret `
        --replication-policy="automatic" `
        --project=$PROJECT_ID
}

# 7. Set up monitoring and alerting
Write-Host "`n7. Setting up monitoring and alerting..." -ForegroundColor Blue
$alertPolicy = @"
{
  "displayName": "Security Alert Policy",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "IAM Policy Changes",
      "conditionThreshold": {
        "filter": "resource.type=\"project\" AND protoPayload.methodName=\"SetIamPolicy\"",
        "comparison": "COMPARISON_GT",
        "threshold": 0,
        "duration": "0s"
      }
    }
  ],
  "notificationChannels": []
}
"@
$alertPolicy | Out-File -FilePath "alert-policy.json"
gcloud alpha monitoring policies create --project=$PROJECT_ID alert-policy.json

Write-Host "`n✅ Security setup completed successfully!" -ForegroundColor Green
Write-Host "`nNext steps:"
Write-Host "1. Review and customize the organization policies"
Write-Host "2. Set up notification channels for alerts"
Write-Host "3. Configure VPC Service Controls"
Write-Host "4. Run the key rotation script"

# Cleanup
Remove-Item -Path "audit-policy.yaml" -ErrorAction SilentlyContinue
Remove-Item -Path "alert-policy.json" -ErrorAction SilentlyContinue
