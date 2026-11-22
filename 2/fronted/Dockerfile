FROM docker.io/library/node:24-alpine AS build

WORKDIR /app

COPY . .

RUN npm ci

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN test -n "$VITE_API_BASE_URL" && npm run build

FROM docker.io/library/nginx:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
