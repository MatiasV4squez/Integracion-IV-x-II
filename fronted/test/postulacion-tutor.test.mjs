import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { createServer } from 'vite'
import { renderizarRuta } from './helpers/renderizar-ruta.mjs'

let vite, validarCertificado, enviarPostulacionTutor, consultarMisPostulaciones, Page, AppRoutes, obtenerNavegacion
const fetchOriginal = globalThis.fetch
const estudiante = { token: 'token-estudiante-prueba', idUsuario: '23', roles: ['ESTUDIANTE'], expiraEn: Date.now() + 3600000 }
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37])
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])
const pdf = (nombre = 'notas.pdf', tipo = 'application/pdf', bytes = PDF) => new File([bytes], nombre, { type: tipo })
const pendiente = {
  idPostulacion: '41', idUsuario: '23', idMateria: '1', idAdministradorRevision: null,
  certificadoNombre: 'notas.pdf', certificadoTipo: 'application/pdf', notaAcreditada: null, estado: 'PENDIENTE',
  fechaPostulacion: '2026-10-21T15:00:00.000Z', fechaRevision: null, motivoRechazo: null,
}
const aprobada = {
  ...pendiente, idPostulacion: '40', idMateria: '2', estado: 'APROBADA', notaAcreditada: 6.2,
  idAdministradorRevision: '10', fechaRevision: '2026-10-22T15:00:00.000Z',
}
const rechazada = {
  ...pendiente, idPostulacion: '39', idMateria: '3', estado: 'RECHAZADA',
  idAdministradorRevision: '10', fechaRevision: '2026-10-22T15:00:00.000Z', motivoRechazo: 'Certificado ilegible',
}
const materias = [
  { idMateria: '1', codigo: 'MAT101', nombre: 'Cálculo I' },
  { idMateria: '2', codigo: 'INF110', nombre: 'Programación I' },
  { idMateria: '3', codigo: 'FIS100', nombre: 'Física I' },
  { idMateria: '4', codigo: 'QUI100', nombre: 'Química general' },
]

before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ validarCertificado } = await vite.ssrLoadModule('/src/features/postulaciones/utils/validar-certificado.ts'))
  ;({ enviarPostulacionTutor, consultarMisPostulaciones } = await vite.ssrLoadModule('/src/features/postulaciones/services/postulacion-tutor-api.ts'))
  ;({ default: Page } = await vite.ssrLoadModule('/src/features/postulaciones/pages/PostulacionTutorPage.tsx'))
  ;({ AppRoutes } = await vite.ssrLoadModule('/src/app/AppRoutes.tsx'))
  ;({ obtenerNavegacion } = await vite.ssrLoadModule('/src/shared/layout/configuracion-navegacion.ts'))
})
afterEach(() => { globalThis.fetch = fetchOriginal })
after(async () => { await vite?.close() })

const url = (ruta) => vite.config.env.VITE_API_BASE_URL.replace(/\/+$/, '') + '/materias-tutores/' + ruta

test('acepta solo PDF o PNG reales, no vacíos, de hasta 5 MB y con nombre acotado', async () => {
  assert.deepEqual(await validarCertificado(pdf()), { tipo: 'application/pdf' })
  assert.deepEqual(await validarCertificado(new File([PNG], 'NOTAS.PNG', { type: 'image/png' })), { tipo: 'image/png' })
  assert.deepEqual(await validarCertificado(pdf('notas.pdf', '')), { tipo: 'application/pdf' }, 'Sin MIME se usa la extensión')
  for (const [archivo, motivo] of [
    [null, /Adjunta/],
    [pdf('notas.pdf', 'application/pdf', new Uint8Array()), /vacío/],
    [new File([new Uint8Array(5_000_001)], 'notas.pdf', { type: 'application/pdf' }), /5 MB/],
    [pdf('a'.repeat(252) + '.pdf'), /nombre/],
    [pdf('notas.jpg', 'image/jpeg'), /PDF o PNG/],
    [pdf('notas.pdf', 'image/png'), /PDF o PNG/],
    [pdf('notas.png', 'image/png'), /dañado/],
    [new File(['%PD'], 'notas.pdf', { type: 'application/pdf' }), /dañado/],
  ]) {
    const resultado = await validarCertificado(archivo)
    assert.ok('error' in resultado, String(archivo?.name))
    assert.match(resultado.error, motivo)
  }
})

test('envía la postulación por el Gateway como multipart con el JWT del usuario', async () => {
  const llamadas = []
  globalThis.fetch = async (destino, opciones) => {
    llamadas.push({ destino, opciones })
    return Response.json(pendiente, { status: 201 })
  }
  const resultado = await enviarPostulacionTutor(estudiante, { idMateria: '1', certificado: pdf('notas.pdf', '') })
  assert.deepEqual(resultado, pendiente)
  assert.equal(llamadas.length, 1)
  const { destino, opciones } = llamadas[0]
  assert.equal(String(destino), url('postulaciones'))
  assert.equal(opciones.method, 'POST')
  assert.equal(opciones.headers.Authorization, 'Bearer ' + estudiante.token)
  assert.equal(opciones.headers['Content-Type'], undefined, 'El navegador debe fijar el boundary multipart')
  assert.ok(opciones.body instanceof FormData)
  assert.deepEqual([...opciones.body.keys()], ['idMateria', 'certificado'])
  assert.equal(opciones.body.get('idMateria'), '1')
  const archivo = opciones.body.get('certificado')
  assert.equal(archivo.name, 'notas.pdf')
  assert.equal(archivo.type, 'application/pdf', 'Completa el MIME que el backend exige')
  assert.deepEqual(new Uint8Array(await archivo.arrayBuffer()), PDF)
})

test('no envía datos inválidos ni con una sesión vencida', async () => {
  globalThis.fetch = () => { assert.fail('No debe llamar a la API') }
  await assert.rejects(enviarPostulacionTutor(estudiante, { idMateria: '', certificado: pdf() }), /materia/)
  await assert.rejects(enviarPostulacionTutor(estudiante, { idMateria: '1', certificado: pdf('notas.png', 'image/png') }), /dañado/)
  await assert.rejects(enviarPostulacionTutor({ ...estudiante, expiraEn: Date.now() - 1 }, { idMateria: '1', certificado: pdf() }), /sesión/)
  const control = new AbortController()
  control.abort()
  await assert.rejects(enviarPostulacionTutor(estudiante, { idMateria: '1', certificado: pdf() }, control.signal), { name: 'AbortError' })
})

test('explica cada rechazo del backend sin reintentar la subida', async () => {
  for (const [status, mensaje] of [
    [400, /rechazó el certificado/], [401, /sesión/], [403, /permiso/], [404, /ya no está disponible/],
    [409, /postulación activa/], [413, /5 MB/], [504, /tardó/], [500, /No se pudo enviar/], [200, /No se pudo enviar/],
  ]) {
    let llamadas = 0
    globalThis.fetch = async () => { llamadas++; return Response.json({ message: 'detalle interno' }, { status }) }
    await assert.rejects(enviarPostulacionTutor(estudiante, { idMateria: '1', certificado: pdf() }), (error) => {
      assert.match(error.message, mensaje, String(status))
      assert.doesNotMatch(error.message, /detalle interno/)
      return true
    })
    assert.equal(llamadas, 1)
  }
  globalThis.fetch = async () => { throw new TypeError('fetch failed') }
  await assert.rejects(enviarPostulacionTutor(estudiante, { idMateria: '1', certificado: pdf() }), /conectar/)
})

test('una respuesta 201 que no corresponde a la postulación enviada no se presenta como éxito', async () => {
  for (const cuerpo of [{}, { ...pendiente, idUsuario: '99' }, { ...pendiente, idMateria: '2' }, aprobada]) {
    globalThis.fetch = async () => Response.json(cuerpo, { status: 201 })
    await assert.rejects(enviarPostulacionTutor(estudiante, { idMateria: '1', certificado: pdf() }), /Actualiza tu historial/)
  }
})

test('consulta el historial propio sin caché y descarta datos ajenos o malformados', async () => {
  globalThis.fetch = async (destino, opciones) => {
    assert.equal(String(destino), url('postulaciones/mias'))
    assert.equal(opciones.headers.Authorization, 'Bearer ' + estudiante.token)
    assert.equal(opciones.cache, 'no-store')
    return Response.json([{ ...pendiente, certificadoRef: 'privado' }, aprobada, rechazada])
  }
  assert.deepEqual(await consultarMisPostulaciones(estudiante), [pendiente, aprobada, rechazada])
  for (const cuerpo of [{}, [{ ...pendiente, idUsuario: '99' }], [pendiente, pendiente], [{ ...pendiente, estado: 'OTRO' }]]) {
    globalThis.fetch = async () => Response.json(cuerpo)
    await assert.rejects(consultarMisPostulaciones(estudiante), /no válidos/)
  }
  globalThis.fetch = async () => new Response(null, { status: 401 })
  await assert.rejects(consultarMisPostulaciones(estudiante), /sesión/)
})

const pagina = (propiedades = {}) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Page, {
  materias: { estado: 'listo', materias },
  historial: { estado: 'listo', postulaciones: [pendiente, aprobada, rechazada] },
  envio: { estado: 'inactivo' },
  versionFormulario: 0,
  onRecargarMaterias: () => {}, onRecargarHistorial: () => {}, onEnviar: () => {},
  ...propiedades,
})))

test('el formulario ofrece solo materias sin postulación activa y muestra el historial con su estado', () => {
  const html = pagina()
  assert.match(html, /Postular como tutor/)
  assert.match(html, /name="idMateria"/)
  assert.match(html, /type="file"[^>]*name="certificado"|name="certificado"[^>]*type="file"/)
  assert.match(html, /accept="\.pdf,\.png,application\/pdf,image\/png"/)
  const opciones = [...html.matchAll(/<option value="(\d+)"/g)].map((coincidencia) => coincidencia[1])
  assert.deepEqual(opciones, ['3', '4'], 'Una rechazada permite volver a postular; pendiente y aprobada no')
  assert.match(html, /En revisión/)
  assert.match(html, /Aprobada/)
  assert.match(html, /Nota acreditada: 6\.2/)
  assert.match(html, /Rechazada/)
  assert.match(html, /Motivo: Certificado ilegible/)
  assert.match(html, /Programación I/)
})

test('presenta carga, envío, éxito y errores sin perder la salida', () => {
  const enviando = pagina({ envio: { estado: 'enviando' } })
  assert.match(enviando, /Enviando postulación…/)
  assert.match(enviando, /<select[^>]*disabled/)
  const exito = pagina({ envio: { estado: 'exitoso', postulacion: { ...pendiente, idMateria: '4' } } })
  assert.match(exito, /Postulación enviada\..*Química general.*en revisión/)
  const error = pagina({ envio: { estado: 'error', mensaje: 'Ya tienes una postulación activa para esta materia.' } })
  assert.match(error, /role="alert"[^>]*>Ya tienes una postulación activa/)
  assert.match(error, /name="idMateria"/)
  const sinMaterias = pagina({ materias: { estado: 'error', mensaje: 'El catálogo no está disponible.' } })
  assert.match(sinMaterias, /El catálogo no está disponible/)
  assert.match(sinMaterias, />Reintentar</)
  assert.doesNotMatch(sinMaterias, /name="idMateria"/)
  assert.match(pagina({ historial: { estado: 'listo', postulaciones: [] } }), /Aún no has enviado postulaciones/)
  assert.match(pagina({ historial: { estado: 'cargando' } }), /Cargando tus postulaciones…/)
  const completas = pagina({ materias: { estado: 'listo', materias: materias.slice(0, 2) } })
  assert.match(completas, /Ya tienes una postulación activa o aprobada/)
  assert.doesNotMatch(completas, /name="idMateria"/)
})

test('la ruta exige sesión y aparece en la navegación de estudiantes y tutores', async () => {
  const html = await renderizarRuta(createElement(MemoryRouter, { initialEntries: ['/postulacion-tutor'] }, createElement(AppRoutes)))
  assert.match(html, /Redirigiendo al inicio de sesión…/)
  assert.doesNotMatch(html, /Postular como tutor/)
  for (const roles of [['ESTUDIANTE'], ['TUTOR']]) {
    assert.ok(obtenerNavegacion(roles).some((enlace) => enlace.destino === '/postulacion-tutor'), roles[0])
  }
  assert.ok(!obtenerNavegacion([]).some((enlace) => enlace.destino === '/postulacion-tutor'))
  assert.ok(!obtenerNavegacion(['ADMIN']).some((enlace) => enlace.destino === '/postulacion-tutor'))
})
