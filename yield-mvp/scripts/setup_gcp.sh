#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 Starting GCP API setup..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "${RED}❌ gcloud CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo "${RED}❌ Not authenticated with GCP. Please run 'gcloud auth login' first.${NC}"
    exit 1
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    echo "${RED}❌ No project ID set. Please run 'gcloud config set project YOUR_PROJECT_ID' first.${NC}"
    exit 1
fi

echo "📦 Enabling required APIs..."

# Enable APIs
apis=(
    "cloudbuild.googleapis.com"
    "containerregistry.googleapis.com"
    "run.googleapis.com"
    "secretmanager.googleapis.com"
)

for api in "${apis[@]}"; do
    echo "Enabling $api..."
    gcloud services enable $api
done

echo "🔑 Creating service account..."

# Create service account
SA_NAME="near-yield-service"
SA_EMAIL="$SA_NAME@$PROJECT_ID.iam.service-account.com"

gcloud iam service-accounts create $SA_NAME \
    --description="Service account for NEAR Yield platform" \
    --display-name="NEAR Yield Service Account"

# Grant necessary roles
roles=(
    "roles/run.invoker"
    "roles/secretmanager.secretAccessor"
    "roles/storage.objectViewer"
)

for role in "${roles[@]}"; do
    echo "Granting $role to service account..."
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SA_EMAIL" \
        --role="$role"
done

# Create service account key
echo "Creating service account key..."
gcloud iam service-accounts keys create service-account-key.json \
    --iam-account=$SA_EMAIL

echo "${GREEN}✅ GCP setup completed successfully!${NC}"
echo "
Next steps:
1. Move service-account-key.json to a secure location
2. Update your .env file with the following values:
   GCP_PROJECT_ID=$PROJECT_ID
   GCP_SERVICE_ACCOUNT_KEY=path/to/service-account-key.json
3. Run the API tests using: cargo run --bin api_tests
"
