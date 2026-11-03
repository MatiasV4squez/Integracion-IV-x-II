# Checklist de pruebas: flujo de sesiones

Reglas de negocio (BR01-BR20 involucradas, check-in, cuenta regresiva): `npm test` (35 pruebas)

Pruebas manuales de UI: `npx expo start`.

## Navegación
- [ ] Tab "Historial": mis sesiones (Tutee y Tutor)
- [ ] Tab "Buscar": tutorías disponibles para reservar (Tutee)
- [ ] Tarjeta "Publicar disponibilidad" en el inicio del Tutor
- [ ] Botón ‹ del detalle vuelve a la pantalla anterior (o al Historial si no hay)

## Historial
- [ ] Tarjetas de resumen (Activas, Completadas, Tu promedio)
- [ ] "Próxima sesión" abre su detalle
- [ ] Buscador: materia, persona, unidad
- [ ] Filtros de estado y de rol se combinan; lista vacía muestra mensaje
- [ ] Acciones rápidas: Aceptar/Rechazar (Tutor con solicitud pendiente), Calificar, Declarar resultado

## Detalle de sesión (ticket)
- [ ] Cabecera azul con estado; tarjeta cian con materia, rol, lugar, inicio y término
- [ ] Pendiente: "Tiempo para responder" (24 h) y, como Tutor, Aceptar / Rechazar (BR14)
- [ ] Confirmada: cuenta regresiva "Comienza en"; Cancelar solo antes del inicio (BR15)
- [ ] Panel de demo -> "Inicia el horario": el temporizador pasa a "Tiempo restante" y corre cada segundo
- [ ] Check-in: deshabilitado antes de 15 min del inicio; habilitado en la ventana; no se repite
- [ ] Panel de demo -> "La contraparte escanea el QR": aparece su asistencia
- [ ] "Termina el horario" -> Pendiente de cierre; declarar resultado; coinciden -> final, difieren -> En conflicto (BR17/18)
- [ ] Completada: calificar 1-5 con comentario, una sola vez (BR04/BR19); el promedio del tutor se actualiza
- [ ] Reportar usuario solo si la sesión llegó a Confirmada (BR10); no se repite
- [ ] Subir guías/ejercicios (confirmada, pendiente de cierre o completada) y abrirlos
- [ ] "Ver perfil" abre al tutor; "¿Qué sigue?" lleva a Buscar con materia/tutor pre-cargados

## Tutorías disponibles (Tutee, tab Buscar)
- [ ] Elegir materia muestra los tutores que la enseñan con sus horarios
- [ ] Horarios con cupos (máximo / actuales); bloque lleno o ya reservado no se puede elegir
- [ ] "Reservar" crea la sesión "Pendiente" y suma al contador de solicitudes
- [ ] Con 4/4 pendientes no se puede reservar (BR05)
- [ ] "Ver perfil" abre al tutor: reseñas, historial y horarios

## Publicar disponibilidad (Tutor)
- [ ] Elegir materia, día, hora de inicio y cupos
- [ ] "Publicar horario" valida término > inicio y cupos ≥ 1
- [ ] El horario publicado aparece en "Mis horarios publicados"

## Ajustes de UI
- [ ] Modo claro y oscuro
- [ ] Pantalla angosta (320 px) sin desbordes horizontales (NFR13)
- [ ] Zonas táctiles de al menos 44 px
