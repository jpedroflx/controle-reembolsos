FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN npm ci

COPY backend backend

RUN npm run prisma:generate -w backend \
  && npm run build -w backend \
  && mkdir -p /app/data

WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=3333
ENV DATABASE_URL="file:/app/data/dev.db"

EXPOSE 3333

CMD ["sh", "-c", "npm run prisma:migrate && npm start"]
