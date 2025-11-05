# FROM node:24-slim 

# RUN mkdir -p /home/app
# WORKDIR /home/app
# COPY ./src ./
# RUN npm install

# EXPOSE 3001
# CMD ["npm","run","prod"]

# ===========================
# 1️⃣ BUILD STAGE
# ===========================
FROM node:24-slim AS builder

WORKDIR /home/app

# Copy only package files first (for caching)
COPY package*.json ./

# Install all dependencies (including dev ones for build)
RUN npm ci

# Copy the rest of the app
COPY . .

# Build TypeScript -> JavaScript
RUN npm run build

# ===========================
# 2️⃣ RUNTIME STAGE
# ===========================
FROM node:24-slim AS runner

WORKDIR /home/app

# Copy only what's needed to run
COPY ./db ./db
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled JavaScript from builder
COPY --from=builder /home/app/dist ./dist

EXPOSE 3001
CMD ["npm","run","prod"]