# chatgpt: https://chatgpt.com/s/t_6928e9cf40548191bee7adbdd0a61919 prompt: need a dockerfile to start my teams next.js frontend
# ===========================
# BUILD STAGE
# ===========================
FROM node:20-alpine AS builder

WORKDIR /home/app
COPY package*.json ./
RUN npm ci
COPY . .

RUN npm run build

# ===========================
# RUNTIME STAGE
# ===========================
FROM node:20-alpine AS runner

WORKDIR /home/app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /home/app/.next ./.next
COPY --from=builder /home/app/public ./public
COPY --from=builder /home/app/node_modules ./node_modules
COPY --from=builder /home/app/package.json ./package.json
COPY --from=builder /home/app/next.config.mjs ./next.config.mjs

EXPOSE 3000
CMD ["npm", "run", "start"]