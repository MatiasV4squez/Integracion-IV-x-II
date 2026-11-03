# Imagen genérica para los microservicios NestJS del repositorio.
# Clona la rama del micro desde GitHub (no hace falta tener el código del backend localmente
# ni modificarlo), instala dependencias, genera el cliente de Prisma y compila.
FROM node:22-alpine

RUN apk add --no-cache git openssl

ARG REPO_URL=https://github.com/MatiasV4squez/Integracion-IV-x-II.git
ARG BRANCH
ARG DIR

WORKDIR /repo
RUN git clone --depth 1 --branch "${BRANCH}" "${REPO_URL}" .

WORKDIR /repo/${DIR}
# Si el package-lock de una rama no está sincronizado con su package.json, npm ci falla;
# en ese caso se instala con npm install (dentro de la imagen; la rama no se modifica).
RUN (npm ci --no-audit --no-fund || npm install --no-audit --no-fund) \
 && if [ -d prisma ]; then npx prisma generate; fi \
 && npx nest build

# Cada servicio define su comando en docker-compose.yml (migraciones + arranque).
CMD ["node", "dist/main.js"]
