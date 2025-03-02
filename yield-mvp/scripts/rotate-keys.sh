#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ID="nearagents"
REGION="asia-southeast1"

echo -e "${BLUE}🔄 Starting key rotation process...${NC}"

# Create secrets directory if it doesn't exist
mkdir -p secrets

# Function to encrypt service account key using Cloud KMS
encrypt_key() {
    local key_file=$1
    local encrypted_file="${key_file}.encrypted"
    
    gcloud kms encrypt \
        --location=$REGION \
        --keyring=near-yield-keyring \
        --key=near-yield-key \
        --plaintext-file=$key_file \
        --ciphertext-file=$encrypted_file \
        --project=$PROJECT_ID
        
    # Store encrypted file in Secret Manager
    gcloud secrets versions add "$(basename "$key_file" .json)" \
        --data-file=$encrypted_file \
        --project=$PROJECT_ID
        
    # Clean up files
    rm $encrypted_file
}

# Function to rotate service account key with backup
rotate_key() {
    local sa_email=$1
    local key_name=$2
    local timestamp=$(date +%Y%m%d_%H%M%S)
    
    echo -e "\n${BLUE}Rotating key for ${sa_email}...${NC}"
    
    # Backup existing key if it exists
    if [ -f "./secrets/${key_name}.json" ]; then
        echo "Creating backup of existing key..."
        cp "./secrets/${key_name}.json" "./secrets/backup/${key_name}_${timestamp}.json"
    fi
    
    # Create new key
    echo "Creating new key..."
    gcloud iam service-accounts keys create "./secrets/${key_name}-new.json" \
        --iam-account="${sa_email}"
    
    if [ $? -eq 0 ]; then
        # Encrypt and store new key
        echo "Encrypting and storing new key..."
        encrypt_key "./secrets/${key_name}-new.json"
        
        if [ -f "./secrets/${key_name}.json" ]; then
            # Get old key ID
            old_key_id=$(cat "./secrets/${key_name}.json" | jq -r .private_key_id)
            
            # Delete old key from GCP
            echo "Revoking old key..."
            gcloud iam service-accounts keys delete "${old_key_id}" \
                --iam-account="${sa_email}" --quiet
            
            # Move old key to backup
            mv "./secrets/${key_name}.json" "./secrets/backup/${key_name}_${timestamp}.json"
        fi
        
        # Move new key to final location
        mv "./secrets/${key_name}-new.json" "./secrets/${key_name}.json"
        
        echo -e "${GREEN}✅ Successfully rotated key for ${sa_email}${NC}"
    else
        echo -e "${RED}❌ Failed to create new key for ${sa_email}${NC}"
        exit 1
    fi
}

# Create backup directory
mkdir -p secrets/backup

# Rotate keys for each service account
echo -e "\n${BLUE}Starting key rotation process...${NC}"

rotate_key "cloud-build-near@${PROJECT_ID}.iam.gserviceaccount.com" "cloud-build-key"
rotate_key "container-registry-near@${PROJECT_ID}.iam.gserviceaccount.com" "container-registry-key"

# Update application configuration
echo -e "\n${BLUE}Updating application configuration...${NC}"

# Create or update .env file
cat << EOF > .env.new
GCP_PROJECT_ID=${PROJECT_ID}
GCP_REGION=${REGION}
GCP_CLOUD_BUILD_KEY_PATH=./secrets/cloud-build-key.json
GCP_CONTAINER_REGISTRY_KEY_PATH=./secrets/container-registry-key.json
EOF

# Merge with existing .env if it exists
if [ -f .env ]; then
    cat .env | grep -v "GCP_" >> .env.new
    mv .env.new .env
else
    mv .env.new .env
fi

echo -e "${GREEN}✅ Key rotation completed successfully!${NC}"
echo -e "\nNext steps:"
echo "1. Update any CI/CD systems with the new keys"
echo "2. Verify application functionality"
echo "3. Remove old key backups after verification"
echo "4. Schedule next key rotation (recommended: 90 days)"
