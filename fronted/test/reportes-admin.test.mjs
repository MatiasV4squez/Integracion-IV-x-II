import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { createServer } from 'vite'
import { renderizarRuta } from './helpers/renderizar-ruta.mjs'

let vite, consultarReportesAdmin, resolverReporte, reactivarSuspension, ErrorModeracionReporte
let ReportesAdminPage, ReportesAdminContainer, AppRoutes, obtenerNavegacion
let leerFiltrosReportes, parametrosDeFiltros, esFechaFiltro, esFechaIso
const fetchOriginal = globalThis.fetch
const urlBase = () => vite.config.env.VITE_API_BASE_URL.replace(/\/+$/, '')

const administrador = {
  token: 'token-administrador-de-prueba', idUsuario: '9007199254740993',
  roles: ['ADMINISTRADOR'], expiraEn: Date.now() + 3600000,
}
const pendiente = {
  id: 5, titulo: 'No llegó a la sesión acordada', descripcion: 'Esperé 30 minutos y no se presentó.',
  estado: 'PENDIENTE', idSesion: '77', usuarioReportadorId: '23', usuarioReportadoId: '31',
  motivo: null, resueltoPorId: null, resueltoEn: null, reactivadoPorId: null, reactivadoEn: null,
  creadoEn: '2026-11-20T15:00:00.000Z',
}
const advertido = {
  ...pendiente, id: 6, estado: 'ADVERTIDO', motivo: 'Primera falta',
  resueltoPorId: administrador.idUsuario, resueltoEn: '2026-11-21T15:00:00.000Z',
}
const desestimado = {
  ...pendiente, id: 9, estado: 'DESESTIMADO',
  resueltoPorId: administrador.idUsuario, resueltoEn: '2026-11-21T17:00:00.000Z',
}
const suspendido = {
  ...pendiente, id: 7, estado: 'SUSPENDIDO', motivo: 'Reincidencia',
  resueltoPorId: administrador.idUsuario, resueltoEn: '2026-11-21T16:00:00.000Z',
}
const reactivado = {
  ...suspendido, id: 8,
  reactivadoPorId: administrador.idUsuario, reactivadoEn: '2026-11-22T10:00:00.000Z',
}
const conflictoCrudo = {
  id_aviso: 'aviso-1', fecha_aviso: '2026-11-20T10:00:00.000Z', id_sesion: '77',
  contenido: {
    tipo: 'CONFLICTO_DETECTADO', id_sesion: '77', id_tutor: '31', id_tutee: '23', id_materia: '3',
    fecha_conflicto: '2026-11-19T18:00:00.000Z',
    declaraciones: [
      { id_declaracion: 'd-1', id_usuario: '31', resultado_declarado: 'COMPLETADA', id_usuario_inasistente: null, fecha_declaracion: '2026-11-19T20:00:00.000Z' },
      { id_declaracion: 'd-2', id_usuario: '23', resultado_declarado: 'INASISTENCIA', id_usuario_inasistente: '31', fecha_declaracion: '2026-11-19T20:05:00.000Z' },
    ],
  },
}
const conflictoPublico = {
  idAviso: 'aviso-1', fechaAviso: '2026-11-20T10:00:00.000Z', idSesion: '77',
  idTutor: '31', idTutee: '23', idMateria: '3', fechaConflicto: '2026-11-19T18:00:00.000Z',
  declaraciones: [
    { idDeclaracion: 'd-1', idUsuario: '31', resultadoDeclarado: 'COMPLETADA', idUsuarioInasistente: null, fechaDeclaracion: '2026-11-19T20:00:00.000Z' },
    { idDeclaracion: 'd-2', idUsuario: '23', resultadoDeclarado: 'INASISTENCIA', idUsuarioInasistente: '31', fechaDeclaracion: '2026-11-19T20:05:00.000Z' },
  ],
}
const paginacionCruda = { pagina: 1, limite: 10, total: 1, total_paginas: 1 }
const diferida = () => {
  let resolver
  const promesa = new Promise((resolve) => { resolver = resolve })
  return { promesa, resolver }
}
const acciones = { onRecargar() {}, onFiltrar() {}, onCambiarPagina() {}, onResolver() {}, onReactivar() {} }
const pagina = (consulta, extras = {}) => renderToStaticMarkup(createElement(MemoryRouter, null,
  createElement(ReportesAdminPage, { consulta, filtros: { pagina: 1 }, ...acciones, ...extras })))
const listo = (reportes, conflictos = [], paginacion = paginacionCruda) => ({
  estado: 'listo', reportes, conflictos,
  paginacion: {
    pagina: paginacion.pagina, limite: paginacion.limite,
    total: paginacion.total, totalPaginas: paginacion.total_paginas,
  },
})

before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ consultarReportesAdmin, resolverReporte, reactivarSuspension, ErrorModeracionReporte } = await vite.ssrLoadModule('/src/features/reportes/index.ts'))
  ;({ default: ReportesAdminPage } = await vite.ssrLoadModule('/src/features/reportes/pages/ReportesAdminPage.tsx'))
  ;({ default: ReportesAdminContainer } = await vite.ssrLoadModule('/src/features/reportes/containers/ReportesAdminContainer.tsx'))
  ;({ AppRoutes } = await vite.ssrLoadModule('/src/app/AppRoutes.tsx'))
  ;({ obtenerNavegacion } = await vite.ssrLoadModule('/src/shared/layout/configuracion-navegacion.ts'))
  ;({ leerFiltrosReportes, parametrosDeFiltros, esFechaFiltro } = await vite.ssrLoadModule('/src/features/reportes/utils/leer-parametros-reportes.ts'))
  ;({ esFechaIso } = await vite.ssrLoadModule('/src/features/reportes/utils/validar-reporte.ts'))
})
afterEach(() => { globalThis.fetch = fetchOriginal })
after(async () => { await vite?.close() })

test('consulta el listado por el Gateway con filtros, Bearer y sin caché, reconstruyendo solo campos públicos', async () => {
  let llamada
  globalThis.fetch = async (url, opciones) => {
    llamada = { url: String(url), opciones }
    return Response.json({
      datos: [{ ...pendiente, campoInterno: 'privado' }],
      paginacion: paginacionCruda,
      conflictos_sesion: [conflictoCrudo],
    })
  }
  const resultado = await consultarReportesAdmin(administrador, {
    estado: 'PENDIENTE', fechaDesde: '2026-11-01', fechaHasta: '2026-11-20', pagina: 1,
  })
  assert.equal(llamada.url, urlBase() + '/reportes-moderacion/reportes/admin?estado=PENDIENTE&fecha_desde=2026-11-01&fecha_hasta=2026-11-20&pagina=1&limite=10')
  assert.equal(llamada.opciones.headers.Authorization, 'Bearer ' + administrador.token)
  assert.equal(llamada.opciones.headers.Accept, 'application/json')
  assert.equal(llamada.opciones.cache, 'no-store')
  assert.ok(llamada.opciones.signal instanceof AbortSignal)
  assert.deepEqual(resultado.reportes, [pendiente])
  assert.deepEqual(resultado.paginacion, { pagina: 1, limite: 10, total: 1, totalPaginas: 1 })
  assert.deepEqual(resultado.conflictos, [conflictoPublico])
})

test('omite filtros ausentes y usa la paginación por defecto', async () => {
  let url
  globalThis.fetch = async (destino) => {
    url = String(destino)
    return Response.json({ datos: [], paginacion: { pagina: 1, limite: 10, total: 0, total_paginas: 0 }, conflictos_sesion: [] })
  }
  const resultado = await consultarReportesAdmin(administrador, {})
  assert.equal(url, urlBase() + '/reportes-moderacion/reportes/admin?pagina=1&limite=10')
  assert.deepEqual(resultado.reportes, [])
  assert.deepEqual(resultado.paginacion, { pagina: 1, limite: 10, total: 0, totalPaginas: 0 })
})

test('rechaza listados malformados sin convertirlos en un panel vacío', async () => {
  const valido = { datos: [pendiente], paginacion: paginacionCruda, conflictos_sesion: [conflictoCrudo] }
  for (const datos of [
    null, [], 'texto', {},
    { ...valido, datos: 'no-es-array' },
    { ...valido, datos: [{ ...pendiente, id: '5' }] },
    { ...valido, datos: [{ ...pendiente, id: 0 }] },
    { ...valido, datos: [{ ...pendiente, estado: 'CERRADO' }] },
    { ...valido, datos: [{ ...pendiente, titulo: '   ' }] },
    { ...valido, datos: [{ ...pendiente, idSesion: '0' }] },
    { ...valido, datos: [{ ...pendiente, usuarioReportadoId: '9223372036854775808' }] },
    { ...valido, datos: [{ ...pendiente, creadoEn: '2026-11-20' }] },
    { ...valido, datos: [{ ...pendiente, creadoEn: '2026-02-30T15:00:00.000Z' }] },
    { ...valido, datos: [{ ...advertido, resueltoEn: null }] },
    { ...valido, datos: [{ ...pendiente, estado: 'ADVERTIDO', resueltoPorId: '9', resueltoEn: '2026-11-21T15:00:00.000Z', reactivadoEn: '2026-11-22T10:00:00.000Z', reactivadoPorId: '9' }] },
    { ...valido, datos: [pendiente, pendiente] },
    { ...valido, paginacion: { pagina: 0, limite: 10, total: 1, total_paginas: 1 } },
    { ...valido, paginacion: { pagina: 1, limite: 101, total: 1, total_paginas: 1 } },
    { ...valido, paginacion: { pagina: 1, limite: 10, total: 25, total_paginas: 2 } },
    { ...valido, conflictos_sesion: [{ ...conflictoCrudo, contenido: { ...conflictoCrudo.contenido, tipo: 'OTRO_TIPO' } }] },
    { ...valido, conflictos_sesion: [{ ...conflictoCrudo, contenido: { ...conflictoCrudo.contenido, declaraciones: [] } }] },
    { ...valido, conflictos_sesion: [{ ...conflictoCrudo, contenido: { ...conflictoCrudo.contenido, id_tutor: '0' } }] },
    { ...valido, conflictos_sesion: [conflictoCrudo, conflictoCrudo] },
  ]) {
    globalThis.fetch = async () => Response.json(datos)
    await assert.rejects(consultarReportesAdmin(administrador, {}), /datos de reportes no válidos/)
  }
})

test('clasifica los errores de la consulta sin filtrar cuerpos internos y exige administrador antes de pedir', async () => {
  globalThis.fetch = () => assert.fail('No debe consultar sin sesión o permiso')
  for (const sesion of [null, undefined, { ...administrador, token: '' }, { ...administrador, token: ' ' },
    { ...administrador, expiraEn: 1 }, { ...administrador, expiraEn: NaN }, { ...administrador, idUsuario: '0' }]) {
    await assert.rejects(consultarReportesAdmin(sesion, {}), /sesión no es válida/)
  }
  for (const roles of [[], ['TUTOR'], ['ESTUDIANTE'], null]) {
    await assert.rejects(consultarReportesAdmin({ ...administrador, roles }, {}), /cuenta de administrador/)
  }

  globalThis.fetch = async () => new Response('detalle-interno-privado', { status: 401 })
  await assert.rejects(consultarReportesAdmin(administrador, {}), /sesión no es válida/)
  globalThis.fetch = async () => new Response('detalle-interno-privado', { status: 403 })
  await assert.rejects(consultarReportesAdmin(administrador, {}), /No tienes autorización/)
  globalThis.fetch = async () => new Response('detalle-interno-privado', { status: 504 })
  await assert.rejects(consultarReportesAdmin(administrador, {}), /tardó demasiado/)
  globalThis.fetch = async () => new Response('detalle-interno-privado', { status: 500 })
  await assert.rejects(consultarReportesAdmin(administrador, {}), (error) => {
    assert.match(error.message, /No se pudieron cargar los reportes/)
    assert.doesNotMatch(error.message, /detalle-interno-privado/)
    return true
  })
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(consultarReportesAdmin(administrador, {}), /No pudimos conectar con el servidor/)
  globalThis.fetch = async () => new Response('no es JSON')
  await assert.rejects(consultarReportesAdmin(administrador, {}), /No se pudieron leer los reportes/)
})

test('cancela la consulta antes de enviar con una señal ya cancelada', async () => {
  globalThis.fetch = () => assert.fail('Una señal cancelada no debe consultar')
  const cancelado = new AbortController()
  cancelado.abort()
  await assert.rejects(consultarReportesAdmin(administrador, {}, cancelado.signal), { name: 'AbortError' })
})

test('resuelve con PATCH al Gateway, Bearer y cuerpo mínimo, y confirma solo la respuesta esperada', async () => {
  let llamada
  globalThis.fetch = async (url, opciones) => {
    llamada = { url: String(url), opciones }
    return Response.json({ ...advertido, campoInterno: 'privado' })
  }
  const resultado = await resolverReporte(6, { estado: 'ADVERTIDO', motivo: '  Primera falta  ' }, administrador)
  assert.equal(llamada.url, urlBase() + '/reportes-moderacion/reportes/6/resolucion')
  assert.equal(llamada.opciones.method, 'PATCH')
  assert.equal(llamada.opciones.headers.Authorization, 'Bearer ' + administrador.token)
  assert.equal(llamada.opciones.headers.Accept, 'application/json')
  assert.equal(llamada.opciones.headers['Content-Type'], 'application/json')
  assert.deepEqual(JSON.parse(llamada.opciones.body), { estado: 'ADVERTIDO', motivo: 'Primera falta' })
  assert.deepEqual(resultado, advertido)
})

test('omite el motivo ausente y valida estados, motivos e identificadores sin enviar PATCH', async () => {
  globalThis.fetch = async (_url, opciones) => {
    assert.deepEqual(JSON.parse(opciones.body), { estado: 'DESESTIMADO' })
    return Response.json(desestimado)
  }
  assert.deepEqual(await resolverReporte(9, { estado: 'DESESTIMADO' }, administrador), desestimado)

  globalThis.fetch = async (_url, opciones) => {
    const cuerpo = JSON.parse(opciones.body)
    return Response.json({
      ...pendiente, id: 5, estado: cuerpo.estado, motivo: cuerpo.motivo ?? null,
      resueltoPorId: administrador.idUsuario, resueltoEn: '2026-11-21T15:00:00.000Z',
    })
  }
  const largo = 'a'.repeat(500)
  assert.equal((await resolverReporte(5, { estado: 'ADVERTIDO', motivo: largo }, administrador)).motivo, largo)

  globalThis.fetch = () => assert.fail('No debe enviar datos inválidos')
  for (const motivo of ['', '   ', 'a'.repeat(501), null, 5]) {
    await assert.rejects(resolverReporte(5, { estado: 'ADVERTIDO', motivo }, administrador), (error) => error.tipo === 'validacion')
  }
  for (const estado of ['PENDIENTE', 'CERRADO', '', null, undefined]) {
    await assert.rejects(resolverReporte(5, { estado }, administrador), (error) => error.tipo === 'validacion')
  }
  for (const id of [0, -1, 1.5, NaN, Infinity, '5', null, undefined]) {
    await assert.rejects(resolverReporte(id, { estado: 'ADVERTIDO' }, administrador), (error) => error.tipo === 'validacion')
    await assert.rejects(reactivarSuspension(id, administrador), (error) => error.tipo === 'validacion')
  }
})

test('impide moderar sin sesión válida o sin permiso antes de consultar la API', async () => {
  globalThis.fetch = () => assert.fail('No debe hacer una petición sin acceso')
  for (const sesion of [null, undefined, { ...administrador, token: '' }, { ...administrador, expiraEn: 1 },
    { ...administrador, expiraEn: NaN }, { ...administrador, idUsuario: '0' }, { ...administrador, idUsuario: '9223372036854775808' }]) {
    await assert.rejects(resolverReporte(5, { estado: 'ADVERTIDO' }, sesion), (error) => error.tipo === 'sesion' && !error.requiereActualizar)
    await assert.rejects(reactivarSuspension(8, sesion), (error) => error.tipo === 'sesion')
  }
  for (const roles of [[], ['TUTOR'], ['ESTUDIANTE'], null]) {
    await assert.rejects(resolverReporte(5, { estado: 'ADVERTIDO' }, { ...administrador, roles }), (error) => error.tipo === 'permiso')
    await assert.rejects(reactivarSuspension(8, { ...administrador, roles }), (error) => error.tipo === 'permiso')
  }
  globalThis.fetch = async (_url, opciones) => {
    const cuerpo = opciones.body === undefined ? { estado: 'SUSPENDIDO' } : JSON.parse(opciones.body)
    return Response.json({
      ...pendiente, id: 5, estado: cuerpo.estado, motivo: cuerpo.motivo ?? null,
      resueltoPorId: administrador.idUsuario, resueltoEn: '2026-11-21T15:00:00.000Z',
    })
  }
  for (const roles of [['ADMIN'], [' administrador '], ['TUTOR', 'admin']]) {
    await resolverReporte(5, { estado: 'SUSPENDIDO' }, { ...administrador, roles })
  }
})

test('clasifica errores HTTP de resolución sin filtrar cuerpos y señala cuándo actualizar', async () => {
  for (const [estado, tipo, actualizar] of [[400, 'validacion', false], [401, 'sesion', false], [403, 'permiso', false],
    [404, 'no-encontrado', true], [409, 'conflicto', true],
    [500, 'resultado-incierto', true], [502, 'resultado-incierto', true], [504, 'resultado-incierto', true]]) {
    let llamadas = 0
    globalThis.fetch = async () => { llamadas++; return new Response('detalle-interno-privado', { status: estado }) }
    await assert.rejects(resolverReporte(5, { estado: 'ADVERTIDO' }, administrador), (error) => {
      assert.ok(error instanceof ErrorModeracionReporte)
      assert.equal(error.tipo, tipo)
      assert.equal(error.accion, 'resolver')
      assert.equal(error.estadoHttp, estado)
      assert.equal(error.requiereActualizar, actualizar)
      assert.doesNotMatch(error.message, /detalle-interno-privado/)
      return true
    })
    assert.equal(llamadas, 1)
  }
})

test('un 503 de usuarios-auth es un fallo seguro de la cuenta y no bloquea el reintento', async () => {
  let llamadas = 0
  globalThis.fetch = async () => {
    llamadas++
    return Response.json({ statusCode: 503, code: 'USUARIOS_AUTH_UNAVAILABLE', message: 'interno' }, { status: 503 })
  }
  await assert.rejects(resolverReporte(5, { estado: 'SUSPENDIDO' }, administrador), (error) => {
    assert.equal(error.tipo, 'cuenta-no-actualizada')
    assert.equal(error.requiereActualizar, false)
    assert.match(error.message, /No se pudo suspender la cuenta/)
    assert.doesNotMatch(error.message, /interno/)
    return true
  })
  await assert.rejects(reactivarSuspension(8, administrador), (error) => {
    assert.equal(error.tipo, 'cuenta-no-actualizada')
    assert.match(error.message, /No se pudo reactivar la cuenta/)
    return true
  })
  assert.equal(llamadas, 2)

  globalThis.fetch = async () => Response.json({ statusCode: 503, code: 'REPORT_AUTH_UNAVAILABLE' }, { status: 503 })
  await assert.rejects(resolverReporte(5, { estado: 'ADVERTIDO' }, administrador), (error) => error.tipo === 'verificacion-servidor' && !error.requiereActualizar)

  globalThis.fetch = async () => new Response('servicio sin configurar', { status: 503 })
  await assert.rejects(resolverReporte(5, { estado: 'ADVERTIDO' }, administrador), (error) => error.tipo === 'resultado-incierto' && error.requiereActualizar)
})

test('no acepta como confirmación otro reporte, otro administrador o una respuesta incoherente', async () => {
  for (const datos of [null, [], {}, 'x',
    { ...advertido, id: 99 },
    { ...advertido, estado: 'PENDIENTE', motivo: null, resueltoPorId: null, resueltoEn: null },
    { ...advertido, estado: 'DESESTIMADO' },
    { ...advertido, estado: 'SUSPENDIDO' },
    { ...advertido, resueltoPorId: '11' },
    { ...advertido, resueltoEn: null, resueltoPorId: null, motivo: null, estado: 'PENDIENTE' },
    { ...advertido, motivo: 'Otro motivo' },
    { ...advertido, id: '6' },
  ]) {
    globalThis.fetch = async () => Response.json(datos)
    await assert.rejects(resolverReporte(6, { estado: 'ADVERTIDO', motivo: 'Primera falta' }, administrador),
      (error) => error.tipo === 'resultado-incierto' && error.requiereActualizar)
  }
  globalThis.fetch = async () => Response.json({ ...desestimado, motivo: 'Con motivo' })
  await assert.rejects(resolverReporte(9, { estado: 'DESESTIMADO' }, administrador), (error) => error.tipo === 'resultado-incierto')
  globalThis.fetch = async () => new Response('no es JSON')
  await assert.rejects(resolverReporte(6, { estado: 'ADVERTIDO' }, administrador), (error) => error.tipo === 'resultado-incierto')
  globalThis.fetch = async () => new Response(null, { status: 204 })
  await assert.rejects(resolverReporte(6, { estado: 'ADVERTIDO' }, administrador), (error) => error.tipo === 'resultado-incierto')
})

test('reactiva con PATCH sin cuerpo y confirma solo la reactivación del reporte suspendido', async () => {
  let llamada
  globalThis.fetch = async (url, opciones) => {
    llamada = { url: String(url), opciones }
    return Response.json(reactivado)
  }
  const resultado = await reactivarSuspension(8, administrador)
  assert.equal(llamada.url, urlBase() + '/reportes-moderacion/reportes/8/reactivacion')
  assert.equal(llamada.opciones.method, 'PATCH')
  assert.equal(llamada.opciones.body, undefined)
  assert.equal(llamada.opciones.headers['Content-Type'], undefined)
  assert.equal(llamada.opciones.headers.Authorization, 'Bearer ' + administrador.token)
  assert.deepEqual(resultado, reactivado)

  for (const datos of [
    { ...reactivado, id: 9 },
    suspendido,
    { ...reactivado, estado: 'ADVERTIDO', reactivadoPorId: null, reactivadoEn: null },
    { ...reactivado, reactivadoPorId: '11' },
    { ...reactivado, reactivadoEn: null, reactivadoPorId: null },
  ]) {
    globalThis.fetch = async () => Response.json(datos)
    await assert.rejects(reactivarSuspension(8, administrador), (error) => error.tipo === 'resultado-incierto')
  }

  globalThis.fetch = async () => Response.json({ statusCode: 409, code: 'REPORT_REACTIVATION_INVALID' }, { status: 409 })
  await assert.rejects(reactivarSuspension(8, administrador), (error) => {
    assert.equal(error.tipo, 'conflicto')
    assert.equal(error.accion, 'reactivar')
    assert.equal(error.requiereActualizar, true)
    assert.match(error.message, /ya no admite reactivación/)
    return true
  })
})

test('bloquea el doble clic sobre el mismo reporte y permite operar reportes distintos en paralelo', async () => {
  const demorada = diferida()
  let llamadas = 0
  globalThis.fetch = async () => { llamadas++; return demorada.promesa }
  const primera = resolverReporte(5, { estado: 'ADVERTIDO' }, administrador)
  await assert.rejects(resolverReporte(5, { estado: 'SUSPENDIDO' }, administrador), (error) => error.tipo === 'en-curso')
  await assert.rejects(reactivarSuspension(5, administrador), (error) => error.tipo === 'en-curso')
  assert.equal(llamadas, 1)
  const advertidoSinMotivo = { ...advertido, id: 5, motivo: null }
  demorada.resolver(Response.json(advertidoSinMotivo))
  assert.deepEqual(await primera, advertidoSinMotivo)

  globalThis.fetch = async (url, opciones) => {
    llamadas++
    const id = Number(new URL(url).pathname.split('/').at(-2))
    const cuerpo = opciones.body === undefined ? { estado: 'ADVERTIDO' } : JSON.parse(opciones.body)
    return Response.json({
      ...pendiente, id, estado: cuerpo.estado, motivo: cuerpo.motivo ?? null,
      resueltoPorId: administrador.idUsuario, resueltoEn: '2026-11-21T15:00:00.000Z',
    })
  }
  const resultados = await Promise.all([
    resolverReporte(5, { estado: 'ADVERTIDO' }, administrador),
    resolverReporte(6, { estado: 'ADVERTIDO' }, administrador),
  ])
  assert.deepEqual(resultados.map((item) => item.id), [5, 6])
})

test('cancela al salir y trata timeout o red como resultado incierto sin reintentar', async (t) => {
  globalThis.fetch = () => assert.fail('Una señal cancelada no debe enviar PATCH')
  const cancelado = new AbortController()
  cancelado.abort()
  await assert.rejects(resolverReporte(5, { estado: 'ADVERTIDO' }, administrador, cancelado.signal), { name: 'AbortError' })
  await assert.rejects(reactivarSuspension(8, administrador, cancelado.signal), { name: 'AbortError' })

  const controlador = new AbortController()
  let llamadas = 0
  globalThis.fetch = (_url, opciones) => {
    llamadas++
    return new Promise((_resolve, reject) => opciones.signal.addEventListener('abort', () => reject(opciones.signal.reason), { once: true }))
  }
  const enCurso = reactivarSuspension(8, administrador, controlador.signal)
  controlador.abort()
  await assert.rejects(enCurso, { name: 'AbortError' })
  assert.equal(llamadas, 1)

  t.mock.method(AbortSignal, 'timeout', () => AbortSignal.abort(new DOMException('Timeout', 'TimeoutError')))
  globalThis.fetch = async (_url, opciones) => { llamadas++; opciones.signal.throwIfAborted() }
  await assert.rejects(resolverReporte(5, { estado: 'ADVERTIDO' }, administrador), /pudo haberse aplicado/)
  assert.equal(llamadas, 2)
})

test('la red fallida en una escritura es resultado incierto que exige actualizar', async () => {
  let llamadas = 0
  globalThis.fetch = async () => { llamadas++; throw new TypeError('Failed to fetch') }
  await assert.rejects(resolverReporte(5, { estado: 'ADVERTIDO' }, administrador), (error) => error.tipo === 'resultado-incierto' && error.requiereActualizar)
  await assert.rejects(reactivarSuspension(8, administrador), (error) => error.tipo === 'resultado-incierto' && error.requiereActualizar)
  assert.equal(llamadas, 2)
})

test('sin sesión y sin permiso no expone filtros, listado ni acciones', () => {
  const sinSesion = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ReportesAdminContainer)))
  assert.match(sinSesion, /Debes iniciar sesión con una cuenta de administrador/)
  assert.match(sinSesion, /href="\/login"/)
  const sinPermiso = pagina(listo([pendiente]), { acceso: 'permiso' })
  assert.match(sinPermiso, /No tienes permisos para consultar esta sección/)
  assert.match(sinPermiso, /href="\/materias"/)
  for (const html of [sinSesion, sinPermiso]) {
    assert.doesNotMatch(html, /Aplicar filtros|Actualizar listado|Desestimar|Suspender cuenta|Reactivar cuenta|No llegó a la sesión/)
  }
})

test('diferencia carga, error con reintento y listado vacío sin mezclar mensajes', () => {
  const carga = pagina({ estado: 'cargando' })
  assert.match(carga, /role="status"[^>]*>Cargando reportes…/)
  assert.doesNotMatch(carga, /No hay reportes/)
  const error = pagina({ estado: 'error', mensaje: 'No pudimos conectar.' })
  assert.match(error, /role="alert"[^>]*>No pudimos conectar\./)
  assert.match(error, /Reintentar consulta/)
  assert.doesNotMatch(error, /No hay reportes|Cargando reportes/)
  assert.match(pagina(listo([])), /No hay reportes que coincidan con los filtros/)
})

test('lista reportes con estado, participantes, nombres disponibles y acciones según corresponda', () => {
  const nombres = new Map([['23', 'Ana Torres'], ['31', 'Bruno Díaz']])
  const html = pagina(listo([pendiente, suspendido, reactivado]), { nombres })
  assert.match(html, /Reporte #5/)
  assert.match(html, /No llegó a la sesión acordada/)
  assert.ok(html.includes('Ana Torres'))
  assert.ok(html.includes('Bruno Díaz'))
  assert.doesNotMatch(html, /Usuario #23|Usuario #31/)
  assert.match(html, /Desestimar/)
  assert.match(html, /Advertir/)
  assert.match(html, /Suspender cuenta…/)
  assert.match(html, /Reactivar cuenta…/)
  assert.match(html, /Cuenta reactivada/)
  assert.match(html, /Reincidencia/)
  assert.match(html, /motivo-reporte-5/)
  assert.match(html, /maxLength="500"/)
  assert.doesNotMatch(html, /motivo-reporte-6|motivo-reporte-7|motivo-reporte-8/)
  assert.doesNotMatch(html, /Sí, suspender|Sí, reactivar/)
  const sinNombres = pagina(listo([pendiente]))
  assert.match(sinNombres, /Usuario #23/)
  assert.match(sinNombres, /Usuario #31/)
})

test('bloquea las acciones durante una operación y tras un resultado que exige actualizar', () => {
  const consulta = listo([pendiente, suspendido])
  const enCurso = pagina(consulta, { accionEnCurso: { id: 5, accion: 'resolver' } })
  assert.match(enCurso, /Procesando resolución…/)
  assert.match(enCurso, /disabled=""[^>]*>Desestimar/)
  assert.match(enCurso, /disabled=""[^>]*>Advertir/)
  assert.match(enCurso, /disabled=""[^>]*>Suspender cuenta…/)
  assert.match(enCurso, /disabled=""[^>]*>Reactivar cuenta…/)
  assert.match(enCurso, /<button\b[^>]*disabled=""[^>]*>Actualizar listado<\/button>/)
  const reactivando = pagina(consulta, { accionEnCurso: { id: 7, accion: 'reactivar' } })
  assert.match(reactivando, /Procesando reactivación…/)
  const bloqueada = pagina(consulta, { decisionesBloqueadas: true })
  assert.match(bloqueada, /disabled=""[^>]*>Desestimar/)
  assert.match(bloqueada, /disabled=""[^>]*>Reactivar cuenta…/)
  assert.match(bloqueada, /<button\b[^>]*>Actualizar listado<\/button>/)
  assert.doesNotMatch(bloqueada, /<button\b[^>]*disabled=""[^>]*>Actualizar listado<\/button>/)
})

test('muestra avisos de éxito y error de las operaciones', () => {
  const html = pagina(listo([pendiente]), {
    mensajeAccion: 'Reporte desestimado correctamente.',
    errorAccion: 'El reporte ya fue resuelto. Consulta su estado antes de volver a actuar.',
  })
  assert.match(html, /role="status"[^>]*>Reporte desestimado correctamente\./)
  assert.match(html, /role="alert"[^>]*>El reporte ya fue resuelto\./)
})

test('pagina con el componente compartido y refleja el total del backend', () => {
  const html = pagina(listo([pendiente], [], { pagina: 2, limite: 10, total: 25, total_paginas: 3 }))
  assert.match(html, /25 reportes/)
  assert.match(html, /Página 2 de 3/)
  assert.match(html, /aria-label="Paginación de reportes"/)
  const unica = pagina(listo([pendiente]))
  assert.match(unica, /1 reporte</)
  assert.doesNotMatch(unica, /Página 1 de/)
})

test('presenta los conflictos de cierre solo cuando existen', () => {
  const conConflictos = pagina(listo([pendiente], [conflictoPublico]))
  assert.match(conConflictos, /Conflictos de cierre sin resolver/)
  assert.match(conConflictos, /Sesión #77/)
  assert.match(conConflictos, /Completada/)
  assert.match(conConflictos, /Inasistencia/)
  assert.match(conConflictos, /Usuario #31/)
  assert.match(conConflictos, /marca inasistente a Usuario #31/)
  assert.match(conConflictos, /Revisar y resolver/)
  assert.match(conConflictos, /href="\/panel\/tutorias\/77\?desde=%2Fadministracion%2Freportes"/)
  assert.doesNotMatch(pagina(listo([pendiente])), /Conflictos de cierre/)
})

test('el formulario de filtros refleja la URL y ofrece estados y fechas', () => {
  const html = pagina(listo([]), { filtros: { estado: 'SUSPENDIDO', fechaDesde: '2026-11-01', fechaHasta: '2026-11-20', pagina: 2 } })
  assert.match(html, /<option value="SUSPENDIDO" selected="">Suspendidos<\/option>/)
  assert.match(html, /value="2026-11-01"/)
  assert.match(html, /value="2026-11-20"/)
  assert.match(html, /Aplicar filtros/)
  assert.match(html, /Limpiar filtros/)
  const limpio = pagina(listo([]))
  assert.match(limpio, /<option value="" selected="">Todos los estados<\/option>/)
})

test('lee y escribe los parámetros de la URL descartando valores inválidos', () => {
  assert.deepEqual(leerFiltrosReportes(new URLSearchParams('estado=pendiente&pagina=3')), { estado: 'PENDIENTE', pagina: 3 })
  assert.deepEqual(leerFiltrosReportes(new URLSearchParams('estado=CERRADO&pagina=0&fecha_desde=2026-13-01&fecha_hasta=manana')), { pagina: 1 })
  assert.deepEqual(leerFiltrosReportes(new URLSearchParams('fecha_desde=2026-11-01&fecha_hasta=2026-11-20')), { fechaDesde: '2026-11-01', fechaHasta: '2026-11-20', pagina: 1 })
  assert.deepEqual(leerFiltrosReportes(new URLSearchParams('pagina=-2')), { pagina: 1 })
  assert.equal(parametrosDeFiltros({ pagina: 1 }).toString(), '')
  assert.equal(parametrosDeFiltros({ estado: 'ADVERTIDO', fechaDesde: '2026-11-01', pagina: 4 }).toString(), 'estado=ADVERTIDO&fecha_desde=2026-11-01&pagina=4')
  assert.equal(esFechaFiltro('2026-11-01'), true)
  assert.equal(esFechaFiltro('2026-02-30'), false)
  assert.equal(esFechaIso('2026-11-20T15:00:00.000Z'), true)
  assert.equal(esFechaIso('2026-02-30T00:00:00.000Z'), false)
  assert.equal(esFechaIso('2026-11-20'), false)
})

test('la ruta administrativa exige sesión y el menú la enlaza solo para administradores', async () => {
  const html = await renderizarRuta(createElement(MemoryRouter, { initialEntries: ['/administracion/reportes'] }, createElement(AppRoutes)))
  assert.match(html, /Redirigiendo al inicio de sesión…/)
  assert.doesNotMatch(html, /Reportes y moderación/)
  assert.equal((html.match(/<header\b/g) ?? []).length, 1)
  assert.equal((html.match(/<footer\b/g) ?? []).length, 1)
  assert.equal((html.match(/<main\b/g) ?? []).length, 1)
  for (const roles of [['ADMIN'], ['ADMINISTRADOR'], ['TUTOR', 'ADMIN']]) {
    assert.ok(obtenerNavegacion(roles).some((enlace) => enlace.destino === '/administracion/reportes'))
  }
  for (const roles of [[], ['ESTUDIANTE'], ['TUTOR']]) {
    assert.ok(!obtenerNavegacion(roles).some((enlace) => enlace.destino === '/administracion/reportes'))
  }
})
