# Build stage
FROM node:20-alpine as build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Clean install dependencies
RUN npm cache clean --force && \
    npm install --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Create production build
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy build files from build stage
COPY --from=build /app/build ./build
COPY start.sh /app/start.sh

# Install serve and make start script executable
RUN npm install -g serve && \
    chmod +x /app/start.sh

# Expose port
EXPOSE 3001

# Start the application
CMD ["/app/start.sh"]
