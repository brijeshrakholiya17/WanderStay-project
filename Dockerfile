# 1. Base Image: Use official Node 20 Alpine for minimal security footprint and small image size
FROM node:20-alpine

# 2. Set Working Directory inside the container workspace
WORKDIR /usr/src/app

# 3. Optimize Build Cache: Copy dependency definitions first
COPY package*.json ./

# 4. Install production dependencies deterministically
RUN npm ci --only=production

# 5. Copy the rest of the application source code
COPY . .

# 6. Expose the application port to the internal Docker network
EXPOSE 8080

# 7. Define non-root user for process execution (Security Best Practice)
USER node

# 8. Container Execution Command
CMD ["node", "app.js"]