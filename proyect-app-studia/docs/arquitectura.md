# Arquitectura de la app (Studia)

App móvil en React Native + Expo Router + TypeScript. Este documento define la estructura de carpetas,
cómo se separan las responsabilidades y cómo se conecta con el backend de microservicios cuando exista.

## 1. Capas (arquitectura limpia + hexagonal)

```
                ┌────────────────────────── src/app (rutas de Expo Router) ─────────────────────────┐
                │                                                                                   │
  presentation  │  pantallas, componentes, hooks, estado (Zustand / contexto), navegación, esquemas │
                └──────────────┬────────────────────────────────────────────────────────────────────┘
                               │ usa casos de uso y el modo (backend/demo) desde
                               ▼
  di            src/di/container.ts  ← raíz de composición: elige adaptadores y arma todo
                               │
          ┌────────────────────┼──────────────────────────┐
          ▼                    ▼                          ▼
  application            infrastructure              (demo.ts: datos de ejemplo para la UI demo)
  casos de uso  ◄────────  adaptadores que implementan los puertos
  + puertos                 http/  → API Gateway (usuarios-auth, materias-tutores,
  (interfaces)                       agendamiento-sesiones, reportes-moderacion)
          │                 demo/  → datos de ejemplo con latencia simulada
          ▼                 storage/ → AsyncStorage / SecureStore
  domain                    platform/ → descargas de archivos (nativo / web)
  entidades y reglas puras
  (sin React, sin red)

  shared: utilidades neutras (fechas, formato, configuración, errores, paginación) — las usan todas las capas.
```

**Regla de dependencias:** apuntan siempre hacia adentro. El dominio no conoce a nadie; la aplicación
solo conoce el dominio y sus **puertos**; la infraestructura implementa esos puertos; la presentación
pide todo a `src/di` y nunca importa `infrastructure`. ESLint lo hace cumplir
(`import/no-restricted-paths` en `eslint.config.js`): romper una capa es un error de lint y falla el CI.

## 2. Carpetas

| Carpeta | Qué va ahí |
|---|---|
| `src/domain/` | Entidades y reglas de negocio puras: `sesiones/` (tipos, máquina de estados BR02, resúmenes de agenda), `auth/` (usuario, roles, correo institucional, token), `disponibilidad/` (calendario, validación del bloque, 12/24 h), `postulaciones/` (estados, certificado, nota), `catalogo/` (materia). |
| `src/application/ports/` | **Puertos**: interfaces que la aplicación necesita del exterior (`AuthGateway`, `StorageService`, `TokenStorage`, `CatalogoRepository`, `TutoresRepository`, `SesionesRepository`, `DisponibilidadRepository`, `PerfilRepository`, `PostulacionesRepository`, `UsuariosRepository`). |
| `src/application/<caso>/` | **Casos de uso** por funcionalidad (`auth`, `catalogo`, `tutorias`, `sesiones`, `disponibilidad`, `postulaciones`, `perfil`). Reciben puertos por parámetro (factorías `create...`), validan con el dominio y nunca lanzan errores esperados. |
| `src/infrastructure/http/` | Adaptadores HTTP de cada puerto hacia el API Gateway, más el cliente (`http-client.ts`: JSON, multipart, JWT, 401). |
| `src/infrastructure/demo/` | Adaptadores demo (sin backend) y sus datos de ejemplo (`data/`). |
| `src/infrastructure/storage/`, `platform/` | Almacenamiento local/seguro y descarga de archivos por plataforma. |
| `src/di/` | `container.ts`: raíz de composición (adaptadores HTTP o demo según `EXPO_PUBLIC_API_URL`, casos de uso, estados globales). `demo.ts`: datos de ejemplo que la UI usa solo en modo demo. |
| `src/presentation/` | `screens/`, `components/`, `hooks/`, `state/` (Zustand y contexto de sesiones), `navigation/`, `schemas/` (zod), `constants/` (tema). |
| `src/shared/` | Utilidades sin dependencias de capa: fechas, formato, hora de Santiago, configuración, errores (`AppError`), paginación. |
| `src/app/` | Rutas de Expo Router (archivos delgados que renderizan una pantalla). Expo exige esta ubicación. |

## 3. Puertos, adaptadores y casos de uso

| Puerto | Adaptador backend (`infrastructure/http`) | Adaptador demo (`infrastructure/demo`) | Caso de uso |
|---|---|---|---|
| `AuthGateway` | `http-auth-gateway` (usuarios-auth) | `mock-auth-gateway` | `application/auth/auth-service` |
| `CatalogoRepository` | `catalogo-api` | `demo-repositories` | `catalogo/catalog-service` (caché 24 h), `tutorias` |
| `TutoresRepository` | `tutores-api` | `demo-repositories` | `tutorias` |
| `SesionesRepository` | `sesiones-api` (agendamiento + reportes) | — (la demo usa `domain/sesiones/session-machine`) | `sesiones` |
| `DisponibilidadRepository` | `disponibilidad-api` | — (estado local en la demo) | `disponibilidad` |
| `PerfilRepository` | `perfil-api` | `demo-repositories` | `perfil` |
| `PostulacionesRepository` | `postulaciones-api` | `demo-repositories` (en memoria) | `postulaciones` |
| `UsuariosRepository` | `usuarios-auth-api` (datos públicos) | `demo-repositories` | `postulaciones`, adaptadores |
| `StorageService`, `TokenStorage` | `storage/` (AsyncStorage, SecureStore) | — | `auth`, `catalogo` |

### Convención de resultados
Los casos de uso devuelven `{ ok: true, data }` o `{ ok: false, error }`; los errores esperados
(contraseña incorrecta, bloque que se cruza, nota fuera de rango…) **no lanzan**: la pantalla siempre
tiene un mensaje para mostrar.

### Agregar una funcionalidad
1. Reglas puras en `domain/` (con su `*.test.mjs`).
2. Puerto en `application/ports/` y caso de uso en `application/<funcionalidad>/`.
3. Adaptador HTTP en `infrastructure/http/` (y demo si la demo lo necesita).
4. Conectarlo en `di/container.ts` y usarlo desde la pantalla vía `useCases`.

### Conexión con los microservicios
Con `EXPO_PUBLIC_API_URL` (raíz del API Gateway, p. ej. `http://192.168.1.10:8080/api`; ver `.env.example`)
`di/container.ts` conecta los adaptadores HTTP; sin ella, los demo.

- El JWT se guarda en SecureStore y el cliente HTTP lo envía en `Authorization: Bearer`.
- Un 401 de cualquier micro cierra la sesión con un aviso (`authStore.expire`).
- Los roles del JWT se fijan al iniciar sesión: al aprobarse una postulación, el usuario debe volver a entrar para ver el modo Tutor.
- En materias-tutores los bloques son individuales (1 cupo) y no se ligan a una materia; el tutor elige día, inicio y término.
- Pendiente en el backend: reportes-moderacion valida la sesión con `GET /sesiones/:id/validacion-reporte`, que agendamiento-sesiones aún no expone, así que reportar responde 503.

## 4. Estado global (Zustand)

| Store | Contiene | Persistencia |
|---|---|---|
| `authStore` | `status` (`hydrating`/`authenticated`/`unauthenticated`), `user`, `error`, `notice` | Token en SecureStore, usuario y última actividad en AsyncStorage |
| `preferencesStore` | `theme`, `notificationsEnabled`, `tutorMode` | AsyncStorage |

Al abrir la app, el layout raíz mantiene la pantalla de carga hasta que ambos terminan de leer lo guardado
(así no se ve un parpadeo del login).

## 5. Navegación y roles

```
src/app
├─ _layout.tsx              Stack raíz con guardas (Stack.Protected)
├─ login.tsx · registro.tsx Solo sin sesión
├─ (tabs)/                  Con sesión: index, buscar, historial, perfil
├─ detalle-sesion.tsx       Con sesión
├─ tutor/                   Solo cuentas con rol Tutor
└─ publicar-disponibilidad  Solo cuentas con rol Tutor
```

| Grupo | Quién entra | Función |
|---|---|---|
| `public` | Sin sesión | `canAccess('public', …)` |
| `authenticated` | Cualquier usuario con sesión | `canAccess('authenticated', …)` |
| `tutor` | Sesión + rol Tutor | `canAccess('tutor', …)` |

- Un Tutee que no tiene el rol Tutor **no puede** activar el modo Tutor (`useTutorMode().setIsTutor(true)` lo ignora) ni abrir las rutas `tutor/`.
- En modo Tutor la pestaña **Buscar** se oculta (`getVisibleTabs`).
- El último modo usado se recuerda en el dispositivo, pero al cerrar sesión se vuelve a Tutee.
- Los rutas se escriben con `ROUTES` (`src/presentation/navigation/access.ts`) en el código nuevo.

## 6. Sesión e inactividad (NFR04)

- Al iniciar sesión se guarda el token, el usuario y la hora de la última actividad.
- Cada navegación registra actividad (como máximo una vez cada 30 s).
- Al volver a la app (`AppState: active`) se revisa: si pasaron más de 30 min sin actividad, se cierra la sesión con un aviso.
- Al abrir la app en frío se aplica la misma regla (`restoreSession`).

## 7. Formularios (react-hook-form + zod)

1. Definir el esquema en `src/presentation/schemas/`.
2. En la pantalla: `useForm({ resolver: zodResolver(schema) })`.
3. Usar `FormTextField` / `FormChipGroup` (`src/presentation/components/form-fields.tsx`), que muestran el error debajo del campo.

Formularios ya migrados: **login**, **registro** (correo institucional, contraseña fuerte, confirmación),
**publicar disponibilidad** (materia, día, hora futura, cupos 1 a 4).
Los formularios de calificar y reportar dentro de `detalle-sesion` ya validan con las reglas de `session-machine` (BR04, BR10, BR19).

## 8. Almacenamiento local

Claves (con el prefijo `studia:v1:`; cambiar la versión invalida todo lo guardado):

| Clave | Contenido |
|---|---|
| `auth:user` | Datos del usuario (sin contraseña) |
| `auth:last-activity` | Marca de tiempo de la última actividad |
| `preferences` | Tema, notificaciones, modo tutor |
| `cache:subjects` | Catálogo de materias con vencimiento |
| *(SecureStore)* `studia.auth_token` | Token JWT |

## 9. Pruebas

`npm test` ejecuta todas las pruebas `src/**/*.test.mjs` con el ejecutor nativo de Node (no hace falta Jest).
El cargador de `scripts/` permite importar los módulos `.ts` con el alias `@/`.

- Cada caso de uso, adaptador y store es una **fábrica** que recibe sus dependencias (puertos, reloj, gateway),
  así las pruebas usan memoria y un reloj falso.
- Los módulos que se prueban **no pueden importar React ni librerías nativas**. Por eso los adaptadores están
  separados en `infrastructure/storage/` y `infrastructure/platform/`, y la presentación los recibe desde `di/container.ts`.

## 10. Cuentas de demostración

| Correo | Contraseña | Roles | Estado |
|---|---|---|---|
| `alumno.demo@uct.cl` | `demo1234` | Tutee y Tutor | activa |
| `nuevo.alumno@alu.uct.cl` | `nuevo1234` | Tutee | activa |
| `suspendida@alu.uct.cl` | `susp1234` | Tutee | suspendida |
| `sin.verificar@alu.uct.cl` | `inac1234` | Tutee | inactiva |

## 11. Pendiente

- Pantallas del rol Administrador (la navegación ya admite el rol `admin`).
- Migrar `SessionsProvider` a Zustand.
- Conectar `auth-gateway` y el catálogo al API Gateway real.
- Pantalla de recuperación de contraseña (no está en el SRS).
