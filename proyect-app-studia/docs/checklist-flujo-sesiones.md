# Checklist de pruebas: flujo de sesiones

Reglas de negocio (BR01-BR20 involucradas, check-in, cuenta regresiva): `npm test` (35 pruebas)

Pruebas manuales de UI: `npx expo start` (la app abre en Historial).

## Navegación
- [ ] La barra superior muestra Historial / Solicitar / Detalle y marca la pestaña activa
- [ ] El contador "n/4 pendientes" lleva a Solicitar y se pone rojo con 4/4
- [ ] "Detalle" abre la última sesión visitada
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
- [ ] "Ver perfil" abre al tutor; "¿Qué sigue?" pre-carga la solicitud

## Solicitar tutoría
- [ ] Materia -> Tutor -> Horario, con búsqueda y filtros
- [ ] Horarios con cupos (máximo / actuales); bloque lleno no se puede elegir
- [ ] Enviar solicitud: crea "Pendiente", suma al contador y al "Historial de solicitudes"
- [ ] Con 4/4 pendientes el envío se bloquea (BR05)
- [ ] Perfil del tutor: reseñas, historial, horarios y solicitar

## Ajustes de UI
- [ ] Modo claro y oscuro
- [ ] Pantalla angosta (320 px) sin desbordes horizontales (NFR13)
- [ ] Zonas táctiles de al menos 44 px
