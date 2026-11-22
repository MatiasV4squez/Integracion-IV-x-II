FROM docker.io/library/node:24-alpine

WORKDIR /app

COPY . .

RUN npm ci
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["npm", "run", "start:prod"]
