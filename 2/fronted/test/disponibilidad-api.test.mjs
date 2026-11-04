import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { createServer } from 'vite'

let vite, consultarBloquesDisponibilidad, crearBloqueDisponibilidad, actualizarBloqueDisponibilidad, eliminarBloqueDisponibilidad
const fetchOriginal = globalThis.fetch
const timeoutOriginal = AbortSignal.timeout
const tutor = { token: 'token-tutor-prueba', idUsuario: '12', roles: ['TUTOR'], expiraEn: Date.now() + 3600000 }
const horario = { dia: '2026-11-03', horaInicio: '09:00', horaFin: '10:30' }
const bloque = { idBloque: '9007199254740993', ...horario, estadoBloque: 'DISPONIBLE' }
const reservado = { idBloque: '32', dia: '2026-11-04', horaInicio: '15:00', horaFin: '16:00', estadoBloque: 'RESERVADO' }
const urlBloques = () => vite.config.env.VITE_API_BASE_URL.replace(/\/+$/, '') + '/materias-tutores/disponibilidad/bloques'

before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ consultarBloquesDisponibilidad, crearBloqueDisponibilidad, actualizarBloqueDisponibilidad, eliminarBloqueDisponibilidad } =
    await vite.ssrLoadModule('/src/features/disponibilidad/services/disponibilidad-api.ts'))
})
afterEach(() => { globalThis.fetch = fetchOriginal; AbortSignal.timeout = timeoutOriginal })
after(async () => { await vite?.close() })

test('consulta los bloques por Gateway con Bearer, sin caché y admite el listado vacío', async () => {
  globalThis.fetch = async (url, opciones) => {
    assert.equal(String(url), urlBloques())
    assert.equal(opciones.method, undefined)
    assert.equal(opciones.headers.Authorization, 'Bearer ' + tutor.token)
    assert.equal(opciones.headers.Accept, 'application/json')
    assert.equal(opciones.cache, 'no-store')
    return Response.json([bloque, reservado])
  }
  assert.deepEqual(await consultarBloquesDisponibilidad(tutor), [bloque, reservado])
  globalThis.fetch = async () => Response.json([])
  assert.deepEqual(await consultarBloquesDisponibilidad(tutor), [])
})

test('exige una sesión vigente de tutor antes de consultar, crear, editar o eliminar', async () => {
  globalThis.fetch = () => assert.fail('No debe llamar a la API sin acceso')
  for (const sesion of [{ ...tutor, token: '' }, { ...tutor, expiraEn: 1 },
    { ...tutor, roles: ['ESTUDIANTE'] }, { ...tutor, roles: [] }]) {
    await assert.rejects(consultarBloquesDisponibilidad(sesion), /sesión|tutores/)
    await assert.rejects(crearBloqueDisponibilidad(sesion, horario), /sesión|tutores/)
    await assert.rejects(actualizarBloqueDisponibilidad(sesion, bloque.idBloque, horario), /sesión|tutores/)
    await assert.rejects(eliminarBloqueDisponibilidad(sesion, bloque.idBloque), /sesión|tutores/)
  }
  globalThis.fetch = async () => Response.json([])
  await consultarBloquesDisponibilidad({ ...tutor, roles: ['ESTUDIANTE', 'TUTOR'] })
})

test('rechaza bloques no válidos, duplicados o respuestas que no son un listado', async () => {
  for (const datos of [null, {}, [bloque, bloque],
    [{ ...bloque, idBloque: '0' }], [{ ...bloque, idBloque: '9223372036854775808' }], [{ ...bloque, idBloque: 31 }],
    [{ ...bloque, dia: '2026-02-30' }], [{ ...bloque, dia: '03/11/2026' }],
    [{ ...bloque, horaInicio: '24:00' }], [{ ...bloque, horaFin: '9:00' }], [{ ...bloque, horaInicio: '10:30' }],
    [{ ...bloque, estadoBloque: 'OCUPADO' }], [{ ...bloque, estadoBloque: null }]]) {
    globalThis.fetch = async () => Response.json(datos)
    await assert.rejects(consultarBloquesDisponibilidad(tutor), /El servidor devolvió bloques no válidos/)
  }
  globalThis.fetch = async () => new Response('respuesta que no es JSON')
  await assert.rejects(consultarBloquesDisponibilidad(tutor), /No pudimos leer la respuesta/)
})

test('maneja los errores HTTP de la consulta sin exponer detalles internos', async () => {
  for (const [status, patron] of [[401, /Tu sesión venció/], [403, /No tienes permiso para consultar/],
    [404, /No pudimos consultar tu disponibilidad/], [500, /No pudimos consultar tu disponibilidad/],
    [503, /No pudimos consultar tu disponibilidad/]]) {
    globalThis.fetch = async () => new Response('detalle-interno-privado', { status })
    await assert.rejects(consultarBloquesDisponibilidad(tutor), (error) => {
      assert.match(error.message, patron)
      assert.doesNotMatch(error.message, /detalle-interno-privado/)
      return true
    })
  }
})

test('crea el bloque por Gateway y exige 201 con el horario solicitado', async () => {
  globalThis.fetch = async (url, opciones) => {
    assert.equal(String(url), urlBloques())
    assert.equal(opciones.method, 'POST')
    assert.equal(opciones.headers.Authorization, 'Bearer ' + tutor.token)
    assert.equal(opciones.headers.Accept, 'application/json')
    assert.equal(opciones.headers['Content-Type'], 'application/json')
    assert.deepEqual(JSON.parse(opciones.body), horario)
    return new Response(JSON.stringify({ ...horario, idBloque: '31', estadoBloque: 'DISPONIBLE' }), { status: 201 })
  }
  assert.deepEqual(
    await crearBloqueDisponibilidad(tutor, horario),
    { ...horario, idBloque: '31', estadoBloque: 'DISPONIBLE' },
  )
})

test('traduce 400, 401, 403 y 409 de la creación sin exponer detalles internos', async () => {
  for (const [status, patron] of [[400, /Revisa la fecha y las horas/], [401, /Tu sesión venció/],
    [403, /No tienes permiso para crear/], [409, /se solapa con otro bloque/]]) {
    globalThis.fetch = async () => new Response('detalle-interno-privado', { status })
    await assert.rejects(crearBloqueDisponibilidad(tutor, horario), (error) => {
      assert.match(error.message, patron)
      assert.doesNotMatch(error.message, /detalle-interno-privado/)
      return true
    })
  }
})

test('no da por creado un bloque sin 201 o sin un eco confirmado', async () => {
  for (const respuesta of [
    new Response(JSON.stringify({ ...horario, idBloque: '31', estadoBloque: 'DISPONIBLE' }), { status: 200 }),
    new Response(null, { status: 204 }),
    new Response(JSON.stringify({ ...horario, idBloque: '31', estadoBloque: 'RESERVADO' }), { status: 201 }),
    new Response(JSON.stringify({ ...horario, horaFin: '11:00', idBloque: '31', estadoBloque: 'DISPONIBLE' }), { status: 201 }),
    new Response(JSON.stringify({ idBloque: '31', estadoBloque: 'DISPONIBLE' }), { status: 201 }),
    new Response('no es JSON', { status: 201 }),
  ]) {
    globalThis.fetch = async () => respuesta
    await assert.rejects(crearBloqueDisponibilidad(tutor, horario), /No pudimos confirmar la creación/)
  }
})

test('edita el bloque por Gateway con PATCH y admite cambios parciales', async () => {
  globalThis.fetch = async (url, opciones) => {
    assert.equal(String(url), urlBloques() + '/' + bloque.idBloque)
    assert.equal(opciones.method, 'PATCH')
    assert.equal(opciones.headers.Authorization, 'Bearer ' + tutor.token)
    assert.equal(opciones.headers['Content-Type'], 'application/json')
    const cuerpo = JSON.parse(opciones.body)
    assert.deepEqual(cuerpo, { horaInicio: '10:00', horaFin: '11:30' })
    assert.ok(!('dia' in cuerpo))
    return Response.json({ ...bloque, horaInicio: '10:00', horaFin: '11:30' })
  }
  assert.deepEqual(
    await actualizarBloqueDisponibilidad(tutor, bloque.idBloque, { horaInicio: '10:00', horaFin: '11:30' }),
    { ...bloque, horaInicio: '10:00', horaFin: '11:30' },
  )
})

test('rechaza identificadores no válidos y ediciones vacías antes de llamar a la API', async () => {
  globalThis.fetch = () => assert.fail('No debe llamar a la API con datos inválidos')
  for (const idBloque of ['', '0', '31a', '../31', '9223372036854775808', 31, null]) {
    await assert.rejects(actualizarBloqueDisponibilidad(tutor, idBloque, horario), /identificador del bloque no es válido/)
    await assert.rejects(eliminarBloqueDisponibilidad(tutor, idBloque), /identificador del bloque no es válido/)
  }
  await assert.rejects(actualizarBloqueDisponibilidad(tutor, bloque.idBloque, {}), /Indica al menos un campo/)
})

test('traduce los estados HTTP de la edición sin exponer detalles internos', async () => {
  for (const [status, patron] of [[400, /Revisa la fecha y las horas/], [401, /Tu sesión venció/],
    [403, /No tienes permiso para editar/], [404, /El bloque no se encontró/],
    [409, /cambió o no permite modificaciones/], [500, /No pudimos confirmar la edición/]]) {
    globalThis.fetch = async () => new Response('detalle-interno-privado', { status })
    await assert.rejects(actualizarBloqueDisponibilidad(tutor, bloque.idBloque, horario), (error) => {
      assert.match(error.message, patron)
      assert.doesNotMatch(error.message, /detalle-interno-privado/)
      return true
    })
  }
})

test('no da por editado un bloque sin un eco confirmado', async () => {
  for (const respuesta of [
    Response.json({ ...bloque, idBloque: '32' }),
    Response.json({ ...bloque, estadoBloque: 'RESERVADO' }),
    Response.json({ ...bloque, dia: '2026-11-04' }),
    new Response(null, { status: 204 }),
    new Response('no es JSON'),
  ]) {
    globalThis.fetch = async () => respuesta
    await assert.rejects(actualizarBloqueDisponibilidad(tutor, bloque.idBloque, { dia: '2026-11-03' }), /No pudimos confirmar la edición/)
  }
})

test('elimina el bloque por Gateway y exige la baja lógica INACTIVO', async () => {
  globalThis.fetch = async (url, opciones) => {
    assert.equal(String(url), urlBloques() + '/' + bloque.idBloque)
    assert.equal(opciones.method, 'DELETE')
    assert.equal(opciones.headers.Authorization, 'Bearer ' + tutor.token)
    assert.equal(opciones.headers.Accept, 'application/json')
    return Response.json({ ...bloque, estadoBloque: 'INACTIVO' })
  }
  assert.deepEqual(await eliminarBloqueDisponibilidad(tutor, bloque.idBloque), { ...bloque, estadoBloque: 'INACTIVO' })
})

test('traduce los estados HTTP de la eliminación sin exponer detalles internos', async () => {
  for (const [status, patron] of [[401, /Tu sesión venció/], [403, /No tienes permiso para eliminar/],
    [404, /El bloque no se encontró/], [409, /no permite su eliminación/],
    [500, /No pudimos confirmar la eliminación/]]) {
    globalThis.fetch = async () => new Response('detalle-interno-privado', { status })
    await assert.rejects(eliminarBloqueDisponibilidad(tutor, bloque.idBloque), (error) => {
      assert.match(error.message, patron)
      assert.doesNotMatch(error.message, /detalle-interno-privado/)
      return true
    })
  }
})

test('no da por eliminado un bloque sin una confirmación coherente', async () => {
  for (const respuesta of [
    Response.json({ ...bloque, estadoBloque: 'DISPONIBLE' }),
    Response.json({ ...bloque, idBloque: '32', estadoBloque: 'INACTIVO' }),
    new Response(null, { status: 204 }),
    new Response('no es JSON'),
  ]) {
    globalThis.fetch = async () => respuesta
    await assert.rejects(eliminarBloqueDisponibilidad(tutor, bloque.idBloque), /No pudimos confirmar la eliminación/)
  }
})

test('cancela las operaciones con la señal externa sin repetirlas', async () => {
  for (const operacion of [
    (sesion, signal) => consultarBloquesDisponibilidad(sesion, signal),
    (sesion, signal) => crearBloqueDisponibilidad(sesion, horario, signal),
    (sesion, signal) => actualizarBloqueDisponibilidad(sesion, bloque.idBloque, horario, signal),
    (sesion, signal) => eliminarBloqueDisponibilidad(sesion, bloque.idBloque, signal),
  ]) {
    const controlador = new AbortController()
    let llamadas = 0
    globalThis.fetch = (_url, { signal }) => new Promise((_resolve, reject) => {
      llamadas++
      signal.addEventListener('abort', () => reject(signal.reason), { once: true })
    })
    const solicitud = operacion(tutor, controlador.signal)
    controlador.abort()
    await assert.rejects(solicitud, { name: 'AbortError' })
    await assert.rejects(operacion(tutor, controlador.signal), { name: 'AbortError' })
    assert.equal(llamadas, 1)
  }
})

test('distingue los fallos de red de los tiempos de espera en cada operación', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(consultarBloquesDisponibilidad(tutor), /No pudimos conectar con el servidor/)
  await assert.rejects(crearBloqueDisponibilidad(tutor, horario), /No pudimos confirmar la creación/)
  await assert.rejects(actualizarBloqueDisponibilidad(tutor, bloque.idBloque, horario), /No pudimos confirmar la edición/)
  await assert.rejects(eliminarBloqueDisponibilidad(tutor, bloque.idBloque), /No pudimos confirmar la eliminación/)
  AbortSignal.timeout = () => AbortSignal.abort(new DOMException('Tiempo agotado', 'TimeoutError'))
  globalThis.fetch = async (_url, { signal }) => { signal.throwIfAborted() }
  await assert.rejects(consultarBloquesDisponibilidad(tutor), /La consulta tardó demasiado/)
  await assert.rejects(crearBloqueDisponibilidad(tutor, horario), /No pudimos confirmar la creación/)
  await assert.rejects(actualizarBloqueDisponibilidad(tutor, bloque.idBloque, horario), /No pudimos confirmar la edición/)
  await assert.rejects(eliminarBloqueDisponibilidad(tutor, bloque.idBloque), /No pudimos confirmar la eliminación/)
})
