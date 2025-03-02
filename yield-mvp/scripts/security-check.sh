#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ID="nearagents"
REGION="asia-southeast1"

echo -e "${BLUE}🔍 Starting security audit...${NC}"

# Function to check status
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Pass${NC}"
    else
        echo -e "${RED}✗ Fail${NC}"
        FAILURES=$((FAILURES+1))
    fi
}

# Initialize failure counter
FAILURES=0

# 1. Check API enablement
echo -e "\n${YELLOW}1. Checking required APIs...${NC}"
apis=(
    "cloudresourcemanager.googleapis.com"
    "cloudasset.googleapis.com"
    "cloudkms.googleapis.com"
    "monitoring.googleapis.com"
    "logging.googleapis.com"
    "secretmanager.googleapis.com"
    "vpcaccess.googleapis.com"
)

for api in "${apis[@]}"; do
    echo -n "Checking $api... "
    gcloud services list --enabled --filter="name:$api" --format="get(name)" | grep -q "$api"
    check_status
done

# 2. Check audit logging
echo -e "\n${YELLOW}2. Checking audit logging configuration...${NC}"
echo -n "Checking audit config... "
gcloud projects get-iam-policy $PROJECT_ID --format="get(auditConfigs)" | grep -q "allServices"
check_status

# 3. Check VPC configuration
echo -e "\n${YELLOW}3. Checking VPC configuration...${NC}"
echo -n "Checking near-yield-vpc... "
gcloud compute networks describe near-yield-vpc --project=$PROJECT_ID > /dev/null 2>&1
check_status

# 4. Check Cloud KMS
echo -e "\n${YELLOW}4. Checking Cloud KMS configuration...${NC}"
echo -n "Checking KMS keyring... "
gcloud kms keyrings describe near-yield-keyring --location=$REGION --project=$PROJECT_ID > /dev/null 2>&1
check_status

# 5. Check service accounts
echo -e "\n${YELLOW}5. Checking service accounts...${NC}"
service_accounts=(
    "cloud-build-near"
    "container-registry-near"
)

for sa in "${service_accounts[@]}"; do
    echo -n "Checking $sa... "
    gcloud iam service-accounts describe "$sa@$PROJECT_ID.iam.gserviceaccount.com" --project=$PROJECT_ID > /dev/null 2>&1
    check_status
done

# 6. Check key rotation
echo -e "\n${YELLOW}6. Checking service account keys...${NC}"
for sa in "${service_accounts[@]}"; do
    echo -n "Checking key age for $sa... "
    # Get the creation time of the oldest key
    oldest_key_date=$(gcloud iam service-accounts keys list \
        --iam-account="$sa@$PROJECT_ID.iam.gserviceaccount.com" \
        --project=$PROJECT_ID \
        --format="get(validAfterTime)" | sort | head -n 1)
    
    if [ ! -z "$oldest_key_date" ]; then
        # Calculate key age in days
        key_age=$(( ( $(date +%s) - $(date -d "$oldest_key_date" +%s) ) / 86400 ))
        if [ $key_age -gt 90 ]; then
            echo -e "${RED}✗ Key is $key_age days old (should be < 90 days)${NC}"
            FAILURES=$((FAILURES+1))
        else
            echo -e "${GREEN}✓ Key is $key_age days old${NC}"
        fi
    else
        echo -e "${RED}✗ No keys found${NC}"
        FAILURES=$((FAILURES+1))
    fi
done

# 7. Check Secret Manager
echo -e "\n${YELLOW}7. Checking Secret Manager configuration...${NC}"
required_secrets=(
    "NEAR_PRIVATE_KEY"
    "DATABASE_URL"
    "API_KEY"
    "CLOUD_BUILD_KEY"
    "CONTAINER_REGISTRY_KEY"
)

for secret in "${required_secrets[@]}"; do
    echo -n "Checking secret $secret... "
    gcloud secrets describe $secret --project=$PROJECT_ID > /dev/null 2>&1
    check_status
done

# 8. Check monitoring
echo -e "\n${YELLOW}8. Checking monitoring configuration...${NC}"
echo -n "Checking alert policies... "
gcloud alpha monitoring policies list --project=$PROJECT_ID | grep -q "Security Alert Policy"
check_status

# Final summary
echo -e "\n${BLUE}Security Audit Summary:${NC}"
if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}✅ All security checks passed!${NC}"
else
    echo -e "${RED}❌ Found $FAILURES security issues that need attention${NC}"
fi

# Recommendations
echo -e "\n${YELLOW}Recommendations:${NC}"
echo "1. Regular key rotation (every 90 days)"
echo "2. Review IAM permissions regularly"
echo "3. Enable VPC Service Controls"
echo "4. Set up additional alert policies"
echo "5. Configure backup and recovery procedures"
