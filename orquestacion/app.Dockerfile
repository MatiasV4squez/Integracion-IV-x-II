# App web (Expo) servida con nginx. La URL del API Gateway queda fija en el bundle al construir.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG EXPO_PUBLIC_API_URL=http://localhost:8080/api
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL} CI=1
RUN npx expo export --platform web --output-dir dist

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Rutas de Expo Router: /login -> login.html; las rutas dinámicas caen en index.html.
RUN printf '%s\n' \
  'server {' \
  '  listen 80;' \
  '  root /usr/share/nginx/html;' \
  '  location / { try_files $uri $uri.html $uri/ /index.html; }' \
  '}' > /etc/nginx/conf.d/default.conf
