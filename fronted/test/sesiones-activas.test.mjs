import assert from 'node:assert/strict'
import { before, after, afterEach, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { createServer } from 'vite'
import { renderizarRuta } from './helpers/renderizar-ruta.mjs'

let vite
let consultarSesionesActivas
let ErrorConsultaSesiones
let seleccionarSesionesActivas
let etiquetarEstadoActivo
let SesionesActivas
let AppRoutes
const originalFetch = globalThis.fetch
const tuteeId = '9007199254740993'
const crearToken = (cambios = {}) => [
  { alg: 'HS256', typ: 'JWT' },
  { sub: tuteeId, exp: Math.floor(Date.now() / 1000) + 3600, roles: ['ESTUDIANTE'], iss: 'stp-usuarios-auth', aud: 'stp-clients', ...cambios },
].map((parte) => Buffer.from(JSON.stringify(parte)).toString('base64url')).join('.') + '.firma-de-prueba'
const token = crearToken()
const sesion = { token, idUsuario: tuteeId, roles: ['ESTUDIANTE'], expiraEn: Date.now() + 3600000 }
const activa = {
  id_sesion: '81', id_tutor: '12', id_tutee: tuteeId, id_materia: '3', id_bloque: '26', estado_sesion: 'CONFIRMADA',
  inicio: '2026-10-23T18:00:00.000Z', fin: '2026-10-23T19:00:00.000Z',
  fecha_creacion: '2026-10-21T10:00:00.000Z', fecha_actualizacion: '2026-10-21T10:00:00.000Z', resultado_provisional: false,
}

before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ consultarSesionesActivas, ErrorConsultaSesiones } = await vite.ssrLoadModule('/src/features/sesiones/services/sesiones-api.ts'))
  ;({ seleccionarSesionesActivas, etiquetarEstadoActivo } = await vite.ssrLoadModule('/src/features/sesiones/utils/sesiones-activas.ts'))
  ;({ SesionesActivas } = await vite.ssrLoadModule('/src/features/sesiones/components/SesionesActivas.tsx'))
  ;({ AppRoutes } = await vite.ssrLoadModule('/src/app/AppRoutes.tsx'))
})
afterEach(() => { globalThis.fetch = originalFetch })
after(async () => { await vite?.close() })

test('selecciona solo las sesiones activas del estudiante y las ordena por inicio', () => {
  const sesiones = [
    { ...activa, id_sesion: '82', estado_sesion: 'PENDIENTE', inicio: '2026-10-24T18:00:00.000Z', fin: '2026-10-24T19:00:00.000Z' },
    { ...activa, id_sesion: '83', estado_sesion: 'COMPLETADA' },
    { ...activa, id_sesion: '84', id_tutee: '15' },
    { ...activa, id_sesion: '85', estado_sesion: 'CANCELADA' },
    activa,
  ]
  assert.deepEqual(seleccionarSesionesActivas(sesiones, tuteeId).map((item) => item.id_sesion), ['81', '82'])
  assert.equal(etiquetarEstadoActivo('PENDIENTE_CIERRE'), 'Por cerrar')
  assert.equal(etiquetarEstadoActivo('COMPLETADA'), 'COMPLETADA')
})

test('consulta el historial por Gateway con Bearer, sin inventar una ruta propia del estudiante', async () => {
  globalThis.fetch = async (url, config) => {
    assert.equal(String(url), vite.config.env.VITE_API_BASE_URL.replace(/\/+$/, '') + '/agendamiento-sesiones/sessions/history')
    assert.equal(config.headers.Authorization, 'Bearer ' + token)
    assert.equal(config.headers.Accept, 'application/json')
    assert.equal(config.method, undefined)
    return Response.json([activa, { ...activa, id_sesion: '86', estado_sesion: 'EXPIRADA' }, { ...activa, id_sesion: '87', id_tutee: '15' }])
  }
  assert.deepEqual(await consultarSesionesActivas(sesion), [activa])
})

test('el historial vacío es un resultado válido', async () => {
  globalThis.fetch = async () => Response.json([])
  assert.deepEqual(await consultarSesionesActivas(sesion), [])
})

test('bloquea sesiones ausentes, vencidas o sin rol de estudiante antes de consultar', async () => {
  globalThis.fetch = () => { assert.fail('No debe consultar') }
  for (const entrada of [{ ...sesion, token: '' }, { ...sesion, expiraEn: 1 }, { ...sesion, idUsuario: 'abc' }]) {
    await assert.rejects(consultarSesionesActivas(entrada), (error) => error.tipo === 'sesion')
  }
  await assert.rejects(consultarSesionesActivas({ ...sesion, roles: ['TUTOR'] }), (error) => error.tipo === 'permiso')
})

test('maneja 401, 403 y fallos de los servicios sin exponer detalles privados', async () => {
  for (const [status, tipo] of [[401, 'sesion'], [403, 'permiso'], [500, 'consulta'], [504, 'consulta']]) {
    globalThis.fetch = async () => new Response('detalle-privado', { status })
    await assert.rejects(consultarSesionesActivas(sesion), (error) => {
      assert.ok(error instanceof ErrorConsultaSesiones)
      assert.equal(error.tipo, tipo)
      assert.doesNotMatch(error.message, /detalle-privado/)
      return true
    })
  }
})

test('rechaza respuestas inválidas, duplicados y fechas imposibles', async () => {
  for (const datos of [{ items: [] }, null, [activa, activa], [{ ...activa, inicio: '2026-02-30T18:00:00.000Z' }],
    [{ ...activa, estado_sesion: 'POR_CALIFICAR' }]]) {
    globalThis.fetch = async () => Response.json(datos)
    await assert.rejects(consultarSesionesActivas(sesion), /leer las sesiones/)
  }
  globalThis.fetch = async () => new Response('no es JSON')
  await assert.rejects(consultarSesionesActivas(sesion), /leer las sesiones/)
})

const renderPanel = (consulta, opciones = {}) => renderToStaticMarkup(createElement(MemoryRouter, null,
  createElement(SesionesActivas, { consulta, onRecargar() {}, ...opciones })))

test('presenta carga, error con reintento, acceso y ausencia de sesiones sin mezclar estados', () => {
  const carga = renderPanel({ estado: 'cargando' })
  assert.match(carga, /Cargando tus sesiones/)
  assert.doesNotMatch(carga, /Sesiones activas \(/)
  const error = renderPanel({ estado: 'error', tipo: 'consulta', mensaje: 'Servicio temporalmente no disponible' })
  assert.match(error, /role="alert"/)
  assert.match(error, />Reintentar<\/button>/)
  assert.doesNotMatch(error, /No tienes sesiones activas/)
  assert.match(renderPanel({ estado: 'listo', sesiones: [] }), /No tienes sesiones activas/)
  assert.match(renderPanel({ estado: 'cargando' }, { acceso: 'sesion' }), /href="\/login"/)
  assert.match(renderPanel({ estado: 'cargando' }, { acceso: 'permiso' }), /Esta sección es para estudiantes/)
})

test('muestra las sesiones activas con materia, tutor, horario y estado', () => {
  const html = renderPanel({ estado: 'listo', sesiones: [activa] }, {
    materias: [{ idMateria: '3', codigo: 'MAT1188', nombre: 'Cálculo intermedio' }],
  })
  assert.match(html, /Sesiones activas \(1\)/)
  assert.match(html, /Cálculo intermedio · MAT1188/)
  assert.match(html, /Tutor #12/)
  assert.match(html, /Confirmada/)
  assert.match(html, />Actualizar<\/button>/)
  assert.doesNotMatch(html, /<header|<footer|Diego Muñoz|Martina Rojas/)
  assert.match(renderPanel({ estado: 'listo', sesiones: [activa] }), /Materia #3/)
})

test('registra la ruta del panel del estudiante dentro del layout compartido', async () => {
  const html = await renderizarRuta(createElement(MemoryRouter, { initialEntries: ['/panel'] }, createElement(AppRoutes)))
  assert.match(html, /Mi panel/)
  assert.match(html, /Inicia sesión para ver tus sesiones/)
  assert.equal((html.match(/<header\b/g) ?? []).length, 1)
  assert.equal((html.match(/<main\b/g) ?? []).length, 1)
})

test('la navegación del estudiante incluye el panel y la del tutor no', async () => {
  const { obtenerNavegacion } = await vite.ssrLoadModule('/src/shared/layout/configuracion-navegacion.ts')
  assert.ok(obtenerNavegacion(['ESTUDIANTE']).some((enlace) => enlace.destino === '/panel'))
  assert.ok(!obtenerNavegacion(['TUTOR']).some((enlace) => enlace.destino === '/panel'))
})
