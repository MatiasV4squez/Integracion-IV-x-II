import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { createServer } from 'vite'

let vite, aprobarPostulacion, rechazarPostulacion, ErrorRevisionPostulacion
const fetchOriginal = globalThis.fetch
const administrador = {
  token: 'token-administrador-de-prueba', idUsuario: '9007199254740993',
  roles: ['ADMINISTRADOR'], expiraEn: Date.now() + 3600000,
}
const id = '9007199254740995'
const aprobada = {
  idPostulacion: id, idUsuario: '15', idMateria: '3', idAdministradorRevision: administrador.idUsuario,
  certificadoNombre: 'notas.pdf', certificadoTipo: 'application/pdf', notaAcreditada: 5.5,
  estado: 'APROBADA', fechaPostulacion: '2026-10-22T12:00:00.000Z', fechaRevision: '2026-10-23T12:00:00.000Z', motivoRechazo: null,
}
const rechazada = { ...aprobada, estado: 'RECHAZADA', notaAcreditada: null, motivoRechazo: 'Certificado ilegible' }
const diferida = () => {
  let resolver
  const promesa = new Promise(resolve => { resolver = resolve })
  return { promesa, resolver }
}

before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ aprobarPostulacion, rechazarPostulacion, ErrorRevisionPostulacion } = await vite.ssrLoadModule('/src/features/postulaciones/index.ts'))
})
afterEach(() => { globalThis.fetch = fetchOriginal })
after(async () => { await vite?.close() })

test('exporta la aprobación compartida con PATCH al Gateway, Bearer e identificadores BIGINT como texto', async () => {
  let llamadas = 0
  globalThis.fetch = async (url, opciones) => {
    llamadas++
    assert.equal(String(url), vite.config.env.VITE_API_BASE_URL.replace(/\/+$/, '') + '/materias-tutores/postulaciones/' + id + '/aprobar')
    assert.equal(opciones.method, 'PATCH')
    assert.equal(opciones.headers.Authorization, 'Bearer ' + administrador.token)
    assert.equal(opciones.headers.Accept, 'application/json')
    assert.equal(opciones.headers['Content-Type'], 'application/json')
    assert.deepEqual(JSON.parse(opciones.body), { notaAcreditada: 5.5 })
    assert.ok(opciones.signal instanceof AbortSignal)
    return Response.json({ ...aprobada, certificadoRef: 'privado', password_hash: 'privado' })
  }
  assert.deepEqual(await aprobarPostulacion(id, 5.5, administrador), aprobada)
  assert.equal(llamadas, 1)
})

test('exporta el rechazo compartido, normaliza el motivo y envía únicamente el contrato público', async () => {
  globalThis.fetch = async (url, opciones) => {
    assert.equal(String(url), vite.config.env.VITE_API_BASE_URL.replace(/\/+$/, '') + '/materias-tutores/postulaciones/' + id + '/rechazar')
    assert.equal(opciones.method, 'PATCH')
    assert.equal(opciones.headers.Authorization, 'Bearer ' + administrador.token)
    assert.deepEqual(JSON.parse(opciones.body), { motivoRechazo: 'Certificado ilegible' })
    return Response.json(rechazada)
  }
  assert.deepEqual(await rechazarPostulacion(id, '  Certificado ilegible  ', administrador), rechazada)
})

test('impide revisiones sin sesión válida o sin permiso antes de consultar la API', async () => {
  globalThis.fetch = () => assert.fail('No debe hacer una petición sin acceso')
  for (const sesion of [null, undefined, { ...administrador, token: '' }, { ...administrador, token: ' ' },
    { ...administrador, expiraEn: 1 }, { ...administrador, expiraEn: NaN }, { ...administrador, expiraEn: Infinity },
    { ...administrador, idUsuario: '0' }, { ...administrador, idUsuario: '9223372036854775808' }]) {
    await assert.rejects(aprobarPostulacion(id, 5.5, sesion), error => error.tipo === 'sesion' && !error.requiereActualizar)
    await assert.rejects(rechazarPostulacion(id, 'Motivo válido', sesion), error => error.tipo === 'sesion')
  }
  for (const roles of [[], ['TUTOR'], ['ESTUDIANTE'], null]) {
    await assert.rejects(aprobarPostulacion(id, 5.5, { ...administrador, roles }), error => error.tipo === 'permiso')
    await assert.rejects(rechazarPostulacion(id, 'Motivo válido', { ...administrador, roles }), error => error.tipo === 'permiso')
  }
})

test('admite los nombres de rol que reconoce el backend, sin delegar permisos en userRole', async () => {
  globalThis.fetch = async () => Response.json(aprobada)
  for (const roles of [['ADMIN'], [' administrador '], ['TUTOR', 'admin']]) {
    await aprobarPostulacion(id, 5.5, { ...administrador, roles })
  }
})

test('rechaza IDs inválidos y notas fuera de 5,0–7,0 o con más de un decimal sin enviar PATCH', async () => {
  globalThis.fetch = () => assert.fail('No debe enviar datos inválidos')
  for (const valor of ['0', '-1', '01', 'abc', '1/rechazar', '1?rol=ADMIN', '9223372036854775808', 15, 15n]) {
    await assert.rejects(aprobarPostulacion(valor, 5.5, administrador), error => error.tipo === 'validacion')
    await assert.rejects(rechazarPostulacion(valor, 'Motivo válido', administrador), error => error.tipo === 'validacion')
  }
  for (const nota of [4.9, 7.1, 5.55, NaN, Infinity, -Infinity, '5.5', null, undefined]) {
    await assert.rejects(aprobarPostulacion(id, nota, administrador), error => error.tipo === 'validacion')
  }
})

test('acepta las notas límite y exige motivos de 3–500 caracteres después de quitar espacios', async () => {
  for (const nota of [5, 5.1, 5.5, 6.7, 7]) {
    globalThis.fetch = async () => Response.json({ ...aprobada, notaAcreditada: nota })
    assert.equal((await aprobarPostulacion(id, nota, administrador)).notaAcreditada, nota)
  }
  globalThis.fetch = () => assert.fail('No debe enviar un motivo inválido')
  for (const motivo of ['', ' ', 'ab', ' ab ', 'a'.repeat(501), null, 5, undefined]) {
    await assert.rejects(rechazarPostulacion(id, motivo, administrador), error => error.tipo === 'validacion')
  }
  for (const motivo of ['abc', 'á'.repeat(500)]) {
    globalThis.fetch = async () => Response.json({ ...rechazada, motivoRechazo: motivo })
    assert.equal((await rechazarPostulacion(id, motivo, administrador)).motivoRechazo, motivo)
  }
})

test('clasifica errores HTTP sin filtrar sus cuerpos y señala cuándo el panel debe actualizar', async () => {
  for (const [estado, tipo, actualizar] of [[400, 'validacion', false], [401, 'sesion', false], [403, 'permiso', false],
    [404, 'no-encontrada', true], [409, 'conflicto', true], [500, 'resultado-incierto', true],
    [502, 'resultado-incierto', true], [503, 'resultado-incierto', true], [504, 'resultado-incierto', true]]) {
    for (const decision of ['aprobar', 'rechazar']) {
      let llamadas = 0
      globalThis.fetch = async () => { llamadas++; return new Response('detalle-interno-privado', { status: estado }) }
      const operacion = decision === 'aprobar' ? aprobarPostulacion(id, 5.5, administrador) : rechazarPostulacion(id, 'Motivo válido', administrador)
      await assert.rejects(operacion, error => {
        assert.ok(error instanceof ErrorRevisionPostulacion)
        assert.equal(error.tipo, tipo)
        assert.equal(error.estadoHttp, estado)
        assert.equal(error.decision, decision)
        assert.equal(error.requiereActualizar, actualizar)
        assert.doesNotMatch(error.message, /detalle-interno-privado/)
        return true
      })
      assert.equal(llamadas, 1)
    }
  }
})

test('una aprobación 503 advierte posible PENDIENTE_ROL y no se repite ni se convierte en éxito', async () => {
  let llamadas = 0
  globalThis.fetch = async () => { llamadas++; return Response.json({ message: 'La asignación del rol no está configurada' }, { status: 503 }) }
  await assert.rejects(aprobarPostulacion(id, 5.5, administrador), error => {
    assert.match(error.message, /pendiente de asignar el rol TUTOR/)
    assert.equal(error.requiereActualizar, true)
    return true
  })
  assert.equal(llamadas, 1)
})

test('no acepta como confirmación otra postulación, otro administrador o una respuesta parcial/incoherente', async () => {
  for (const datos of [null, [], {}, { ...aprobada, idPostulacion: '3' }, { ...aprobada, idAdministradorRevision: '99' },
    { ...aprobada, idPostulacion: 5 }, { ...aprobada, idMateria: '0' }, { ...aprobada, certificadoTipo: 'image/jpeg' },
    { ...aprobada, fechaRevision: null }, { ...aprobada, fechaRevision: '2026-02-30T12:00:00.000Z' },
    { ...aprobada, notaAcreditada: 6 }, { ...aprobada, motivoRechazo: 'Otro motivo' },
    ...['PENDIENTE', 'PENDIENTE_ROL', 'RECHAZADA'].map(estado => ({ ...aprobada, estado }))]) {
    globalThis.fetch = async () => Response.json(datos)
    await assert.rejects(aprobarPostulacion(id, 5.5, administrador), error => error.tipo === 'resultado-incierto' && error.requiereActualizar)
  }
  for (const datos of [{ ...rechazada, estado: 'APROBADA' }, { ...rechazada, motivoRechazo: 'Motivo distinto' },
    { ...rechazada, notaAcreditada: 5.5 }, { ...rechazada, fechaPostulacion: 'incorrecta' }]) {
    globalThis.fetch = async () => Response.json(datos)
    await assert.rejects(rechazarPostulacion(id, 'Certificado ilegible', administrador), error => error.tipo === 'resultado-incierto')
  }
  globalThis.fetch = async () => new Response('no es JSON')
  await assert.rejects(aprobarPostulacion(id, 5.5, administrador), error => error.tipo === 'resultado-incierto')
  globalThis.fetch = async () => new Response(null, { status: 204 })
  await assert.rejects(rechazarPostulacion(id, 'Certificado ilegible', administrador), error => error.tipo === 'resultado-incierto')
})

test('bloquea doble clic y decisiones opuestas simultáneas para la misma postulación y libera el bloqueo al terminar', async () => {
  const pendiente = diferida()
  let llamadas = 0
  globalThis.fetch = async () => { llamadas++; return pendiente.promesa }
  const primera = aprobarPostulacion(id, 5.5, administrador)
  await assert.rejects(aprobarPostulacion(id, 5.5, administrador), error => error.tipo === 'en-curso')
  await assert.rejects(rechazarPostulacion(id, 'Certificado ilegible', administrador), error => error.tipo === 'en-curso')
  assert.equal(llamadas, 1)
  pendiente.resolver(Response.json(aprobada))
  await primera
  globalThis.fetch = async () => { llamadas++; return new Response(null, { status: 409 }) }
  await assert.rejects(rechazarPostulacion(id, 'Certificado ilegible', administrador), error => error.tipo === 'conflicto')
  assert.equal(llamadas, 2)
})

test('permite revisar postulaciones distintas en paralelo', async () => {
  globalThis.fetch = async (url, opciones) => {
    const identificador = new URL(url).pathname.split('/').at(-2)
    return Response.json({ ...aprobada, idPostulacion: identificador, notaAcreditada: JSON.parse(opciones.body).notaAcreditada })
  }
  const resultado = await Promise.all([aprobarPostulacion(id, 5.5, administrador), aprobarPostulacion('72', 6.5, administrador)])
  assert.deepEqual(resultado.map(item => item.idPostulacion), [id, '72'])
})

test('cancela antes de enviar o al salir y libera el bloqueo sin repetir automáticamente la revisión', async () => {
  globalThis.fetch = () => assert.fail('Una señal previamente cancelada no debe enviar PATCH')
  const cancelado = new AbortController()
  cancelado.abort()
  await assert.rejects(aprobarPostulacion(id, 5.5, administrador, cancelado.signal), { name: 'AbortError' })
  const controlador = new AbortController()
  let llamadas = 0
  globalThis.fetch = (_url, opciones) => {
    llamadas++
    return new Promise((_resolve, reject) => opciones.signal.addEventListener('abort', () => reject(opciones.signal.reason), { once: true }))
  }
  const pendiente = rechazarPostulacion(id, 'Certificado ilegible', administrador, controlador.signal)
  controlador.abort()
  await assert.rejects(pendiente, { name: 'AbortError' })
  assert.equal(llamadas, 1)
  globalThis.fetch = async () => Response.json(aprobada)
  assert.deepEqual(await aprobarPostulacion(id, 5.5, administrador), aprobada)
})

test('red y timeout son resultados inciertos y no provocan reintentos automáticos', async (t) => {
  let llamadas = 0
  globalThis.fetch = async () => { llamadas++; throw new TypeError('Failed to fetch') }
  await assert.rejects(aprobarPostulacion(id, 5.5, administrador), error => error.tipo === 'resultado-incierto' && error.requiereActualizar)
  assert.equal(llamadas, 1)
  t.mock.method(AbortSignal, 'timeout', () => AbortSignal.abort(new DOMException('Timeout', 'TimeoutError')))
  globalThis.fetch = async (_url, opciones) => { llamadas++; opciones.signal.throwIfAborted() }
  await assert.rejects(rechazarPostulacion(id, 'Certificado ilegible', administrador), /pudo haberse aplicado/)
  assert.equal(llamadas, 2)
})
