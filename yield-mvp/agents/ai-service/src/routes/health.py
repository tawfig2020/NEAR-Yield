from fastapi import APIRouter, HTTPException
from typing import Dict
from datetime import datetime
import psutil
import asyncio
from ..database.db import db
from ..utils.logger import logger
from prometheus_client import Gauge, Counter, generate_latest

router = APIRouter()

# Prometheus metrics
SYSTEM_MEMORY = Gauge('system_memory_usage_bytes', 'System memory usage in bytes')
SYSTEM_CPU = Gauge('system_cpu_usage_percent', 'System CPU usage percentage')
DB_CONNECTIONS = Gauge('db_connections_total', 'Total number of database connections')
API_HEALTH_CHECK = Counter('api_health_check_total', 'Total number of health checks')

async def check_database() -> bool:
    """Check database connectivity."""
    try:
        await db.client.admin.command('ismaster')
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False

async def check_near_node() -> bool:
    """Check NEAR node connectivity."""
    try:
        # Add your NEAR node health check logic here
        return True
    except Exception as e:
        logger.error(f"NEAR node health check failed: {e}")
        return False

@router.get("/health")
async def health_check() -> Dict:
    """Basic health check endpoint."""
    API_HEALTH_CHECK.inc()
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/health/detailed")
async def detailed_health_check() -> Dict:
    """Detailed health check with system metrics."""
    try:
        # System metrics
        cpu_percent = psutil.cpu_percent()
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Update Prometheus metrics
        SYSTEM_MEMORY.set(memory.used)
        SYSTEM_CPU.set(cpu_percent)
        
        # Check various components
        db_status = await check_database()
        near_status = await check_near_node()
        
        return {
            "status": "healthy" if all([db_status, near_status]) else "degraded",
            "timestamp": datetime.utcnow().isoformat(),
            "system": {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "disk_percent": disk.percent
            },
            "components": {
                "database": "healthy" if db_status else "unhealthy",
                "near_node": "healthy" if near_status else "unhealthy"
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail="Health check failed")

@router.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint."""
    return generate_latest()
