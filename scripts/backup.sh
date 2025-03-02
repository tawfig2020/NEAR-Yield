#!/bin/bash

# Configuration
BACKUP_DIR="/backups"
S3_BUCKET="near-deep-yield-backups"
INFLUX_BUCKET="near-deep-yield"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR/$TIMESTAMP"

# Backup InfluxDB
echo "Backing up InfluxDB..."
influx backup \
  --org your-org \
  --bucket "$INFLUX_BUCKET" \
  "$BACKUP_DIR/$TIMESTAMP/influxdb"

# Backup application state
echo "Backing up application state..."
tar -czf "$BACKUP_DIR/$TIMESTAMP/app_state.tar.gz" /app/data

# Upload to S3
echo "Uploading to S3..."
aws s3 sync "$BACKUP_DIR/$TIMESTAMP" "s3://$S3_BUCKET/$TIMESTAMP"

# Cleanup old backups
echo "Cleaning up old backups..."
find "$BACKUP_DIR" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} \;
aws s3 ls "s3://$S3_BUCKET" | \
  while read -r line; do
    createDate=$(echo "$line" | awk '{print $1}')
    if [[ $(date -d "$createDate" +%s) -lt $(date -d "-$RETENTION_DAYS days" +%s) ]]; then
      aws s3 rm "s3://$S3_BUCKET/$(echo "$line" | awk '{print $4}')"
    fi
  done

# Verify backup
echo "Verifying backup..."
aws s3 ls "s3://$S3_BUCKET/$TIMESTAMP" --recursive --human-readable

echo "Backup completed successfully!"
