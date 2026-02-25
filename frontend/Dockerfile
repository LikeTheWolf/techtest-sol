FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --legacy-peer-deps

COPY . .

RUN npm run build

EXPOSE 4004

CMD ["npx", "http-server", "./build", "-p", "4004", "--ssl", "--cert", "/app/ssl/cloudflare-origin.pem", "--key", "/app/ssl/cloudflare-origin.key"]
