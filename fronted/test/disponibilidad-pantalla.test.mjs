import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { createServer } from 'vite'
import { renderizarRuta } from './helpers/renderizar-ruta.mjs'

let vite, validarHorario, DisponibilidadPage, ListadoBloques, FormularioBloque, AppRoutes
const horario = { dia: '2026-11-03', horaInicio: '09:00', horaFin: '10:30' }
const bloque = { idBloque: '31', ...horario, estadoBloque: 'DISPONIBLE' }
const reservado = { idBloque: '32', dia: '2026-11-03', horaInicio: '15:00', horaFin: '16:00', estadoBloque: 'RESERVADO' }
const otroDia = { idBloque: '33', dia: '2026-11-04', horaInicio: '09:00', horaFin: '10:00', estadoBloque: 'DISPONIBLE' }
const inactivo = { idBloque: '34', dia: '2026-11-05', horaInicio: '11:00', horaFin: '12:00', estadoBloque: 'INACTIVO' }
const propiedadesBase = {
  bloqueEditado: null,
  guardando: false,
  errorOperacion: null,
  mensaje: null,
  onRecargar() {},
  onEditar() {},
  onGuardar: async () => true,
  onEliminar: async () => true,
  onCancelar() {},
}
const renderPagina = (cambios = {}) =>
  renderToStaticMarkup(createElement(DisponibilidadPage, { ...propiedadesBase, ...cambios }))
const renderListado = (bloques, cambios = {}) =>
  renderToStaticMarkup(createElement(ListadoBloques, {
    bloques, idEdicion: null, guardando: false, onEditar() {}, onEliminar: async () => true, ...cambios,
  }))
const renderFormulario = (cambios = {}) =>
  renderToStaticMarkup(createElement(FormularioBloque, {
    bloques: [], bloqueEditado: null, guardando: false, onGuardar: async () => true, onCancelar() {}, ...cambios,
  }))

before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ validarHorario } = await vite.ssrLoadModule('/src/features/disponibilidad/utils/validar-horario.ts'))
  ;({ default: DisponibilidadPage } = await vite.ssrLoadModule('/src/features/disponibilidad/pages/DisponibilidadPage.tsx'))
  ;({ ListadoBloques } = await vite.ssrLoadModule('/src/features/disponibilidad/components/ListadoBloques.tsx'))
  ;({ FormularioBloque } = await vite.ssrLoadModule('/src/features/disponibilidad/components/FormularioBloque.tsx'))
  ;({ AppRoutes } = await vite.ssrLoadModule('/src/app/AppRoutes.tsx'))
})
after(async () => { await vite?.close() })

test('acepta un horario completo sin solapamientos', () => {
  assert.deepEqual(validarHorario(horario, [], null), {})
  assert.deepEqual(validarHorario({ dia: '2026-12-31', horaInicio: '00:00', horaFin: '23:59' }, [bloque], null), {})
})

test('rechaza fechas imposibles o con otro formato', () => {
  for (const dia of ['', '2026-02-30', '2026-13-01', '03-11-2026', '2026-1-3', 'manana']) {
    assert.deepEqual(validarHorario({ ...horario, dia }, [], null), { dia: 'Selecciona una fecha válida.' })
  }
})

test('rechaza horas mal formadas', () => {
  assert.deepEqual(validarHorario({ ...horario, horaInicio: '9:00' }, [], null), { horaInicio: 'Indica una hora de inicio válida.' })
  assert.deepEqual(validarHorario({ ...horario, horaFin: '24:00' }, [], null), { horaFin: 'Indica una hora de fin válida.' })
  assert.deepEqual(validarHorario({ dia: 'x', horaInicio: '99:99', horaFin: '' }, [], null), {
    dia: 'Selecciona una fecha válida.',
    horaInicio: 'Indica una hora de inicio válida.',
    horaFin: 'Indica una hora de fin válida.',
  })
})

test('exige que la hora de fin sea posterior a la de inicio', () => {
  for (const cambio of [{ horaInicio: '10:30' }, { horaInicio: '11:00' }]) {
    assert.deepEqual(validarHorario({ ...horario, ...cambio }, [], null), { horaFin: 'La hora de fin debe ser posterior a la de inicio.' })
  }
})

test('detecta solapamientos con bloques activos del mismo día', () => {
  for (const intento of [
    { horaInicio: '10:00', horaFin: '11:00' },
    { horaInicio: '08:00', horaFin: '09:30' },
    { horaInicio: '09:30', horaFin: '10:00' },
    { horaInicio: '08:00', horaFin: '12:00' },
  ]) {
    assert.deepEqual(validarHorario({ ...horario, ...intento }, [bloque, reservado], null), { formulario: 'Ese horario se solapa con otro de tus bloques.' })
  }
  assert.deepEqual(validarHorario({ dia: '2026-11-03', horaInicio: '15:30', horaFin: '16:30' }, [reservado], null), { formulario: 'Ese horario se solapa con otro de tus bloques.' })
})

test('los bordes adyacentes, otros días y los bloques inactivos no se solapan', () => {
  assert.deepEqual(validarHorario({ dia: '2026-11-03', horaInicio: '10:30', horaFin: '11:30' }, [bloque], null), {})
  assert.deepEqual(validarHorario({ dia: '2026-11-03', horaInicio: '08:00', horaFin: '09:00' }, [bloque], null), {})
  assert.deepEqual(validarHorario({ dia: '2026-11-04', horaInicio: '09:00', horaFin: '10:00' }, [bloque, reservado], null), {})
  assert.deepEqual(validarHorario({ dia: '2026-11-05', horaInicio: '11:00', horaFin: '12:00' }, [inactivo], null), {})
})

test('la edición excluye al propio bloque del control de solapamiento', () => {
  assert.deepEqual(validarHorario(horario, [bloque, reservado], '31'), {})
  assert.deepEqual(validarHorario(horario, [bloque], '32'), { formulario: 'Ese horario se solapa con otro de tus bloques.' })
})

test('la carga no se mezcla con el listado ni con el formulario', () => {
  const html = renderPagina({ consulta: { estado: 'cargando' } })
  assert.match(html, /Gestión de disponibilidad/)
  assert.match(html, /Cargando tu disponibilidad…/)
  assert.match(html, /Actualizar listado/)
  assert.match(html, /disabled=""/)
  assert.doesNotMatch(html, /Tus bloques/)
  assert.doesNotMatch(html, /Nuevo bloque/)
  assert.doesNotMatch(html, /role="alert"/)
})

test('el error de consulta se presenta como alerta con su mensaje', () => {
  const html = renderPagina({ consulta: { estado: 'error', mensaje: 'No pudimos cargar tu disponibilidad.' } })
  assert.match(html, /role="alert"/)
  assert.match(html, /No pudimos cargar tu disponibilidad\./)
  assert.doesNotMatch(html, /Tus bloques/)
  assert.doesNotMatch(html, /Cargando tu disponibilidad/)
})

test('los avisos de operación conviven con el listado listo', () => {
  const listo = { estado: 'listo', bloques: [bloque] }
  assert.match(renderPagina({ consulta: listo, mensaje: 'Bloque creado correctamente.' }), /<p role="status">Bloque creado correctamente\.<\/p>/)
  const conFallo = renderPagina({ consulta: listo, errorOperacion: 'Ese horario se solapa con otro bloque.' })
  assert.match(conFallo, /role="alert"/)
  assert.match(conFallo, /Ese horario se solapa con otro bloque\./)
  assert.match(conFallo, /Tus bloques/)
})

test('el estado listo muestra estadísticas, listado y formulario', () => {
  const html = renderPagina({ consulta: { estado: 'listo', bloques: [bloque, reservado, otroDia] } })
  assert.match(html, /Bloques activos/)
  assert.match(html, /Horas registradas/)
  assert.match(html, /Fechas con bloques/)
  assert.match(html, />3 h 30 min</)
  assert.match(html, /Tus bloques/)
  assert.match(html, /3 bloques/)
  assert.match(html, /Nuevo bloque/)
  assert.match(renderPagina({ consulta: { estado: 'listo', bloques: [] } }), /Aún no tienes bloques de disponibilidad/)
})

test('el listado vacío y los bloques inactivos muestran el estado vacío', () => {
  assert.match(renderListado([]), /Aún no tienes bloques de disponibilidad/)
  const html = renderListado([inactivo])
  assert.match(html, /Aún no tienes bloques de disponibilidad/)
  assert.doesNotMatch(html, /11:00/)
})

test('el listado agrupa por fecha ordenada y ordena los bloques por hora', () => {
  const html = renderListado([
    { idBloque: '35', dia: '2026-11-04', horaInicio: '18:00', horaFin: '19:00', estadoBloque: 'DISPONIBLE' },
    reservado,
    bloque,
    { idBloque: '36', dia: '2026-11-03', horaInicio: '07:00', horaFin: '08:00', estadoBloque: 'DISPONIBLE' },
  ])
  assert.equal((html.match(/<time /g) ?? []).length, 2)
  assert.ok(html.indexOf('dateTime="2026-11-03"') < html.indexOf('dateTime="2026-11-04"'))
  assert.ok(html.indexOf('>07:00<') < html.indexOf('>09:00<'))
  assert.ok(html.indexOf('>09:00<') < html.indexOf('>15:00<'))
  assert.ok(html.indexOf('>15:00<') < html.indexOf('>18:00<'))
  assert.match(html, /de noviembre de 2026/)
})

test('los bloques reservados no permiten editar ni eliminar', () => {
  const html = renderListado([reservado])
  assert.match(html, /Reservado/)
  assert.match(html, /Editar/)
  assert.match(html, /Eliminar/)
  assert.equal((html.match(/disabled=""/g) ?? []).length, 2)
})

test('los bloques disponibles ofrecen acciones accesibles y resaltan en edición', () => {
  const html = renderListado([bloque])
  assert.match(html, /Disponible/)
  assert.doesNotMatch(html, /disabled/)
  assert.match(html, /aria-label="Editar bloque del 2026-11-03, 09:00 a 10:30"/)
  assert.match(html, /aria-label="Eliminar bloque del 2026-11-03, 09:00 a 10:30"/)
  assert.match(renderListado([bloque], { idEdicion: '31' }), /is-editing/)
  assert.equal((renderListado([bloque], { guardando: true }).match(/disabled=""/g) ?? []).length, 2)
})

test('el formulario de nuevo bloque parte con horas predeterminadas', () => {
  const html = renderFormulario()
  assert.match(html, /Nuevo bloque/)
  assert.match(html, /Añadir bloque/)
  assert.match(html, /value="09:00"/)
  assert.match(html, /value="10:00"/)
  assert.doesNotMatch(html, /Cancelar edición/)
  assert.doesNotMatch(html, /disabled/)
})

test('el formulario de edición carga los datos del bloque', () => {
  const html = renderFormulario({ bloqueEditado: bloque })
  assert.match(html, /Editar bloque/)
  assert.match(html, /Guardar cambios/)
  assert.match(html, /Cancelar edición/)
  assert.match(html, /value="2026-11-03"/)
  assert.match(html, /value="09:00"/)
  assert.match(html, /value="10:30"/)
})

test('el formulario se bloquea mientras guarda o al editar un bloque reservado', () => {
  const guardando = renderFormulario({ guardando: true })
  assert.match(guardando, /Guardando…/)
  assert.match(guardando, /aria-busy="true"/)
  assert.equal((guardando.match(/disabled=""/g) ?? []).length, 4)
  const reservada = renderFormulario({ bloqueEditado: reservado })
  assert.equal((reservada.match(/disabled=""/g) ?? []).length, 4)
})

test('la ruta de disponibilidad no expone la pantalla sin una sesión de tutor', async () => {
  const html = await renderizarRuta(createElement(MemoryRouter, { initialEntries: ['/disponibilidad'] }, createElement(AppRoutes)))
  assert.equal((html.match(/<header\b/g) ?? []).length, 1)
  assert.doesNotMatch(html, /Cargando página…/)
  assert.doesNotMatch(html, /Gestión de disponibilidad/)
  assert.doesNotMatch(html, /Tus bloques/)
  assert.doesNotMatch(html, /Nuevo bloque/)
})
