import asyncio
import schedule
import time
import os
from datetime import datetime
import boto3
from botocore.exceptions import ClientError
import sys
import logging
from ..database.db import db
from ..config import settings
from ..utils.logger import logger

class BackupManager:
    def __init__(self):
        self.s3_client = boto3.client('s3')
        self.backup_bucket = settings.BACKUP_BUCKET
        self.backup_dir = "backups"
        os.makedirs(self.backup_dir, exist_ok=True)

    async def create_backup(self):
        """Create a database backup and upload to S3."""
        try:
            # Create local backup
            backup_path = await db.backup_database(self.backup_dir)
            
            # Upload to S3
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            s3_key = f"backups/near_deep_yield_{timestamp}.zip"
            
            # Create zip file
            import shutil
            zip_path = f"{backup_path}.zip"
            shutil.make_archive(backup_path, 'zip', backup_path)
            
            # Upload to S3
            self.s3_client.upload_file(zip_path, self.backup_bucket, s3_key)
            
            # Clean up local files
            shutil.rmtree(backup_path)
            os.remove(zip_path)
            
            logger.info(f"Backup successfully uploaded to S3: {s3_key}")
            
        except Exception as e:
            logger.error(f"Backup failed: {e}")
            raise

    async def restore_from_backup(self, backup_key: str):
        """Restore database from a specific S3 backup."""
        try:
            # Download from S3
            local_path = os.path.join(self.backup_dir, "temp_restore.zip")
            self.s3_client.download_file(self.backup_bucket, backup_key, local_path)
            
            # Extract zip
            import shutil
            extract_path = os.path.join(self.backup_dir, "temp_restore")
            shutil.unpack_archive(local_path, extract_path, 'zip')
            
            # Restore database
            await db.restore_database(extract_path)
            
            # Clean up
            shutil.rmtree(extract_path)
            os.remove(local_path)
            
            logger.info(f"Successfully restored from backup: {backup_key}")
            
        except Exception as e:
            logger.error(f"Restore failed: {e}")
            raise

    def list_backups(self):
        """List all available backups in S3."""
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.backup_bucket,
                Prefix="backups/"
            )
            return [obj['Key'] for obj in response.get('Contents', [])]
        except Exception as e:
            logger.error(f"Failed to list backups: {e}")
            raise

def schedule_backups():
    """Schedule regular backups."""
    backup_manager = BackupManager()
    
    # Schedule daily backup at 2 AM
    schedule.every().day.at("02:00").do(
        lambda: asyncio.run(backup_manager.create_backup())
    )
    
    while True:
        schedule.run_pending()
        time.sleep(60)

if __name__ == "__main__":
    schedule_backups()
