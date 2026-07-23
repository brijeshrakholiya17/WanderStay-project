# 🐳 Docker Master Guide: WanderStay Production-Grade Local Environment

Welcome to the definitive Dockerization guide for **WanderStay**. This guide is crafted to transition your Node.js/Express + MongoDB application from a host-dependent local setup into a production-grade, containerized micro-architecture.

---

## 📊 Codebase Analysis Summary

Before writing container configurations, here is the architectural blueprint of the WanderStay application derived from the codebase:

* **Node.js Runtime & Engine**: `v20.11.1` (specified in [package.json](file:///d:/web%20development/my%20projects/WanderStay-Rental%20Booking%20Website/package.json#L3))
* **Application Entry Point**: [app.js](file:///d:/web%20development/my%20projects/WanderStay-Rental%20Booking%20Website/app.js) (launched via `node app.js` / `npm start`)
* **Application Web Port**: Defaulting to `8080` (configured via `process.env.PORT || 8080` in [app.js](file:///d:/web%20development/my%20projects/WanderStay-Rental%20Booking%20Website/app.js#L134))
* **Database & Session Layer**:
  * MongoDB Connection via Mongoose ([app.js:L51](file:///d:/web%20development/my%20projects/WanderStay-Rental%20Booking%20Website/app.js#L51))
  * Express Sessions stored in MongoDB via `connect-mongo` ([app.js:L58-L64](file:///d:/web%20development/my%20projects/WanderStay-Rental%20Booking%20Website/app.js#L58-L64))
* **Environment Variables Detected**:
  | Variable | Purpose in WanderStay | Container Strategy |
  | :--- | :--- | :--- |
  | `ATLASDB_URL` | MongoDB Connection String (Mongoose & `connect-mongo`) | Overridden in Docker Compose to target local MongoDB container (`mongodb://mongo:27017/wanderstay`) |
  | `PORT` | HTTP Server Listening Port | Set to `8080` and mapped via Docker container ports |
  | `SECRET` | Express Session Cryptographic Secret | Passed via environment / `.env` file |
  | `CLOUD_NAME`, `CLOUD_API_KEY`, `CLOUD_API_SECRET` | Cloudinary Storage API Credentials | Passed securely through environment variables |
  | `GEMINI_API_KEY` | Google Gemini AI Service integration | Passed securely through environment variables |
  | `OPENCAGE_API_KEY` | OpenCage Geocoding API integration | Passed securely through environment variables |

---

## 🐋 Step 1: The Dockerfile (Node.js Application)

Below is the optimized, multi-stage-inspired production-ready `Dockerfile` for the WanderStay web application.

```dockerfile
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
```

### 💡 Deep Dive: Layering & Build Cache Optimization

Docker builds images using an **layered filesystem** (UnionFS). Each instruction in a `Dockerfile` creates a read-only layer. Docker caches these layers during compilation. If a layer's inputs do not change, Docker reuses the cached layer, resulting in near-instant build times.

#### Why Copy `package*.json` Before Source Code?

```dockerfile
# BAD PATTERN (Invalidates cache on every single code edit):
COPY . .
RUN npm install

# OPTIMIZED PATTERN (Utilizes Docker Layer Caching):
COPY package*.json ./
RUN npm ci --only=production
COPY . .
```

1. **Dependency Installation is Slow**: `npm install` or `npm ci` parses dependencies, downloads packages from the registry, and compiles binaries. This can take anywhere from 30 seconds to several minutes.
2. **Source Code Changes Frequently**: Application files like `app.js` or views in `views/` change constantly during development.
3. **Cache Invalidation Rule**: If any file included in a `COPY` command changes, Docker **invalidates the cache** for that step and **all subsequent steps**.
4. **The Solution**: By isolating `package.json` and `package-lock.json` into their own `COPY` step prior to running `RUN npm ci`, Docker will only execute dependency installation when `package.json` or `package-lock.json` are modified. If you only edit JavaScript or EJS files, Docker reuses the cached `RUN npm ci` layer entirely!

#### Breakdown of Dockerfile Instructions:
* `FROM node:20-alpine`: Uses Alpine Linux as base, reducing final image size from ~1GB (standard Node) down to ~180MB.
* `WORKDIR /usr/src/app`: Creates and sets the default working directory for all `RUN`, `CMD`, `COPY`, and `ADD` commands.
* `RUN npm ci --only=production`: `npm ci` performs a clean, automated build based on `package-lock.json` guaranteeing exact version matching without mutating lockfiles. `--only=production` skips devDependencies like `nodemon`.
* `EXPOSE 8080`: Documents that the containerized process listens on port 8080.
* `USER node`: By default, Docker containers run as `root`. Switching to the unprivileged built-in `node` user prevents potential container breakout vulnerabilities.
* `CMD ["node", "app.js"]`: Exec-form array syntax that executes `node app.js` directly as Process ID 1 (PID 1), ensuring system signals like `SIGTERM` and `SIGINT` are properly received during graceful shutdowns.

---

## 🐙 Step 2: Multi-Container Orchestration (`docker-compose.yml`)

The following `docker-compose.yml` configures a complete local development/production environment comprising the WanderStay web application and a local MongoDB instance.

```yaml
version: '3.8'

services:
  # ---------------------------------------------------------------------------
  # WanderStay Node.js Web Application Service
  # ---------------------------------------------------------------------------
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: wanderstay-app
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - PORT=8080
      - ATLASDB_URL=mongodb://mongo:27017/wanderstay
      - SECRET=${SECRET:-supersecretwanderstaykey}
      - CLOUD_NAME=${CLOUD_NAME}
      - CLOUD_API_KEY=${CLOUD_API_KEY}
      - CLOUD_API_SECRET=${CLOUD_API_SECRET}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - OPENCAGE_API_KEY=${OPENCAGE_API_KEY}
    depends_on:
      mongo:
        condition: service_healthy
    networks:
      - wanderstay-network

  # ---------------------------------------------------------------------------
  # Local MongoDB Database Service
  # ---------------------------------------------------------------------------
  mongo:
    image: mongo:7.0
    container_name: wanderstay-db
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    networks:
      - wanderstay-network
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 5s

# -----------------------------------------------------------------------------
# Persistent Volumes Definition
# -----------------------------------------------------------------------------
volumes:
  mongo_data:
    driver: local

# -----------------------------------------------------------------------------
# Custom Isolated Bridge Network Definition
# -----------------------------------------------------------------------------
networks:
  wanderstay-network:
    driver: bridge
```

---

### 💡 Deep Dive: Docker Compose Architecture & Concepts

#### 1. Service Communication & Connection Strings
In a host environment, applications connect to MongoDB via `localhost` (e.g., `mongodb://127.0.0.1:27017`). However, inside Docker:
* Each container is an isolated host with its own network interface and IP address. `localhost` inside the `app` container refers strictly to the `app` container itself, not the host machine or other containers.
* Docker's embedded DNS server automatically resolves service names defined in `docker-compose.yml` to their container IP addresses.
* Therefore, `ATLASDB_URL` is set to `mongodb://mongo:27017/wanderstay`. Here, `mongo` matches the MongoDB service name defined in `docker-compose.yml`.

#### 2. Named Volumes (`mongo_data:/data/db`)
Containers are inherently **ephemeral**; any files written inside a container's write layer are destroyed when the container is removed (`docker-compose down`).
* MongoDB stores its data files at `/data/db` inside the container.
* By attaching the named volume `mongo_data` to `/data/db`, Docker manages a persistent storage space on the host machine's disk outside the container lifecycle.
* Even if you destroy `wanderstay-db` or update the Mongo container image, your database state, collections, and registered users remain safe and intact.

#### 3. Custom Bridge Networks (`wanderstay-network`)
* When containers share a custom user-defined bridge network (e.g. `wanderstay-network`), Docker enables automatic DNS lookup between containers by service name.
* Additionally, it isolates your application stack from other running containers on the host, preventing network port conflicts and unauthorized inter-container communication.

#### 4. Dependency Health Checks (`service_healthy`)
Node.js apps boot faster than MongoDB initializes database storage. Standard `depends_on` only waits for the database container to *start*, not for MongoDB to be *ready to accept connections*.
* The `healthcheck` block runs `mongosh --eval "db.adminCommand('ping')"` inside the Mongo container.
* `condition: service_healthy` ensures that `wanderstay-app` only launches after MongoDB responds with a successful ping, eliminating database startup connection errors.

---

## 🚀 Step 3: Execution, Lifecycle Management & Troubleshooting

### 🛠️ CLI Execution Commands

Execute these commands from the root directory of the WanderStay project:

#### 1. Build and Start Containers in Detached Mode
```bash
docker-compose up -d --build
```
* `-d`: Runs containers in the background (detached mode).
* `--build`: Forces Docker to recompile images before starting services, ensuring code changes are incorporated.

#### 2. Check Running Containers Status
```bash
docker-compose ps
```

#### 3. View Live Aggregated Logs
```bash
# View stream of all services
docker-compose logs -f

# View application logs only
docker-compose logs -f app

# View MongoDB logs only
docker-compose logs -f mongo
```

#### 4. Execute Commands Inside Running Containers
To seed sample database data into the containerized MongoDB instance:
```bash
docker-compose exec app node init/index.js
```

#### 5. Stop and Tear Down Containers
```bash
# Stop containers without losing database volume data
docker-compose down

# Stop containers AND wipe persistent volume data (Clean Slate Reset)
docker-compose down -v
```

---

## 🔍 Troubleshooting MERN Stack Containerization

### 🚨 1. MongoNetworkError / Mongoose Connection Refused
* **Symptom**: `MongoDB connection failed: connect ECONNREFUSED 127.0.0.1:27017`
* **Root Cause**: The application is attempting to connect to `localhost` / `127.0.0.1` inside the `app` container instead of using Docker DNS service naming.
* **Fix**: Ensure your `ATLASDB_URL` environment variable inside `docker-compose.yml` points to `mongodb://mongo:27017/wanderstay` (referencing the `mongo` service name).

### 🚨 2. Session Store (`connect-mongo`) Initialization Failures
* **Symptom**: `ERROR in MONGO SESSION STORE MongoParseError: Invalid scheme`
* **Root Cause**: `connect-mongo` expects a fully valid URI scheme. If `ATLASDB_URL` is undefined or malformed when initializing `MongoStore.create({ mongoUrl: db_url })`, the app crashes.
* **Fix**: Verify `.env` or `docker-compose.yml` has `ATLASDB_URL` set. Also verify that MongoDB container healthcheck is passing before `app` attempts `MongoStore.create`.

### 3. Port Already in Use Errors (`EADDRINUSE`)
* **Symptom**: `driver failed programming external connectivity on endpoint wanderstay-db: Error starting userland proxy: listen tcp4 0.0.0.0:27017: bind: address already in use`
* **Root Cause**: A local instance of MongoDB or another process is running on port 27017 (or 8080 for web) on your host machine.
* **Fix**: Stop local host services, or modify the host mapping port in `docker-compose.yml` (e.g., `"27018:27017"` for Mongo, `"8081:8080"` for App).

### 🚨 4. Native Dependency Compilation / Architecture Mismatches
* **Symptom**: `Error: Cannot find module '/usr/src/app/node_modules/...'` when running the container after running `npm install` locally on Windows.
* **Root Cause**: Host `node_modules` compiled for Windows OS were mounted or copied into the Linux container environment.
* **Fix**: Ensure `.dockerignore` exists in the root directory to prevent local host `node_modules` from being copied into the build context:

```
# .dockerignore
node_modules
npm-debug.log
.git
.env
```

---

## 🎯 Summary Architecture Diagram

```
                       [ Host Machine Browser ]
                                 │
                           (Port 8080)
                                 ▼
         ┌───────────────────────────────────────────────┐
         │             wanderstay-network                │
         │           (Custom Bridge Network)             │
         │                                               │
         │   ┌───────────────────────────────────────┐   │
         │   │            wanderstay-app             │   │
         │   │         (Node.js / Express)           │   │
         │   └───────────────────┬───────────────────┘   │
         │                       │                       │
         │                       │                       │
         │              DNS: mongo:27017                 │
         │                       │                       │
         │                       ▼                       │
         │   ┌───────────────────────────────────────┐   │
         │   │             wanderstay-db             │   │
         │   │            (MongoDB 7.0)              │   │
         │   └───────────────────┬───────────────────┘   │
         └───────────────────────┼───────────────────────┘
                                 │
                         (Volume Mount)
                                 ▼
                       ┌───────────────────┐
                       │    mongo_data     │
                       │ (Host Persistent) │
                       └───────────────────┘
```

You are now ready to build and run **WanderStay** using Docker!
