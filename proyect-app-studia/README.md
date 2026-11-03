# Studia — app de tutorías entre pares

App móvil y web (Expo + React Native + TypeScript) del Sistema de Tutorías entre Pares.
Se conecta a los microservicios a través del API Gateway; sin backend funciona en **modo demo** con
datos de ejemplo. La arquitectura (limpia + hexagonal) está en [`docs/arquitectura.md`](docs/arquitectura.md).

Funciona igual en **Windows** y **Linux** (y macOS).

## Requisitos

| Qué | Versión | Windows | Linux |
|---|---|---|---|
| Node.js | 22.12 o superior | instalador de [nodejs.org](https://nodejs.org) | `nvm install 22` o el gestor de paquetes |
| Git | cualquiera | [git-scm.com](https://git-scm.com) | gestor de paquetes |
| Expo Go (celular) | la de la tienda | Android / iOS | Android / iOS |

Para conectarla al backend, levanta los microservicios y el API Gateway y define `EXPO_PUBLIC_API_URL` (ver `.env.example`).

## 1. Instalar

```bash
cd proyect-app-studia
npm ci
```

## 2. Elegir modo

**Modo demo (sin backend):** no hay que configurar nada. Cuentas: `alumno.demo@uct.cl` / `demo1234`.

**Con backend:** crea `.env.local` a partir del ejemplo y pon la URL del API Gateway.

| | Windows (PowerShell) | Linux |
|---|---|---|
| Copiar el ejemplo | `Copy-Item .env.example .env.local` | `cp .env.example .env.local` |
| Ver la IP de tu PC | `ipconfig` (Adaptador Wi-Fi → Dirección IPv4) | `hostname -I` |

En `.env.local`:

```dotenv
# Solo en el navegador del mismo PC:
EXPO_PUBLIC_API_URL=http://localhost:8080/api
# En el celular (Expo Go), con la IP de tu PC:
# EXPO_PUBLIC_API_URL=http://192.168.1.10:8080/api
```

Después de cambiar `.env.local`, reinicia Expo.

## 3. Correr

```bash
npx expo start
```

- **Celular:** escanea el código QR con Expo Go (el celular y el PC en la misma red Wi-Fi).
- **Navegador:** presiona `w` o abre http://localhost:8081.

Cuentas de prueba con backend: `estudiante@alu.uct.cl` / `Estudiante123`, `tutor@alu.uct.cl` /
`Tutor1234`, `tutor2@alu.uct.cl` / `Tutor1234`, `admin@alu.uct.cl` / `Admin1234`.

## Si el celular no conecta

El firewall del PC debe permitir los puertos **8081** (Expo) y **8080** (Gateway).

| Windows (PowerShell como administrador) | Linux (Fedora) |
|---|---|
| `New-NetFirewallRule -DisplayName "Studia" -Direction Inbound -Protocol TCP -LocalPort 8080,8081 -Action Allow` | `sudo firewall-cmd --add-port=8080/tcp --add-port=8081/tcp` |

Si la red no permite conexiones entre equipos (redes de universidad), usa `npx expo start --tunnel`
para la app; el Gateway igual debe ser alcanzable desde el celular.

## Comandos

| Comando | Qué hace |
|---|---|
| `npx expo start` | Servidor de desarrollo (celular y web) |
| `npm run lint` | ESLint (incluye la regla que protege las capas de la arquitectura) |
| `npx tsc --noEmit` | Revisión de tipos |
| `npm test` | Pruebas (ejecutor nativo de Node, sin Jest) |

Los tres últimos son los que corre el CI en cada push.
