import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement } from 'react'
import { MemoryRouter } from 'react-router'
import { createServer } from 'vite'
import { renderizarRuta } from './helpers/renderizar-ruta.mjs'

let vite, AppRoutes, acceso

before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ AppRoutes } = await vite.ssrLoadModule('/src/app/AppRoutes.tsx'))
  acceso = await vite.ssrLoadModule('/src/shared/auth/acceso-rutas.ts')
})
after(async () => { await vite?.close() })

const renderRuta = (ruta) => renderizarRuta(createElement(MemoryRouter, { initialEntries: [ruta] }, createElement(AppRoutes)))

test('exige sesión y el rol que corresponde a cada sección', () => {
  const { evaluarAcceso } = acceso
  assert.equal(evaluarAcceso(null), 'sesion')
  assert.equal(evaluarAcceso(null, ['TUTOR']), 'sesion')
  assert.equal(evaluarAcceso({ roles: [] }), 'permitido')
  assert.equal(evaluarAcceso({ roles: ['ESTUDIANTE'] }, ['ESTUDIANTE']), 'permitido')
  assert.equal(evaluarAcceso({ roles: ['ESTUDIANTE'] }, ['TUTOR']), 'permiso')
  assert.equal(evaluarAcceso({ roles: ['ESTUDIANTE', 'TUTOR'] }, ['TUTOR']), 'permitido')
  assert.equal(evaluarAcceso({ roles: ['TUTOR'] }, ['ADMINISTRADOR']), 'permiso')
  for (const rol of ['ADMIN', 'ADMINISTRADOR']) {
    assert.equal(evaluarAcceso({ roles: [rol] }, ['ADMINISTRADOR']), 'permitido')
  }
  assert.equal(evaluarAcceso({ roles: ['ADMIN'] }, ['ESTUDIANTE']), 'permiso', 'Ser administrador no concede otros roles')
  assert.equal(evaluarAcceso({ roles: ['tutor'] }, ['TUTOR']), 'permiso', 'Los roles llegan normalizados desde interpretarSesion')
})

test('sin sesión las rutas privadas redirigen al login sin mostrar su contenido', async () => {
  const privadas = [
    ['/materias', /Explora las asignaturas/],
    ['/tutores?materiaId=3&page=1', /Resultados de búsqueda/],
    ['/inicio', /Panel del estudiante|Próxima/],
    ['/panel', /Mi panel/],
    ['/solicitudes/nueva', /Cálculo intermedio/],
    ['/solicitudes/recibidas', /Solicitudes recibidas/],
    ['/disponibilidad', /Gestión de disponibilidad/],
    ['/administracion/postulaciones', /Administrar postulaciones/],
  ]
  for (const [ruta, contenido] of privadas) {
    const html = await renderRuta(ruta)
    assert.match(html, /role="status"[^>]*>Redirigiendo al inicio de sesión…/, ruta)
    assert.doesNotMatch(html.replace(/<header[\s\S]*<\/header>/, ''), contenido, ruta)
    assert.equal((html.match(/<main\b/g) ?? []).length, 1, ruta)
  }
})

test('las rutas públicas y de acceso siguen disponibles sin sesión', async () => {
  for (const [ruta, contenido] of [
    ['/', /Encuentra al tutor perfecto para ti/], ['/verificar-cuenta', /Verifica/],
    ['/login', /Bienvenido de vuelta/], ['/registro', /Crea tu cuenta/],
  ]) {
    const html = await renderRuta(ruta)
    assert.doesNotMatch(html, /Redirigiendo al inicio de sesión/, ruta)
    assert.match(html, contenido, ruta)
  }
})

test('el inicio público reutiliza el layout y ofrece acceso y registro sin consultas privadas', async () => {
  const html = await renderRuta('/')
  assert.equal((html.match(/<main\b/g) ?? []).length, 1)
  assert.equal((html.match(/<header\b/g) ?? []).length, 1)
  assert.equal((html.match(/<footer\b/g) ?? []).length, 1)
  assert.match(html, /Cómo funciona/)
  assert.match(html, /href="\/login"[^>]*>Iniciar sesión<\/a>/)
  assert.match(html, /href="\/registro"[^>]*>Crear cuenta<\/a>/)
  assert.doesNotMatch(html, /<form\b|<input\b/)
})
