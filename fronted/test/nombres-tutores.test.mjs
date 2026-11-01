import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { createServer } from 'vite'

let server, obtenerNombresUsuarios, completarNombresTutores, ErrorNombresTutores
const fetchOriginal = globalThis.fetch
const tutor = (idTutor) => ({ idTutor, promedioCalificaciones: null, cantidadCalificaciones: 0, horariosDisponibles: [] })
const responder = (datos, status = 200) => new Response(JSON.stringify(datos), { status, headers: { 'Content-Type': 'application/json' } })

before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ obtenerNombresUsuarios, completarNombresTutores, ErrorNombresTutores } = await server.ssrLoadModule('/src/features/tutores/services/nombres-tutores-api.ts'))
})

afterEach(() => { globalThis.fetch = fetchOriginal })
after(async () => { await server?.close() })

test('consulta los nombres en lote por el Gateway con el JWT y sin repetir IDs', async () => {
  const llamadas = []
  globalThis.fetch = async (url, config) => {
    llamadas.push({ url: new URL(url), config })
    return responder([{ id: '9007199254740995', nombre: ' Camilo Andrades ', carrera: null, semestre_actual: null, biografia: null }])
  }
  const nombres = await obtenerNombresUsuarios(['9007199254740995', '9007199254740995'], 'jwt-de-prueba')
  assert.equal(llamadas.length, 1)
  assert.equal(llamadas[0].url.pathname, '/api/usuarios-auth/usuarios')
  assert.equal(llamadas[0].url.searchParams.get('ids'), '9007199254740995')
  assert.equal(llamadas[0].config.headers.Authorization, 'Bearer jwt-de-prueba')
  assert.deepEqual([...nombres], [['9007199254740995', 'Camilo Andrades']])
})

test('divide más de 100 IDs en varias consultas', async () => {
  const lotes = []
  globalThis.fetch = async (url) => {
    const ids = new URL(url).searchParams.get('ids').split(',')
    lotes.push(ids.length)
    return responder(ids.map((id) => ({ id, nombre: 'Tutor ' + id })))
  }
  const ids = Array.from({ length: 150 }, (_, i) => String(i + 1))
  const nombres = await obtenerNombresUsuarios(ids, 'jwt')
  assert.deepEqual(lotes, [100, 50])
  assert.equal(nombres.size, 150)
})

test('ignora nombres de IDs no pedidos y rechaza respuestas malformadas o IDs inválidos', async () => {
  globalThis.fetch = async () => responder([{ id: '2', nombre: 'Pedido' }, { id: '99', nombre: 'Ajeno' }])
  assert.deepEqual([...await obtenerNombresUsuarios(['2'], 'jwt')], [['2', 'Pedido']])
  globalThis.fetch = async () => responder([{ id: 2, nombre: 'Número en vez de texto' }])
  await assert.rejects(obtenerNombresUsuarios(['2'], 'jwt'), ErrorNombresTutores)
  globalThis.fetch = () => assert.fail('No debe consultar con IDs inválidos')
  await assert.rejects(obtenerNombresUsuarios(['abc'], 'jwt'), ErrorNombresTutores)
})

test('completa el nombre de cada tutor conservando su ID y sus demás datos', async () => {
  globalThis.fetch = async () => responder([{ id: '3', nombre: 'Ana Pérez' }, { id: '2', nombre: 'Camilo Andrades' }])
  const tutores = await completarNombresTutores([tutor('2'), tutor('3'), tutor('4')], 'jwt')
  assert.deepEqual(tutores.map(({ idTutor, nombre }) => [idTutor, nombre]),
    [['2', 'Camilo Andrades'], ['3', 'Ana Pérez'], ['4', undefined]])
})

test('si Auth falla o no hay sesión, los tutores se muestran igual sin nombre', async () => {
  globalThis.fetch = async () => responder({ message: 'error' }, 503)
  assert.deepEqual(await completarNombresTutores([tutor('2')], 'jwt'), [tutor('2')])
  globalThis.fetch = () => assert.fail('Sin token no debe consultar Auth')
  assert.deepEqual(await completarNombresTutores([tutor('2')], undefined), [tutor('2')])
})

test('propaga la cancelación en vez de ocultarla', async () => {
  const controlador = new AbortController()
  controlador.abort()
  await assert.rejects(completarNombresTutores([tutor('2')], 'jwt', controlador.signal))
})
