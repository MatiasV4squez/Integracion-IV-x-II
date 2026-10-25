import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { createServer } from 'vite'

let vite, consultarPostulaciones, obtenerCertificadoPostulacion
const fetchOriginal = globalThis.fetch
const timeoutOriginal = AbortSignal.timeout
const administrador = { token: 'token-administrador-prueba', idUsuario: '10', roles: ['ADMIN'], expiraEn: Date.now() + 3600000 }
const pendiente = {
  idPostulacion: '9007199254740993', idUsuario: '23', idMateria: '1',
  certificadoNombre: 'notas.pdf', certificadoTipo: 'application/pdf', estado: 'PENDIENTE',
  fechaPostulacion: '2026-10-21T15:00:00.000Z', fechaRevision: null,
  notaAcreditada: null, motivoRechazo: null, idAdministradorRevision: null,
}
const pendienteRol = {
  ...pendiente, idPostulacion: '18', estado: 'PENDIENTE_ROL', notaAcreditada: 5.5,
  fechaRevision: '2026-10-22T15:00:00.000Z', idAdministradorRevision: '10',
}

before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ consultarPostulaciones, obtenerCertificadoPostulacion } = await vite.ssrLoadModule('/src/features/postulaciones/services/postulaciones-api.ts'))
})
afterEach(() => { globalThis.fetch = fetchOriginal; AbortSignal.timeout = timeoutOriginal })
after(async () => { await vite?.close() })

test('consulta pendientes por Gateway con Bearer, sin caché ni campos privados', async () => {
  globalThis.fetch = async (url, opciones) => {
    assert.equal(String(url), vite.config.env.VITE_API_BASE_URL.replace(/\/+$/, '') + '/materias-tutores/postulaciones/pendientes')
    assert.equal(opciones.headers.Authorization, 'Bearer ' + administrador.token)
    assert.equal(opciones.headers.Accept, 'application/json')
    assert.equal(opciones.cache, 'no-store')
    return Response.json([{ ...pendiente, certificadoRef: 'referencia-privada' }])
  }
  assert.deepEqual(await consultarPostulaciones(administrador), [pendiente])
})

test('admite PENDIENTE_ROL con nota y revisión sin romper las otras postulaciones', async () => {
  globalThis.fetch = async () => Response.json([pendiente, pendienteRol])
  assert.deepEqual(await consultarPostulaciones(administrador), [pendiente, pendienteRol])
  globalThis.fetch = async () => Response.json([])
  assert.deepEqual(await consultarPostulaciones(administrador), [])
})

test('exige una sesión vigente de administrador antes de consultar o descargar', async () => {
  globalThis.fetch = () => assert.fail('No debe consultar sin acceso')
  for (const sesion of [null, { ...administrador, token: '' }, { ...administrador, expiraEn: 1 },
    { ...administrador, expiraEn: NaN }, { ...administrador, idUsuario: '0' },
    { ...administrador, roles: ['ESTUDIANTE'] }, { ...administrador, roles: ['TUTOR'] }]) {
    await assert.rejects(consultarPostulaciones(sesion), /sesión|administrador/)
    await assert.rejects(obtenerCertificadoPostulacion(sesion, pendiente), /sesión|administrador/)
  }
  globalThis.fetch = async () => Response.json([])
  await consultarPostulaciones({ ...administrador, roles: [' administrador '] })
})

test('rechaza estados ajenos, duplicados, fechas imposibles, IDs fuera de BIGINT y revisiones incoherentes', async () => {
  for (const datos of [null, {}, [pendiente, pendiente],
    [{ ...pendiente, estado: 'APROBADA' }], [{ ...pendiente, estado: 'RECHAZADA' }],
    [{ ...pendiente, fechaPostulacion: '2026-02-30T15:00:00.000Z' }],
    [{ ...pendiente, idPostulacion: '9223372036854775808' }],
    [{ ...pendiente, certificadoTipo: 'text/html' }], [{ ...pendiente, notaAcreditada: 5.5 }],
    [{ ...pendienteRol, fechaRevision: null }], [{ ...pendienteRol, idAdministradorRevision: null }],
    [{ ...pendienteRol, notaAcreditada: null }]]) {
    globalThis.fetch = async () => Response.json(datos)
    await assert.rejects(consultarPostulaciones(administrador), /datos de postulaciones no válidos/)
  }
  globalThis.fetch = async () => new Response('respuesta que no es JSON')
  await assert.rejects(consultarPostulaciones(administrador), /No se pudieron leer/)
})

test('maneja errores HTTP del listado y del certificado sin exponer detalles internos', async () => {
  for (const status of [401, 403, 404, 500, 502, 503, 504]) {
    globalThis.fetch = async () => new Response('detalle-interno-privado', { status })
    for (const operacion of [() => consultarPostulaciones(administrador), () => obtenerCertificadoPostulacion(administrador, pendiente)]) {
      await assert.rejects(operacion(), (error) => {
        assert.doesNotMatch(error.message, /detalle-interno-privado/)
        if (status === 401) assert.match(error.message, /sesión/)
        if (status === 403) assert.match(error.message, /autorización/)
        if (status === 504) assert.match(error.message, /tardó demasiado/)
        return true
      })
    }
  }
})

test('descarga PDF y PNG por Gateway con Bearer y mantiene los IDs como texto', async () => {
  for (const tipo of ['application/pdf', 'image/png']) {
    globalThis.fetch = async (url, opciones) => {
      assert.equal(String(url), vite.config.env.VITE_API_BASE_URL.replace(/\/+$/, '') + '/materias-tutores/postulaciones/' + pendiente.idPostulacion + '/certificado')
      assert.equal(opciones.headers.Authorization, 'Bearer ' + administrador.token)
      assert.equal(opciones.cache, 'no-store')
      return new Response(new Blob(['certificado de prueba'], { type: tipo }))
    }
    const archivo = await obtenerCertificadoPostulacion(administrador, { ...pendiente, certificadoTipo: tipo })
    assert.equal(archivo.type, tipo)
    assert.ok(archivo.size > 0)
  }
})

test('rechaza certificados vacíos, de otro tipo, demasiado grandes o con ID inválido', async () => {
  globalThis.fetch = () => assert.fail('No debe enviar un identificador inválido')
  await assert.rejects(obtenerCertificadoPostulacion(administrador, { ...pendiente, idPostulacion: '../1' }), /no son válidos/)
  for (const archivo of [new Blob([], { type: 'application/pdf' }), new Blob(['archivo'], { type: 'text/html' }),
    new Blob([new Uint8Array(5_000_001)], { type: 'application/pdf' })]) {
    globalThis.fetch = async () => new Response(archivo)
    await assert.rejects(obtenerCertificadoPostulacion(administrador, pendiente), /certificado no es válido/)
  }
})

test('cancela las consultas y descargas al abandonar la pantalla, sin repetirlas', async () => {
  for (const operacion of [consultarPostulaciones, (sesion, signal) => obtenerCertificadoPostulacion(sesion, pendiente, signal)]) {
    const controlador = new AbortController()
    let llamadas = 0
    globalThis.fetch = (_url, { signal }) => new Promise((_resolve, reject) => {
      llamadas++
      signal.addEventListener('abort', () => reject(signal.reason), { once: true })
    })
    const solicitud = operacion(administrador, controlador.signal)
    controlador.abort()
    await assert.rejects(solicitud, { name: 'AbortError' })
    await assert.rejects(operacion(administrador, controlador.signal), { name: 'AbortError' })
    assert.equal(llamadas, 1)
  }
})

test('muestra mensajes comprensibles ante fallos de red y tiempos de espera', async () => {
  const operaciones = [() => consultarPostulaciones(administrador), () => obtenerCertificadoPostulacion(administrador, pendiente)]
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  for (const operacion of operaciones) await assert.rejects(operacion(), /No pudimos conectar/)
  AbortSignal.timeout = () => AbortSignal.abort(new DOMException('Tiempo agotado', 'TimeoutError'))
  globalThis.fetch = async (_url, { signal }) => { signal.throwIfAborted() }
  for (const operacion of operaciones) await assert.rejects(operacion(), /tardó demasiado/)
})
