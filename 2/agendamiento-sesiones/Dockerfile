FROM docker.io/library/node:24-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY . .

RUN npm ci
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && exec npm run start:prod"]
