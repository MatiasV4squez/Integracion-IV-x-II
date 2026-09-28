# Checklist de pruebas: flujo de sesiones

Pruebas automáticas de reglas (BR02, BR03, BR04, BR05, BR10, BR14, BR15): `npm test`

Pruebas manuales de UI (`npx expo start`, menú de vista previa en la pantalla inicial):

## Historial
- [ ] Muestra las 13 sesiones de ejemplo ordenadas de la más reciente a la más antigua
- [ ] Filtro **Activas**: pendiente, confirmada, pendiente de cierre, en conflicto
- [ ] Filtro **Completadas** / **Otras** (rechazada, expirada, cancelada, no realizada, inasistencia)
- [ ] Filtro por rol (Tutee / Tutor) se combina con el filtro de estado
- [ ] Combinación sin resultados muestra el mensaje de lista vacía
- [ ] Sesión completada muestra "Tu calificación" o "Sin calificar"

## Detalle de sesión (uno por estado, desde el menú)
- [ ] Pendiente + Tutor (s2): Aceptar / Rechazar. Pendiente + Tutee (s1): sin botones (BR14)
- [ ] Confirmada antes del inicio (s3): Cancelar sesión + Reportar (BR15, BR10)
- [ ] Pendiente de cierre (s5): 3 botones de resultado
- [ ] En conflicto (s6): aviso rojo, sin calificar
- [ ] Completada sin calificar (s8): estrellas 1–5, botón deshabilitado hasta elegir (BR19)
- [ ] Completada ya calificada (s7): no permite calificar de nuevo (BR04)
- [ ] Rechazada / Expirada (s10, s11): sin acciones ni reportar (BR10)
- [ ] Línea de tiempo con los estados en orden

## Solicitud
- [ ] "Enviar solicitud" deshabilitado hasta elegir un horario
- [ ] Cambiar de materia / horario actualiza el resumen
- [ ] Con 4/4 pendientes: aviso rojo y botón bloqueado (BR05)
- [ ] Aviso de expiración de 24 horas visible (BR03)

## Ajustes de UI
- [ ] Modo claro y oscuro (cambiar tema del dispositivo)
- [ ] Pantalla angosta (320 px) sin desbordes horizontales (NFR13)
- [ ] Zonas táctiles de al menos 44–48 px
