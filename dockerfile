FROM node:18-bookworm-slim

# Toolchain untuk mengompilasi better-sqlite3 (native module)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 build-essential \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
# Salin seluruh monorepo — backend butuh folder frontend/ untuk data contoh
COPY . .

WORKDIR /app/backend
RUN npm install

ENV NODE_ENV=production
ENV HOST=0.0.0.0

EXPOSE 4000
CMD ["node", "src/index.js"]
