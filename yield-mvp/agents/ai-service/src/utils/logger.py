import logging
import logging_loki
from datetime import datetime
import os
from ..config import settings

def setup_logging():
    """Configure logging with both file and Loki handlers."""
    
    # Create logs directory if it doesn't exist
    log_dir = "logs"
    os.makedirs(log_dir, exist_ok=True)
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Set up root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(settings.LOG_LEVEL)
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # File handler - Rotating file handler
    from logging.handlers import RotatingFileHandler
    file_handler = RotatingFileHandler(
        filename=os.path.join(log_dir, 'app.log'),
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    file_handler.setFormatter(formatter)
    root_logger.addHandler(file_handler)
    
    # Loki handler for centralized logging (if configured)
    if hasattr(settings, 'LOKI_URL'):
        loki_handler = logging_loki.LokiHandler(
            url=settings.LOKI_URL,
            tags={"application": "near-deep-yield"},
            version="1",
        )
        loki_handler.setFormatter(formatter)
        root_logger.addHandler(loki_handler)
    
    # Set logging levels for specific modules
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    
    return root_logger

def log_error(logger, error, additional_info=None):
    """Enhanced error logging with context."""
    error_context = {
        "timestamp": datetime.utcnow().isoformat(),
        "error_type": type(error).__name__,
        "error_message": str(error),
        "additional_info": additional_info
    }
    logger.error(f"Error occurred: {error_context}")

# Create logger instance
logger = setup_logging()
