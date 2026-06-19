FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY . .

ARG NEXT_PUBLIC_TTS_SERVER_URL
ENV NEXT_PUBLIC_TTS_SERVER_URL=${NEXT_PUBLIC_TTS_SERVER_URL}
ENV NEXT_PUBLIC_DEFAULT_VOICE=rafael
ENV NEXT_PUBLIC_DEFAULT_LANGUAGE=portuguese
ENV PORT=3000
ENV NODE_ENV=production

RUN npm run build

EXPOSE 3000

CMD ["node", "server.js"]
