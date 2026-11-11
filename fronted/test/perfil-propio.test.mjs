import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { createServer } from 'vite'
import { renderizarRuta } from './helpers/renderizar-ruta.mjs'

let vite, api, formulario, Page, AppRoutes, actualizarNombreUsuario, MenuUsuario
const fetchOriginal = globalThis.fetch
const sesion = { token: 'token-perfil', idUsuario: '23', roles: ['ESTUDIANTE'], expiraEn: Date.now() + 3600000 }
const perfil = {
  id: '23', nombre: 'Camila González', correo_institucional: 'camila@alu.uct.cl',
  carrera: 'Ingeniería Civil en Informática', semestre_actual: 4, biografia: 'Me gusta el cálculo.',
  asignaturas_interes: ['3', '7'],
}
const materias = [
  { idMateria: '3', codigo: 'MAT101', nombre: 'Cálculo I' },
  { idMateria: '7', codigo: 'INF110', nombre: 'Programación I' },
  { idMateria: '9', codigo: 'FIS100', nombre: 'Física I' },
]

before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  api = await vite.ssrLoadModule('/src/features/perfil/services/perfil-api.ts')
  formulario = await vite.ssrLoadModule('/src/features/perfil/utils/formulario-perfil.ts')
  ;({ default: Page } = await vite.ssrLoadModule('/src/features/perfil/pages/PerfilPage.tsx'))
  ;({ AppRoutes } = await vite.ssrLoadModule('/src/app/AppRoutes.tsx'))
  ;({ actualizarNombreUsuario } = await vite.ssrLoadModule('/src/shared/auth/usuario-autenticado.ts'))
  ;({ MenuUsuario } = await vite.ssrLoadModule('/src/shared/layout/MenuUsuario.tsx'))
})
afterEach(() => { globalThis.fetch = fetchOriginal })
after(async () => { await vite?.close() })

const url = () => vite.config.env.VITE_API_BASE_URL.replace(/\/+$/, '') + '/usuarios-auth/usuarios/perfil'

test('consulta el perfil propio por el Gateway con el JWT y sin caché', async () => {
  globalThis.fetch = async (destino, opciones) => {
    assert.equal(destino, url())
    assert.equal(opciones.method, 'GET')
    assert.equal(opciones.headers.Authorization, 'Bearer ' + sesion.token)
    assert.equal(opciones.cache, 'no-store')
    return Response.json({ ...perfil, password_hash: 'secreto' })
  }
  assert.deepEqual(await api.consultarPerfil(sesion), perfil)
})

test('descarta perfiles de otro usuario o con datos fuera de los límites', async () => {
  for (const cuerpo of [
    { ...perfil, id: '24' }, { ...perfil, nombre: '  ' }, { ...perfil, semestre_actual: 15 },
    { ...perfil, semestre_actual: 2.5 }, { ...perfil, carrera: 'x'.repeat(151) }, { ...perfil, biografia: 'x'.repeat(1001) },
    { ...perfil, asignaturas_interes: ['0'] }, { ...perfil, asignaturas_interes: '3' }, [],
  ]) {
    globalThis.fetch = async () => Response.json(cuerpo)
    await assert.rejects(api.consultarPerfil(sesion), /no válidos/, JSON.stringify(cuerpo).slice(0, 60))
  }
})

test('distingue sesión vencida, cuenta inexistente, datos rechazados y fallos de conexión', async () => {
  for (const [status, tipo, mensaje] of [
    [401, 'sesion', /sesión/], [404, 'no-encontrado', /No encontramos tu cuenta/],
    [400, 'consulta', /No pudimos cargar tu perfil/], [503, 'consulta', /No pudimos cargar tu perfil/],
  ]) {
    globalThis.fetch = async () => Response.json({ message: 'detalle interno' }, { status })
    await assert.rejects(api.consultarPerfil(sesion), (error) => {
      assert.equal(error.tipo, tipo)
      assert.match(error.message, mensaje)
      assert.doesNotMatch(error.message, /detalle interno/)
      return true
    })
  }
  globalThis.fetch = async () => { throw new TypeError('fetch failed') }
  await assert.rejects(api.consultarPerfil(sesion), /No pudimos conectar/)
  globalThis.fetch = () => { assert.fail('No debe consultar con una sesión vencida') }
  await assert.rejects(api.consultarPerfil({ ...sesion, expiraEn: Date.now() - 1 }), (error) => error.tipo === 'sesion')
})

test('guarda solo los cambios con PATCH y no envía una edición vacía', async () => {
  const llamadas = []
  globalThis.fetch = async (destino, opciones) => {
    llamadas.push({ destino, opciones })
    return Response.json({ ...perfil, carrera: null, asignaturas_interes: ['9'] })
  }
  const actualizado = await api.actualizarPerfil(sesion, { carrera: null, asignaturas_interes: ['9'] })
  assert.equal(actualizado.carrera, null)
  assert.equal(llamadas[0].destino, url())
  assert.equal(llamadas[0].opciones.method, 'PATCH')
  assert.equal(llamadas[0].opciones.headers['Content-Type'], 'application/json')
  assert.equal(llamadas[0].opciones.headers.Authorization, 'Bearer ' + sesion.token)
  assert.deepEqual(JSON.parse(llamadas[0].opciones.body), { carrera: null, asignaturas_interes: ['9'] })

  globalThis.fetch = async () => Response.json({ message: ['nombre must be a string'] }, { status: 400 })
  await assert.rejects(api.actualizarPerfil(sesion, { nombre: 'x' }), (error) => {
    assert.equal(error.tipo, 'invalido', 'Al guardar, un 400 sí indica datos rechazados')
    assert.match(error.message, /no son válidos/)
    return true
  })

  globalThis.fetch = () => { assert.fail('No debe enviar una edición sin cambios') }
  await assert.rejects(api.actualizarPerfil(sesion, {}), /No hay cambios/)
})

test('valida el formulario con los mismos límites que la API', () => {
  const base = formulario.desdePerfil(perfil)
  assert.deepEqual(base, {
    nombre: 'Camila González', carrera: 'Ingeniería Civil en Informática', semestre: '4',
    biografia: 'Me gusta el cálculo.', asignaturas: ['3', '7'],
  })
  assert.deepEqual(formulario.validarFormularioPerfil(base), {})
  assert.deepEqual(formulario.validarFormularioPerfil({ ...base, carrera: '', semestre: '', biografia: '', asignaturas: [] }), {})
  const errores = formulario.validarFormularioPerfil({
    nombre: '   ', carrera: 'x'.repeat(151), semestre: '15', biografia: 'x'.repeat(1001),
    asignaturas: Array.from({ length: 11 }, (_, i) => String(i + 1)),
  })
  assert.deepEqual(Object.keys(errores).sort(), ['asignaturas', 'biografia', 'carrera', 'nombre', 'semestre'])
  for (const semestre of ['0', '2.5', 'abc', '-1']) {
    assert.ok(formulario.validarFormularioPerfil({ ...base, semestre }).semestre, semestre)
  }
  assert.ok(formulario.validarFormularioPerfil({ ...base, nombre: 'x'.repeat(151) }).nombre)
})

test('calcula solo los campos modificados, normalizados para la API', () => {
  const base = formulario.desdePerfil(perfil)
  assert.deepEqual(formulario.calcularCambiosPerfil(perfil, base), {})
  assert.deepEqual(formulario.calcularCambiosPerfil(perfil, { ...base, nombre: '  Camila González  ' }), {}, 'Espacios extra no son un cambio')
  assert.deepEqual(formulario.calcularCambiosPerfil(perfil, {
    ...base, nombre: ' Camila G. ', carrera: '   ', semestre: '', biografia: 'Nueva', asignaturas: ['7', '3', '7'],
  }), {
    nombre: 'Camila G.', carrera: null, semestre_actual: null, biografia: 'Nueva', asignaturas_interes: ['7', '3'],
  })
  assert.deepEqual(formulario.calcularCambiosPerfil(perfil, { ...base, semestre: '5' }), { semestre_actual: 5 })
})

// Busca una casilla por valor sin depender del orden en que React escribe los atributos.
const casilla = (html, id, atributo) =>
  new RegExp(`<input(?=[^>]*value="${id}")(?=[^>]*${atributo}="")[^>]*>`).test(html)

const render = (propiedades = {}) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Page, {
  consulta: { estado: 'listo', perfil }, materias, cargandoMaterias: false, editando: false,
  guardado: { estado: 'inactivo' },
  onReintentar() {}, onEditar() {}, onCancelar() {}, onGuardar() {}, onIniciarSesionNuevamente() {},
  ...propiedades,
})))

test('muestra el perfil con sus datos y asignaturas, y avisa vacíos y cambios guardados', () => {
  const html = render()
  assert.match(html, /<h1[^>]*>Mi perfil<\/h1>/)
  assert.match(html, /Camila González/)
  assert.match(html, /camila@alu\.uct\.cl/)
  assert.match(html, /<dt>Carrera<\/dt><dd>Ingeniería Civil en Informática<\/dd>/)
  assert.match(html, /<dt>Semestre<\/dt><dd>4<\/dd>/)
  assert.match(html, /Me gusta el cálculo\./)
  assert.match(html, /<li>Cálculo I<\/li><li>Programación I<\/li>/)
  assert.match(html, />Editar perfil</)
  assert.doesNotMatch(html, /<form/)

  const vacio = render({ consulta: { estado: 'listo', perfil: { ...perfil, carrera: null, semestre_actual: null, biografia: null, asignaturas_interes: [] } } })
  assert.equal((vacio.match(/Sin indicar/g) ?? []).length, 2)
  assert.match(vacio, /Aún no escribes una biografía/)
  assert.match(vacio, /Aún no eliges asignaturas/)

  assert.match(render({ consulta: { estado: 'listo', perfil: { ...perfil, asignaturas_interes: ['99'] } } }), /Materia #99/)
  assert.match(render({ guardado: { estado: 'exitoso' } }), /role="status"[^>]*><p[^>]*>Tus cambios se guardaron/)
})

test('presenta la carga y los errores; solo ofrece reintentar ante fallos de consulta', () => {
  assert.match(render({ consulta: { estado: 'cargando' } }), /role="status"><p>Cargando tu perfil…/)
  const fallo = render({ consulta: { estado: 'error', mensaje: 'No pudimos cargar tu perfil. Inténtalo de nuevo.', tipo: 'consulta' } })
  assert.match(fallo, /role="alert"/)
  assert.match(fallo, />Reintentar</)
  for (const tipo of ['sesion', 'no-encontrado']) {
    const sinSesion = render({ consulta: { estado: 'error', mensaje: 'Tu sesión no es válida.', tipo } })
    assert.doesNotMatch(sinSesion, />Reintentar</, tipo)
    assert.match(sinSesion, />Iniciar sesión nuevamente</, tipo)
    assert.doesNotMatch(sinSesion, /href="\/login"/, 'Un enlace a /login volvería aquí mientras el token local siga vigente')
  }
  assert.doesNotMatch(render({ consulta: { estado: 'error', mensaje: 'Algunos datos no son válidos.', tipo: 'invalido' } }), /Reintentar|Iniciar sesión nuevamente/)
})

test('si Auth revoca la sesión al guardar, ofrece iniciarla de nuevo sin perder el aviso', () => {
  const revocada = render({ editando: true, guardado: { estado: 'error', mensaje: 'Tu sesión no es válida o ha vencido.', sesionInvalida: true } })
  assert.match(revocada, /role="alert"><p>Tu sesión no es válida o ha vencido\.<\/p><button[^>]*>Iniciar sesión nuevamente/)
  const rechazo = render({ editando: true, guardado: { estado: 'error', mensaje: 'Algunos datos del perfil no son válidos.', sesionInvalida: false } })
  assert.doesNotMatch(rechazo, /Iniciar sesión nuevamente/)
})

test('todas las cuentas, incluida la de administrador, llegan a Mi perfil desde el menú', () => {
  for (const rol of ['Estudiante', 'Tutor', 'Administrador']) {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(MenuUsuario, {
      usuario: { etiqueta: 'Camila', rol }, alCerrarSesion() {},
    })))
    assert.match(html, /href="\/perfil"[^>]*>Mi perfil</, rol)
  }
  const admin = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(MenuUsuario, {
    usuario: { etiqueta: 'Camila', rol: 'Administrador' }, alCerrarSesion() {},
  })))
  assert.doesNotMatch(admin, /Mi panel|Ser tutor|Cambiar contexto/)
})

test('el formulario de edición parte de los datos guardados y protege el correo', () => {
  const html = render({ editando: true })
  assert.match(html, /<form[^>]*novalidate=""/i)
  assert.match(html, /name="nombre"[^>]*value="Camila González"|value="Camila González"[^>]*name="nombre"/)
  assert.match(html, /name="carrera"[^>]*value="Ingeniería Civil en Informática"|value="Ingeniería Civil en Informática"[^>]*name="carrera"/)
  assert.match(html, /<option value="4" selected="">4° semestre<\/option>/)
  assert.match(html, /<textarea[^>]*name="biografia"[^>]*>Me gusta el cálculo\.<\/textarea>/)
  assert.match(html, /20 \/ 1000 caracteres/)
  assert.match(html, /\(no se puede modificar\)/)
  assert.doesNotMatch(html, /name="correo/)
  assert.ok(casilla(html, '3', 'checked'))
  assert.ok(casilla(html, '7', 'checked'))
  assert.ok(!casilla(html, '9', 'checked'))
  assert.match(html, /2 de 10 seleccionadas/)
  assert.match(html, /disabled="">Guardar cambios/, 'Sin cambios no se puede guardar')
})

test('al llegar a diez asignaturas bloquea las demás y conserva las que salieron del catálogo', () => {
  const diez = Array.from({ length: 10 }, (_, i) => String(100 + i))
  const catalogo = [...materias, ...diez.map((id) => ({ idMateria: id, codigo: 'C' + id, nombre: 'Materia ' + id }))]
  const completo = render({ editando: true, materias: catalogo, consulta: { estado: 'listo', perfil: { ...perfil, asignaturas_interes: diez } } })
  assert.match(completo, /10 de 10 seleccionadas · Quita una para elegir otra/)
  assert.ok(casilla(completo, '9', 'disabled'), 'Las no elegidas se bloquean')
  assert.ok(casilla(completo, '100', 'checked'))
  assert.ok(!casilla(completo, '100', 'disabled'), 'Las elegidas se pueden quitar')

  const huerfana = render({ editando: true, consulta: { estado: 'listo', perfil: { ...perfil, asignaturas_interes: ['3', '55'] } } })
  assert.match(huerfana, /ya no aparecen en el catálogo/)
  assert.match(huerfana, /aria-label="Quitar materia #55"/)
})

test('durante y tras un guardado fallido conserva el formulario y explica el error', () => {
  const guardando = render({ editando: true, guardado: { estado: 'guardando' } })
  assert.match(guardando, /Guardando…/)
  assert.match(guardando, /aria-busy="true"/)
  assert.match(guardando, /name="nombre"[^>]*disabled=""|disabled=""[^>]*name="nombre"/)
  const error = render({ editando: true, guardado: { estado: 'error', mensaje: 'Algunos datos del perfil no son válidos.', sesionInvalida: false } })
  assert.match(error, /role="alert"><p>Algunos datos del perfil no son válidos\./)
  assert.match(error, /name="nombre"/)
  assert.match(render({ editando: true, cargandoMaterias: true }), /Cargando asignaturas…/)
})

test('la ruta del perfil exige sesión', async () => {
  const html = await renderizarRuta(createElement(MemoryRouter, { initialEntries: ['/perfil'] }, createElement(AppRoutes)))
  assert.match(html, /Redirigiendo al inicio de sesión…/)
  assert.doesNotMatch(html, /Editar perfil/)
})

test('al cambiar el nombre actualiza la sesión local para que la cabecera lo muestre', () => {
  const guardados = new Map([['usuario', JSON.stringify({ idUsuario: '23', nombre: 'Camila' })]])
  const eventos = []
  const ventanaOriginal = globalThis.window
  globalThis.window = {
    localStorage: { setItem: (clave, valor) => guardados.set(clave, valor) },
    dispatchEvent: (evento) => { eventos.push(evento.type) },
  }
  try {
    actualizarNombreUsuario('23', '  Camila G.  ')
    assert.deepEqual(JSON.parse(guardados.get('usuario')), { idUsuario: '23', nombre: 'Camila G.' })
    assert.deepEqual(eventos, ['stp:sesion'])
    actualizarNombreUsuario('23', '   ')
    assert.deepEqual(eventos, ['stp:sesion'], 'Un nombre vacío no se guarda')
  } finally {
    globalThis.window = ventanaOriginal
  }
})
