# Stage 1: Build the frontend
FROM node:18 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Setup the backend (Production)
# We need a base image that supports both Node.js (for server) and Python (for gameplay logic)
FROM node:18-slim

# Install Python and minimal dependencies
RUN apt-get update && apt-get install -y python3 python3-pip && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Symlink python3 to python if not present (python-shell might expect 'python')
RUN ln -s /usr/bin/python3 /usr/bin/python

WORKDIR /app
COPY backend/package*.json ./
RUN npm install --only=production

# Copy backend code
COPY backend/ ./

# Copy built frontend assets from Stage 1 to backend/public
# The backend is configured to serve static files from ./public
COPY --from=frontend-builder /app/frontend/dist ./public

# Create temp execution directory
RUN mkdir -p temp_execution

# Expose the application port
EXPOSE 5001

# Start the server
CMD ["node", "server.js"]
