# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY ml-requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r ml-requirements.txt

# Copy ML service code
COPY ./ml-service ./ml-service

# Create models directory
RUN mkdir -p /app/models

# Expose port for TensorFlow Serving
EXPOSE 8501

# Run the ML service
CMD ["python", "./ml-service/app.py"]
