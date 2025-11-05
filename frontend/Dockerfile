# ===========================
# 1️⃣ BUILD STAGE
# ===========================
FROM node:20-alpine AS builder

WORKDIR /home/app

# Copy dependency files first (for caching)
COPY package*.json ./

# Install dependencies (including dev for build)
RUN npm ci

# Copy all source files
COPY . .

# Build the Next.js app
RUN npm run build

# ===========================
# 2️⃣ RUNTIME STAGE
# ===========================
FROM node:20-alpine AS runner

WORKDIR /home/app

ENV NODE_ENV=production
ENV PORT=3000

# Copy only the production-ready output
COPY --from=builder /home/app/.next ./.next
COPY --from=builder /home/app/public ./public
COPY --from=builder /home/app/node_modules ./node_modules
COPY --from=builder /home/app/package.json ./package.json
COPY --from=builder /home/app/next.config.mjs ./next.config.mjs

# Expose port
EXPOSE 3000

# Run Next.js in production mode
CMD ["npm", "run", "start"]