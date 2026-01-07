FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

# Copy all source files
COPY index.html ./
COPY src ./src
COPY shared ./shared
COPY server ./server
COPY vite.config.js ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY tsconfig.json ./
COPY components.json ./

# Build frontend
RUN npx vite build

# Build server
RUN npx esbuild server/index.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --outfile=dist/index.js \
  --format=esm \
  --external:bcryptjs \
  --external:pg \
  --external:@neondatabase/serverless \
  --packages=external

FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

# Copy built files
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "dist/index.js"]
