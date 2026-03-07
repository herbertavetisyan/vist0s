# Stage 1: Build the React Application using Vite
FROM node:22-alpine as build

WORKDIR /app

# Copy package configurations
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Serve the build artifact with Nginx
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy the static output build from the 'build' stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config (HTTP→HTTPS redirect + SSL termination)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP and HTTPS
EXPOSE 80 443

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
