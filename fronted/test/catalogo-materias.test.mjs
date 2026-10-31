import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { createServer } from 'vite'

let vite, crearCatalogoMaterias, constantes, obtenerMaterias, ErrorConsultaMaterias, CatalogoMateriasPage
const fetchOriginal = globalThis.fetch
const calculo = { idMateria: '1', codigo: 'MAT101', nombre: 'Cálculo I' }
const programacion = { idMateria: '2', codigo: 'INF110', nombre: 'Programación I' }
const fisica = { idMateria: '3', codigo: 'FIS100', nombre: 'Física I' }

before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  constantes = await vite.ssrLoadModule('/src/features/materias/aplicacion/catalogo-materias.ts')
  ;({ crearCatalogoMaterias } = constantes)
  ;({ obtenerMaterias, ErrorConsultaMaterias } = await vite.ssrLoadModule('/src/features/materias/services/materias-api.ts'))
  ;({ default: CatalogoMateriasPage } = await vite.ssrLoadModule('/src/features/materias/pages/CatalogoMateriasPage.tsx'))
})
afterEach(() => { globalThis.fetch = fetchOriginal })
after(async () => { await vite?.close() })

function crearAlmacenamiento(inicial = {}) {
  const datos = new Map(Object.entries(inicial))
  return {
    datos,
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => { datos.set(clave, String(valor)) },
    removeItem: (clave) => { datos.delete(clave) },
  }
}

// Consulta controlable: cada llamada queda pendiente hasta resolverla o rechazarla desde la prueba.
function crearEscenario({ almacenamiento = null, inicio = Date.parse('2026-10-31T12:00:00Z') } = {}) {
  const reloj = { ahora: inicio }
  const llamadas = []
  const consultar = () => new Promise((resolver, rechazar) => llamadas.push({ resolver, rechazar }))
  const catalogo = crearCatalogoMaterias({ consultar, ahora: () => reloj.ahora, almacenamiento })
  return { catalogo, reloj, llamadas }
}

test('reutiliza los datos vigentes y comparte una sola consulta entre pantallas simultáneas', async () => {
  const { catalogo, llamadas } = crearEscenario()
  assert.deepEqual(catalogo.obtenerEstado(), { materias: null, obtenidoEn: null, actualizando: false, error: null })
  const primera = catalogo.cargar()
  const segunda = catalogo.cargar()
  const forzada = catalogo.cargar({ forzar: true })
  assert.equal(llamadas.length, 1, 'Las cargas simultáneas no duplican la petición')
  assert.equal(catalogo.obtenerEstado().actualizando, true)
  llamadas[0].resolver([calculo])
  await Promise.all([primera, segunda, forzada])
  assert.deepEqual(catalogo.obtenerEstado().materias, [calculo])
  await catalogo.cargar()
  assert.equal(llamadas.length, 1, 'Dentro de la vigencia se reutiliza la copia')
})

test('al vencer se actualiza en segundo plano sin ocultar los datos anteriores', async () => {
  const { catalogo, reloj, llamadas } = crearEscenario()
  const carga = catalogo.cargar()
  llamadas[0].resolver([calculo])
  await carga
  reloj.ahora += constantes.VIGENCIA_CATALOGO_MS - 1
  assert.equal(catalogo.estaVencido(), false)
  reloj.ahora += 1
  assert.equal(catalogo.estaVencido(), true)
  const actualizacion = catalogo.cargar()
  assert.equal(llamadas.length, 2)
  assert.deepEqual(catalogo.obtenerEstado(), { materias: [calculo], obtenidoEn: reloj.ahora - constantes.VIGENCIA_CATALOGO_MS, actualizando: true, error: null })
  llamadas[1].resolver([calculo, programacion])
  await actualizacion
  assert.deepEqual(catalogo.obtenerEstado(), { materias: [calculo, programacion], obtenidoEn: reloj.ahora, actualizando: false, error: null })
})

test('forzar consulta aunque los datos estén vigentes', async () => {
  const { catalogo, llamadas } = crearEscenario()
  const carga = catalogo.cargar()
  llamadas[0].resolver([calculo])
  await carga
  const forzada = catalogo.cargar({ forzar: true })
  assert.equal(llamadas.length, 2)
  llamadas[1].resolver([programacion])
  await forzada
  assert.deepEqual(catalogo.obtenerEstado().materias, [programacion])
})

test('un fallo nunca rechaza la carga y conserva los últimos datos confirmados', async () => {
  const { catalogo, llamadas } = crearEscenario()
  const inicial = catalogo.cargar()
  llamadas[0].rechazar(new ErrorConsultaMaterias('El catálogo no está disponible en este momento. Inténtalo nuevamente.'))
  await inicial
  assert.deepEqual(catalogo.obtenerEstado(), {
    materias: null, obtenidoEn: null, actualizando: false, error: 'El catálogo no está disponible en este momento. Inténtalo nuevamente.',
  })

  const reintento = catalogo.cargar()
  assert.equal(catalogo.obtenerEstado().error, null, 'Reintentar limpia el error anterior')
  llamadas[1].resolver([calculo])
  await reintento

  const fallida = catalogo.cargar({ forzar: true })
  llamadas[2].rechazar(new TypeError('fetch failed'))
  await fallida
  assert.deepEqual(catalogo.obtenerEstado().materias, [calculo])
  assert.match(catalogo.obtenerEstado().error, /No pudimos cargar las materias/)
  assert.doesNotMatch(catalogo.obtenerEstado().error, /fetch failed/)
})

test('guarda la copia y la recupera al recargar la página, validándola antes de usarla', async () => {
  const almacenamiento = crearAlmacenamiento()
  const { catalogo, reloj, llamadas } = crearEscenario({ almacenamiento })
  const carga = catalogo.cargar()
  llamadas[0].resolver([calculo, programacion])
  await carga
  const guardado = JSON.parse(almacenamiento.datos.get(constantes.CLAVE_ALMACENAMIENTO))
  assert.deepEqual(guardado, { obtenidoEn: reloj.ahora, materias: [calculo, programacion] })

  const recargada = crearEscenario({ almacenamiento, inicio: reloj.ahora + 1000 })
  assert.deepEqual(recargada.catalogo.obtenerEstado().materias, [calculo, programacion])
  await recargada.catalogo.cargar()
  assert.equal(recargada.llamadas.length, 0, 'Una copia guardada vigente evita consultar de nuevo')

  const vencida = crearEscenario({ almacenamiento, inicio: reloj.ahora + constantes.VIGENCIA_CATALOGO_MS })
  assert.deepEqual(vencida.catalogo.obtenerEstado().materias, [calculo, programacion], 'Se muestra mientras se actualiza')
  void vencida.catalogo.cargar()
  assert.equal(vencida.llamadas.length, 1)
})

test('descarta copias guardadas antiguas, del futuro o alteradas', () => {
  const ahora = Date.parse('2026-10-31T12:00:00Z')
  const clave = 'stp:catalogo-materias:v1'
  for (const [descripcion, valor] of [
    ['más de 24 horas', JSON.stringify({ obtenidoEn: ahora - constantes.ANTIGUEDAD_MAXIMA_GUARDADA_MS - 1, materias: [calculo] })],
    ['fecha futura', JSON.stringify({ obtenidoEn: ahora + 60000, materias: [calculo] })],
    ['identificador inválido', JSON.stringify({ obtenidoEn: ahora, materias: [{ ...calculo, idMateria: '<script>' }] })],
    ['códigos duplicados', JSON.stringify({ obtenidoEn: ahora, materias: [calculo, { ...programacion, codigo: calculo.codigo }] })],
    ['sin materias', JSON.stringify({ obtenidoEn: ahora })],
    ['JSON inválido', '{no es json'],
  ]) {
    const almacenamiento = crearAlmacenamiento({ [clave]: valor })
    const { catalogo } = crearEscenario({ almacenamiento, inicio: ahora })
    assert.equal(catalogo.obtenerEstado().materias, null, descripcion)
    if (descripcion !== 'JSON inválido') assert.equal(almacenamiento.datos.has(clave), false, descripcion + ' se elimina')
  }
  const extra = crearAlmacenamiento({ [clave]: JSON.stringify({ obtenidoEn: ahora, materias: [{ ...calculo, privado: 'x' }] }) })
  assert.deepEqual(crearEscenario({ almacenamiento: extra, inicio: ahora }).catalogo.obtenerEstado().materias, [calculo])
})

test('funciona en memoria si el almacenamiento del navegador no está disponible', async () => {
  const roto = { getItem() { throw new Error('bloqueado') }, setItem() { throw new Error('lleno') }, removeItem() { throw new Error('bloqueado') } }
  const { catalogo, llamadas } = crearEscenario({ almacenamiento: roto })
  const carga = catalogo.cargar()
  llamadas[0].resolver([calculo])
  await carga
  assert.deepEqual(catalogo.obtenerEstado().materias, [calculo])
})

test('una materia desconocida provoca una actualización, sin repetirla en ráfaga', async () => {
  const { catalogo, reloj, llamadas } = crearEscenario()
  await catalogo.revalidarSiFalta('3')
  assert.equal(llamadas.length, 0, 'Sin datos aún, la carga inicial se encarga')
  const carga = catalogo.cargar()
  llamadas[0].resolver([calculo])
  await carga

  await catalogo.revalidarSiFalta('1')
  await catalogo.revalidarSiFalta('3')
  assert.equal(llamadas.length, 1, 'Una consulta recién hecha no se repite por una materia ausente')

  reloj.ahora += constantes.INTERVALO_MINIMO_REVALIDACION_MS
  const revalidacion = catalogo.revalidarSiFalta('3')
  assert.equal(llamadas.length, 2)
  llamadas[1].resolver([calculo, fisica])
  await revalidacion
  assert.ok(catalogo.obtenerEstado().materias.some((materia) => materia.idMateria === '3'))
  await catalogo.revalidarSiFalta('')
  assert.equal(llamadas.length, 2)
})

test('notifica a las pantallas suscritas y adopta una copia más reciente de otra pestaña', async () => {
  const almacenamiento = crearAlmacenamiento()
  const { catalogo, reloj, llamadas } = crearEscenario({ almacenamiento })
  let notificaciones = 0
  const cancelar = catalogo.suscribir(() => { notificaciones++ })
  const carga = catalogo.cargar()
  llamadas[0].resolver([calculo])
  await carga
  assert.equal(notificaciones, 2, 'Inicio y fin de la consulta')
  const estadoAnterior = catalogo.obtenerEstado()

  almacenamiento.setItem(constantes.CLAVE_ALMACENAMIENTO, JSON.stringify({ obtenidoEn: reloj.ahora - 1, materias: [fisica] }))
  catalogo.sincronizarDesdeAlmacenamiento()
  assert.equal(catalogo.obtenerEstado(), estadoAnterior, 'Una copia más antigua se ignora')

  reloj.ahora += 1000
  almacenamiento.setItem(constantes.CLAVE_ALMACENAMIENTO, JSON.stringify({ obtenidoEn: reloj.ahora, materias: [calculo, fisica] }))
  catalogo.sincronizarDesdeAlmacenamiento()
  assert.deepEqual(catalogo.obtenerEstado().materias, [calculo, fisica])
  assert.equal(notificaciones, 3)
  cancelar()
  void catalogo.cargar({ forzar: true })
  assert.equal(notificaciones, 3, 'Una pantalla desmontada deja de recibir avisos')
})

test('el servicio consulta la API en cada llamada y deja la reutilización a la caché compartida', async () => {
  let llamadas = 0
  globalThis.fetch = async (url) => {
    llamadas++
    assert.equal(url, vite.config.env.VITE_API_BASE_URL.replace(/\/+$/, '') + '/materias-tutores/materias')
    return Response.json([calculo])
  }
  await obtenerMaterias()
  await obtenerMaterias()
  assert.equal(llamadas, 2)
})

test('el catálogo permite actualizar y avisa si falla sin ocultar las materias', () => {
  const render = (propiedades) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(CatalogoMateriasPage, {
    materias: [calculo, programacion], onActualizar() {}, ...propiedades,
  })))
  assert.match(render({}), />Actualizar catálogo</)
  const actualizando = render({ actualizando: true })
  assert.match(actualizando, /disabled="">Actualizando…/)
  assert.match(actualizando, /Cálculo I/)
  const fallo = render({ errorActualizacion: 'El catálogo no está disponible en este momento. Inténtalo nuevamente.' })
  assert.match(fallo, /role="alert">El catálogo no está disponible[^<]*Se muestran las materias consultadas anteriormente/)
  assert.match(fallo, /Programación I/)
  assert.doesNotMatch(render({ cargando: true }), /Actualizar catálogo/)
  assert.doesNotMatch(render({ onActualizar: undefined }), /Actualizar catálogo/)
})
