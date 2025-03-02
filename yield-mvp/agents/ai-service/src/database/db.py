from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
import gridfs
from ..config import settings
import logging
import asyncio
from datetime import datetime
import json
import os

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    backup_client: MongoClient = None
    
    def __init__(self):
        self.db_name = settings.DATABASE_NAME
        self.collections = {
            'sentiment_analysis': 'sentiment_analysis',
            'strategy_performance': 'strategy_performance',
            'user_preferences': 'user_preferences',
            'system_metrics': 'system_metrics'
        }

    async def connect(self):
        """Connect to MongoDB."""
        try:
            self.client = AsyncIOMotorClient(settings.MONGODB_URL)
            self.backup_client = MongoClient(settings.MONGODB_URL)
            
            # Verify connection
            await self.client.admin.command('ismaster')
            logger.info("Connected to MongoDB.")
            
            # Initialize GridFS for file storage
            self.fs = gridfs.GridFS(self.backup_client[self.db_name])
            
            # Create indexes
            await self.create_indexes()
            
        except Exception as e:
            logger.error(f"Could not connect to MongoDB: {e}")
            raise

    async def create_indexes(self):
        """Create necessary indexes."""
        try:
            db = self.client[self.db_name]
            
            # Sentiment analysis indexes
            await db[self.collections['sentiment_analysis']].create_index([
                ("timestamp", -1),
                ("user", 1)
            ])
            
            # Strategy performance indexes
            await db[self.collections['strategy_performance']].create_index([
                ("strategy_id", 1),
                ("timestamp", -1)
            ])
            
            # System metrics indexes
            await db[self.collections['system_metrics']].create_index([
                ("metric_name", 1),
                ("timestamp", -1)
            ])
            
            logger.info("Database indexes created successfully")
        except Exception as e:
            logger.error(f"Error creating indexes: {e}")
            raise

    async def backup_database(self, backup_dir: str = "backups"):
        """Create a backup of the database."""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = os.path.join(backup_dir, f"backup_{timestamp}")
            os.makedirs(backup_path, exist_ok=True)

            # Backup each collection
            for collection_name in self.collections.values():
                collection_data = []
                async for document in self.client[self.db_name][collection_name].find():
                    collection_data.append(document)

                with open(os.path.join(backup_path, f"{collection_name}.json"), 'w') as f:
                    json.dump(collection_data, f)

            logger.info(f"Database backup created at {backup_path}")
            return backup_path
        except Exception as e:
            logger.error(f"Backup failed: {e}")
            raise

    async def restore_database(self, backup_path: str):
        """Restore database from backup."""
        try:
            # Clear existing data
            for collection_name in self.collections.values():
                await self.client[self.db_name][collection_name].delete_many({})

            # Restore from backup files
            for collection_name in self.collections.values():
                backup_file = os.path.join(backup_path, f"{collection_name}.json")
                if os.path.exists(backup_file):
                    with open(backup_file, 'r') as f:
                        documents = json.load(f)
                        if documents:
                            await self.client[self.db_name][collection_name].insert_many(documents)

            logger.info(f"Database restored from {backup_path}")
        except Exception as e:
            logger.error(f"Restore failed: {e}")
            raise

    async def close(self):
        """Close database connections."""
        if self.client:
            self.client.close()
        if self.backup_client:
            self.backup_client.close()
        logger.info("Database connections closed.")

# Create global database instance
db = Database()
