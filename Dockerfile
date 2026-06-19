FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY . .
ARG NEXT_PUBLIC_TTS_SERVER_URL
ENV NEXT_PUBLIC_TTS_SERVER_URL=${NEXT_PUBLIC_TTS_SERVER_URL}
RUN npm run build

FROM node:20-alpine

WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

ARG NEXT_PUBLIC_TTS_SERVER_URL
ENV NEXT_PUBLIC_TTS_SERVER_URL=${NEXT_PUBLIC_TTS_SERVER_URL}
ENV NEXT_PUBLIC_DEFAULT_VOICE=rafael
ENV NEXT_PUBLIC_DEFAULT_LANGUAGE=portuguese
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000
CMD ["node", "server.js"]
