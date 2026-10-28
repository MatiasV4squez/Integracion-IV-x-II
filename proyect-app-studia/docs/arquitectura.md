# Arquitectura de la app (Studia)

App móvil en React Native + Expo Router + TypeScript. Este documento define la estructura de carpetas,
cómo se separan las responsabilidades y cómo se conecta con el backend de microservicios cuando exista.

## 1. Capas

```
 Pantallas / rutas        src/app, src/screens, src/components
        │  usan
        ▼
 Hooks                    src/hooks          useAuth, useTutorMode, usePreferences, useSubjects
        │  leen / escriben
        ▼
 Estado global (Zustand)  src/store          sesión, preferencias
        │  llaman
        ▼
 Servicios                src/services       auth, almacenamiento, catálogo, cliente HTTP
        │  hablan con
        ▼
 Origen de datos          Mock (hoy)  ──►  API Gateway (mañana, NFR25)
```

Regla de oro: **una capa solo conoce a la de abajo**. Las pantallas nunca llaman a AsyncStorage ni a `fetch`;
los servicios nunca importan React.

## 2. Carpetas

| Carpeta | Qué va ahí |
|---|---|
| `src/app/` | Rutas de Expo Router. Archivos delgados: solo renderizan una pantalla. `(tabs)` = pestañas, `tutor/` = rutas del modo Tutor. |
| `src/screens/` | Pantallas completas (la UI real). |
| `src/components/` | Piezas de UI reutilizables (`Card`, `AppButton`, `FormTextField`, `PreferencesCard`…). |
| `src/hooks/` | Hooks que usan las pantallas. Son una capa fina sobre el estado global. |
| `src/store/` | Estado global con Zustand. `create-*-store.ts` son fábricas puras (se prueban sin React); `index.ts` crea las instancias reales. |
| `src/services/` | Lógica de acceso a datos y almacenamiento. `index.ts` es el único lugar donde se arman con sus adaptadores reales. |
| `src/services/adapters/` | Envoltorios de librerías nativas (`async-storage`, `secure-store`). Es lo único que importa módulos nativos. |
| `src/schemas/` | Esquemas de validación de formularios (zod). |
| `src/navigation/` | Reglas de acceso por rol y pestañas visibles (funciones puras). |
| `src/utils/` | Funciones puras: fechas, correo, token, reglas de sesión (`session-machine`). |
| `src/constants/` | Constantes (`app-config.ts`), tema y diseño. |
| `src/types/` | Tipos de dominio (`session.ts`, `auth.ts`). |
| `src/mocks/` | Datos de ejemplo mientras no hay backend. |
| `src/state/` | Contexto de sesiones de tutoría (`SessionsProvider`). Se mantiene tal cual; podría migrar a Zustand más adelante. |
| `scripts/` | Utilidades de desarrollo (cargador de TypeScript para `npm test`). |
| `docs/` | Documentación. |

## 3. Servicios

| Servicio | Responsabilidad | Requisito del SRS |
|---|---|---|
| `auth-service` | Iniciar/cerrar sesión, recuperar la sesión guardada, cerrar por inactividad, registrar, verificar correo. | RF01, RF02, NFR04, NFR16, BR09, BR11 |
| `auth-gateway` | Conversación con el backend de autenticación. Hoy es un mock; se reemplaza por una versión HTTP con la misma interfaz. | NFR25 |
| `storage-service` | JSON sobre AsyncStorage con prefijo, y caché con vencimiento. Nunca lanza errores. | NFR12 |
| `token-storage` | Guarda el JWT en almacenamiento seguro (Keychain/Keystore). En la web usa AsyncStorage (solo desarrollo). | NFR16 |
| `catalog-service` | Catálogo de materias con caché de 24 h. | NFR12 |
| `api-client` | Cliente HTTP base: JSON, `Authorization: Bearer`, tiempo máximo de 5 s. | NFR23, NFR25 |

### Convención de resultados
Los servicios devuelven `{ ok: true, data }` o `{ ok: false, error, message }`. Los errores esperados
(contraseña incorrecta, cuenta suspendida…) **no lanzan**: la pantalla siempre tiene un mensaje para mostrar.

### Cómo conectar el backend real
1. Crear `createHttpAuthGateway(apiClient)` que implemente `AuthGateway` (`login`, `register`, `verifyEmail`).
2. En `src/services/index.ts` cambiar `createMockAuthGateway(...)` por esa versión.
3. Nada más cambia: el servicio, el estado, los hooks y las pantallas siguen igual.

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
- Los rutas se escriben con `ROUTES` (`src/navigation/access.ts`) en el código nuevo.

## 6. Sesión e inactividad (NFR04)

- Al iniciar sesión se guarda el token, el usuario y la hora de la última actividad.
- Cada navegación registra actividad (como máximo una vez cada 30 s).
- Al volver a la app (`AppState: active`) se revisa: si pasaron más de 30 min sin actividad, se cierra la sesión con un aviso.
- Al abrir la app en frío se aplica la misma regla (`restoreSession`).

## 7. Formularios (react-hook-form + zod)

1. Definir el esquema en `src/schemas/`.
2. En la pantalla: `useForm({ resolver: zodResolver(schema) })`.
3. Usar `FormTextField` / `FormChipGroup` (`src/components/form-fields.tsx`), que muestran el error debajo del campo.

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

- Cada servicio y cada store es una **fábrica** que recibe sus dependencias (almacenamiento, reloj, gateway),
  así las pruebas usan memoria y un reloj falso.
- Los módulos que se prueban **no pueden importar React ni librerías nativas**. Por eso los adaptadores están
  separados en `services/adapters/`.

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
