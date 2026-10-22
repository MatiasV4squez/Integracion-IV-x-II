import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route } from 'react-router'
import { createServer } from 'vite'

let vite
let AppRoutes
let Encabezado
let VerificacionCuentaPage
let configuracion
let verificacion

before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ AppRoutes } = await vite.ssrLoadModule('/src/app/AppRoutes.tsx'))
  ;({ Encabezado } = await vite.ssrLoadModule('/src/shared/layout/Encabezado.tsx'))
  ;({ default: VerificacionCuentaPage } = await vite.ssrLoadModule('/src/features/verificacion-cuenta/pages/VerificacionCuentaPage.tsx'))
  configuracion = await vite.ssrLoadModule('/src/shared/layout/configuracion-navegacion.ts')
  verificacion = await vite.ssrLoadModule('/src/features/verificacion-cuenta/models/estado-verificacion.ts')
})

after(async () => { await vite?.close() })

function renderizar(elemento, ruta = '/') {
  return renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [ruta] }, elemento))
}

test('las rutas existentes y la verificación comparten una sola cabecera y un solo pie', () => {
  for (const ruta of ['/materias', '/tutores', '/solicitudes/recibidas', '/verificar-cuenta', '/ruta-equipo']) {
    const html = renderizar(createElement(AppRoutes, null,
      createElement(Route, { path: '/ruta-equipo', element: createElement('main', null, 'Contenido del equipo') }),
    ), ruta)
    assert.equal((html.match(/<header\b/g) ?? []).length, 1, ruta)
    assert.equal((html.match(/<footer\b/g) ?? []).length, 1, ruta)
    assert.equal((html.match(/<main\b/g) ?? []).length, 1, ruta)
    assert.match(html, /Saltar al contenido/)
  }
})

test('la navegación pública usa rutas existentes y marca solamente el destino activo', () => {
  const html = renderizar(createElement(Encabezado, { enlaces: configuracion.obtenerNavegacion() }), '/materias')
  assert.match(html, /href="\/tutores"/)
  assert.match(html, /href="\/registro"/)
  assert.match(html, /aria-current="page"[^>]*href="\/materias"/)
  assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1)
  assert.match(html, /aria-expanded="false"/)
})

test('configura menús por rol sin inventar identidad ni alterar los permisos del backend', () => {
  assert.equal(configuracion.obtenerUsuarioEncabezado(null), undefined)
  const sesion = { idUsuario: '9007199254740993', roles: ['TUTOR'] }
  const enlaces = configuracion.obtenerNavegacion(sesion.roles)
  const html = renderizar(createElement(Encabezado, {
    enlaces, usuario: configuracion.obtenerUsuarioEncabezado(sesion),
  }), '/disponibilidad')
  assert.match(html, /Usuario 9007199254740993/)
  assert.match(html, /href="\/solicitudes\/recibidas"/)
  assert.match(html, /href="\/disponibilidad"/)
  assert.doesNotMatch(html, /Registrarse|Martina|Diego/)
  assert.ok(configuracion.obtenerNavegacion(['ESTUDIANTE']).some((enlace) => enlace.destino === '/solicitudes/nueva'))
})

test('una URL de demostración no puede presentar éxito en producción', () => {
  for (const estado of verificacion.ESTADOS_VERIFICACION) {
    assert.equal(verificacion.leerVistaVerificacion(estado, false), 'pendiente')
    assert.equal(verificacion.leerVistaVerificacion(estado, true), estado)
  }
  assert.equal(verificacion.leerVistaVerificacion('valor-no-admitido', true), 'pendiente')
  assert.equal(verificacion.leerVistaVerificacion(null, true), 'pendiente')
})

test('todos los estados visuales anuncian su contenido y se identifican como demostración', () => {
  for (const estado of verificacion.ESTADOS_VERIFICACION) {
    const html = renderizar(createElement(VerificacionCuentaPage, { estado, demostracion: true }))
    assert.match(html, /Vista de demostración/)
    assert.match(html, /role="status"/)
    assert.match(html, /aria-live="polite"/)
    assert.ok(html.includes(verificacion.MENSAJES_VERIFICACION[estado].titulo))
  }
})

test('sin enlace ofrece solicitar otro; confirmar requiere una acción proporcionada por el contenedor', () => {
  const html = renderizar(createElement(VerificacionCuentaPage, { estado: 'pendiente', reenviar() {} }))
  assert.match(html, /type="email"/)
  assert.match(html, /Solicitar nuevo enlace/)
  assert.match(html, /href="\/login"/)
  assert.doesNotMatch(html, /Confirmar correo|Correo enviado|Cuenta activada/)
  const conToken = renderizar(createElement(VerificacionCuentaPage, { estado: 'pendiente', confirmar() {} }))
  assert.match(conToken, /Confirmar correo/)
})

test('el estado de carga no permite continuar y los errores ofrecen una salida navegable', () => {
  const cargando = renderizar(createElement(VerificacionCuentaPage, { estado: 'verificando' }))
  assert.match(cargando, /aria-busy="true"/)
  assert.doesNotMatch(cargando, /Ir a iniciar sesión/)
  for (const estado of ['vencida', 'invalida', 'error']) {
    const html = renderizar(createElement(VerificacionCuentaPage, { estado }))
    assert.match(html, /href="\/login"/)
  }
})

test('el reenvío no afirma que una cuenta exista y los errores no prometen que siga sin modificar', () => {
  const html = renderizar(createElement(VerificacionCuentaPage, { estado: 'pendiente', reenviar() {}, reenvio: 'enviado' }))
  assert.match(html, /Si la cuenta existe y requiere verificación/)
  assert.doesNotMatch(html, /Correo enviado|correo ya fue enviado/)
  assert.doesNotMatch(verificacion.MENSAJES_VERIFICACION.error.detalle, /no se ha modificado/)
})
