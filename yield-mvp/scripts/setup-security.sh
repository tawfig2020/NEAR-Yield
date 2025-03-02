#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ID="nearagents"
REGION="asia-southeast1"

echo -e "${BLUE}🔒 Setting up comprehensive GCP security measures...${NC}"

# 1. Enable required APIs
echo -e "\n${BLUE}1. Enabling required APIs...${NC}"
apis=(
    "cloudresourcemanager.googleapis.com"    # For IAM and organization policies
    "cloudasset.googleapis.com"              # For security controls
    "cloudkms.googleapis.com"                # For key management
    "monitoring.googleapis.com"              # For monitoring
    "logging.googleapis.com"                 # For audit logging
    "secretmanager.googleapis.com"           # For secrets management
    "vpcaccess.googleapis.com"              # For VPC controls
)

for api in "${apis[@]}"; do
    echo "Enabling $api..."
    gcloud services enable $api --project=$PROJECT_ID
done

# 2. Set up audit logging
echo -e "\n${BLUE}2. Setting up audit logging...${NC}"
gcloud projects get-iam-policy $PROJECT_ID > policy.yaml
cat << EOF >> policy.yaml
auditConfigs:
- auditLogConfigs:
  - logType: ADMIN_READ
  - logType: DATA_READ
  - logType: DATA_WRITE
  service: allServices
EOF
gcloud projects set-iam-policy $PROJECT_ID policy.yaml

# 3. Create VPC for secure networking
echo -e "\n${BLUE}3. Setting up VPC network...${NC}"
gcloud compute networks create near-yield-vpc \
    --project=$PROJECT_ID \
    --subnet-mode=custom \
    --mtu=1460 \
    --bgp-routing-mode=regional

# Create subnet
gcloud compute networks subnets create near-yield-subnet \
    --project=$PROJECT_ID \
    --range=10.0.0.0/24 \
    --network=near-yield-vpc \
    --region=$REGION

# 4. Set up Cloud KMS for key encryption
echo -e "\n${BLUE}4. Setting up Cloud KMS...${NC}"
gcloud kms keyrings create near-yield-keyring \
    --location=$REGION \
    --project=$PROJECT_ID

gcloud kms keys create near-yield-key \
    --location=$REGION \
    --keyring=near-yield-keyring \
    --purpose=encryption \
    --project=$PROJECT_ID

# 5. Create secure service accounts with minimal permissions
echo -e "\n${BLUE}5. Setting up service accounts with minimal permissions...${NC}"

# Cloud Build service account
gcloud iam service-accounts create cloud-build-near \
    --display-name="NEAR Yield Cloud Build Service Account" \
    --project=$PROJECT_ID

# Container Registry service account
gcloud iam service-accounts create container-registry-near \
    --display-name="NEAR Yield Container Registry Service Account" \
    --project=$PROJECT_ID

# Set minimal IAM roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:cloud-build-near@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudbuild.builds.builder"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:container-registry-near@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.objectViewer"

# 6. Set up organization policies
echo -e "\n${BLUE}6. Setting up organization policies...${NC}"
cat << EOF > org-policies.yaml
constraints:
  - name: compute.requireOsLogin
    booleanPolicy:
      enforced: true
  - name: compute.disableSerialPortAccess
    booleanPolicy:
      enforced: true
  - name: compute.requireShieldedVm
    booleanPolicy:
      enforced: true
  - name: iam.disableServiceAccountKeyCreation
    booleanPolicy:
      enforced: false
EOF

# 7. Set up secrets in Secret Manager
echo -e "\n${BLUE}7. Setting up Secret Manager...${NC}"
echo "Setting up secrets..."
secrets=(
    "NEAR_PRIVATE_KEY"
    "DATABASE_URL"
    "API_KEY"
    "CLOUD_BUILD_KEY"
    "CONTAINER_REGISTRY_KEY"
)

for secret in "${secrets[@]}"; do
    gcloud secrets create $secret \
        --replication-policy="automatic" \
        --project=$PROJECT_ID
done

# 8. Set up monitoring and alerting
echo -e "\n${BLUE}8. Setting up monitoring and alerting...${NC}"
cat << EOF > alert-policy.json
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
EOF

gcloud alpha monitoring policies create --project=$PROJECT_ID alert-policy.json

echo -e "\n${GREEN}✅ Security setup completed successfully!${NC}"
echo -e "\nNext steps:"
echo "1. Review and customize the organization policies"
echo "2. Set up notification channels for alerts"
echo "3. Configure VPC Service Controls"
echo "4. Run the key rotation script"
