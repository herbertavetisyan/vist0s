FROM node:22-alpine

WORKDIR /usr/src/app

# Install dependencies needed for node-gyp and Prisma
RUN apk add --no-cache python3 make g++ openssl openssl-dev

# Copy package files
COPY package*.json ./

# Install app dependencies
RUN npm ci

# Copy prisma schema specifically first, then generate the client
# This ensures that Prisma engine is built for the alpine target layer
COPY prisma ./prisma/
RUN npx prisma generate

# Copy application source code
COPY . .

# Expose port
EXPOSE 5000

# Setup a script to run migrations automatically before starting the server
# This script will wait for PostgreSQL if it's orchestrated via docker-compose
RUN echo '#!/bin/sh' > /usr/src/app/start.sh && \
    echo 'echo "Running Prisma migrations..."' >> /usr/src/app/start.sh && \
    echo 'npx prisma migrate deploy' >> /usr/src/app/start.sh && \
    echo 'echo "Starting Node.js application..."' >> /usr/src/app/start.sh && \
    echo 'node src/app.js' >> /usr/src/app/start.sh && \
    chmod +x /usr/src/app/start.sh

# Run the startup script
CMD ["/usr/src/app/start.sh"]
