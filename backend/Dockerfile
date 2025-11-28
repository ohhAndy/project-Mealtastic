# chatgpt: https://chatgpt.com/s/t_6928e9f866148191bd4692381a4069ad prompt: *I gave my hw backend dockerfile and it generated this for typescript*
# ===========================
# BUILD STAGE
# ===========================
FROM node:24-slim AS builder

WORKDIR /home/app
COPY package*.json ./
RUN npm ci
COPY . .

RUN npm run build

# ===========================
# RUNTIME STAGE
# ===========================
FROM node:24-slim AS runner

WORKDIR /home/app
COPY ./db ./db
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /home/app/dist ./dist

EXPOSE 3001
CMD ["npm","run","prod"]