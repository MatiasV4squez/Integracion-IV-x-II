import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { createServer } from 'vite'
import { renderizarRuta } from './helpers/renderizar-ruta.mjs'

let server, PerfilTutorPage, BuscarTutoresPage, AppRoutes
const fetchOriginal = globalThis.fetch
const materia = { idMateria: '9007199254740993', codigo: 'MAT1188', nombre: 'Cálculo' }
const tutor = {
  idTutor: '9007199254740995', promedioCalificaciones: 4.5, cantidadCalificaciones: 2,
  horariosDisponibles: [
    { idBloque: '32', dia: '2026-12-02', horaInicio: '09:00', horaFin: '10:00' },
    { idBloque: '31', dia: '2026-12-01', horaInicio: '10:00', horaFin: '11:00' },
  ],
}
const destinoSolicitud = '/solicitudes/nueva?materiaId=9007199254740993&tutorId=9007199254740995'

before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ default: PerfilTutorPage } = await server.ssrLoadModule('/src/features/tutores/pages/PerfilTutorPage.tsx'))
  ;({ default: BuscarTutoresPage } = await server.ssrLoadModule('/src/features/tutores/pages/BuscarTutoresPage.tsx'))
  ;({ AppRoutes } = await server.ssrLoadModule('/src/app/AppRoutes.tsx'))
})

afterEach(() => { globalThis.fetch = fetchOriginal })
after(async () => { await server?.close() })

function renderPerfil(consulta, adicionales = {}) {
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(PerfilTutorPage, {
    consulta, materia, destinoVolver: '/tutores?materiaId=' + materia.idMateria,
    destinoSolicitud, onReintentar() {}, ...adicionales,
  })))
}

test('el perfil muestra calificación, materia y horarios ordenados, y enlaza la solicitud con los IDs completos', () => {
  const html = renderPerfil({ estado: 'listo', tutor })
  assert.match(html, /Tutor de Cálculo · MAT1188/)
  assert.match(html, /4,5 de 5/)
  assert.ok(html.indexOf('1 dic') < html.indexOf('2 dic'), 'Los horarios se ordenan por fecha')
  assert.match(html, /href="\/solicitudes\/nueva\?materiaId=9007199254740993&amp;tutorId=9007199254740995"[^>]*>\s*Solicitar tutoría/)
  assert.match(html, /href="\/tutores\?materiaId=9007199254740993"/)
})

test('el perfil no ofrece solicitar sin horarios ni en el perfil propio', () => {
  const sinHorarios = renderPerfil({ estado: 'listo', tutor: { ...tutor, horariosDisponibles: [] } })
  assert.match(sinHorarios, /no tiene horarios disponibles/)
  assert.doesNotMatch(sinHorarios, /Solicitar tutoría/)
  assert.doesNotMatch(renderPerfil({ estado: 'listo', tutor }, { destinoSolicitud: undefined }), /Solicitar tutoría/)
})

test('el perfil distingue carga, error con reintento, tutor no habilitado y acceso sin materia', () => {
  assert.match(renderPerfil({ estado: 'cargando' }), /Cargando perfil/)
  const error = renderPerfil({ estado: 'error', mensaje: 'Servicio no disponible' })
  assert.match(error, /role="alert"/)
  assert.match(error, /Servicio no disponible/)
  assert.match(error, />Reintentar<\/button>/)
  assert.match(renderPerfil({ estado: 'no-encontrado' }), /no está habilitado para la materia seleccionada/)
  assert.match(renderPerfil({ estado: 'invalido' }), /Selecciona un tutor desde la búsqueda/)
})

test('la búsqueda habilita Ver perfil cuando recibe la acción del contenedor', () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(BuscarTutoresPage, {
    materias: [materia], materiaId: materia.idMateria, cargandoMaterias: false, onReintentarMaterias() {},
    consulta: { estado: 'listo', resultado: { items: [tutor], total: 1, page: 1, limit: 10, totalPages: 1 } },
    onBuscar() {}, onCambiarPagina() {}, onVerPerfil() {},
  })))
  assert.doesNotMatch(html, /disabled=""[^>]*>Ver perfil/)
})

test('el perfil es una ruta privada como la búsqueda: sin sesión redirige al login sin consultar la API', async () => {
  globalThis.fetch = () => assert.fail('Sin una sesión válida no debe consultar la API')
  const html = await renderizarRuta(createElement(MemoryRouter,
    { initialEntries: ['/tutores/9007199254740995?materiaId=9007199254740993'] }, createElement(AppRoutes)))
  assert.match(html, /Redirigiendo al inicio de sesión/)
  assert.doesNotMatch(html, /Horarios disponibles|Solicitar tutoría/)
})
