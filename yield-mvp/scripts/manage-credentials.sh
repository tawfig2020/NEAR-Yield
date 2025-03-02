#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Create secrets directory if it doesn't exist
mkdir -p secrets

# Function to rotate service account keys
rotate_key() {
    local sa_email=$1
    local key_name=$2
    
    echo "Rotating key for ${sa_email}..."
    
    # Create new key
    gcloud iam service-accounts keys create "./secrets/${key_name}-new.json" \
        --iam-account="${sa_email}"
    
    # If successful, remove old key
    if [ $? -eq 0 ]; then
        if [ -f "./secrets/${key_name}.json" ]; then
            # Get old key ID
            old_key_id=$(cat "./secrets/${key_name}.json" | jq -r .private_key_id)
            
            # Delete old key from GCP
            gcloud iam service-accounts keys delete "${old_key_id}" \
                --iam-account="${sa_email}" --quiet
            
            # Remove old key file
            rm "./secrets/${key_name}.json"
        fi
        
        # Move new key to final location
        mv "./secrets/${key_name}-new.json" "./secrets/${key_name}.json"
        
        echo "${GREEN}Successfully rotated key for ${sa_email}${NC}"
    else
        echo "${RED}Failed to create new key for ${sa_email}${NC}"
        rm -f "./secrets/${key_name}-new.json"
        exit 1
    fi
}

# Rotate keys
rotate_key "cloud-build-near@nearagents.iam.gserviceaccount.com" "cloud-build-key"
rotate_key "container-registry-near@nearagents.iam.gserviceaccount.com" "container-registry-key"

echo "${GREEN}Key rotation completed successfully${NC}"
echo "Remember to update your CI/CD systems with the new keys"
