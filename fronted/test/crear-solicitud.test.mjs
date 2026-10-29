import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { createServer } from 'vite'

let vite, crearSolicitudTutoria
const fetchOriginal = globalThis.fetch

before(async () => {
  vite = await createServer({
    server: { middlewareMode: true, hmr: false },
    logLevel: 'error',
  })

  ;({ crearSolicitudTutoria } = await vite.ssrLoadModule(
    '/src/features/sesiones/services/crear-solicitud-api.ts',
  ))
})

afterEach(() => {
  globalThis.fetch = fetchOriginal
})

after(async () => {
  await vite?.close()
})

test('envía los identificadores limpios y el JWT por el Gateway', async () => {
  const llamadas = []

  globalThis.fetch = async (url, opciones) => {
    llamadas.push({ url, opciones })

    return Response.json(
      { id_sesion: '10', estado_sesion: 'PENDIENTE' },
      { status: 201 },
    )
  }

  await crearSolicitudTutoria(
    {
      id_tutor: ' 9007199254740993 ',
      id_materia: ' 1 ',
      id_bloque: ' 2 ',
      id_tutee: '999',
      campoExtra: 'no enviar',
    },
    'jwt-de-prueba',
  )

  assert.equal(llamadas.length, 1)

  const { url, opciones } = llamadas[0]
  const base = (
    vite.config.env.VITE_API_URL ?? 'http://localhost:8080/api'
  ).replace(/\/$/, '')

  assert.equal(url, `${base}/agendamiento-sesiones/sessions`)
  assert.equal(opciones.method, 'POST')
  assert.equal(opciones.headers.Authorization, 'Bearer jwt-de-prueba')
  assert.equal(opciones.headers['Content-Type'], 'application/json')

  assert.deepEqual(JSON.parse(opciones.body), {
    id_tutor: '9007199254740993',
    id_materia: '1',
    id_bloque: '2',
  })
})

test('rechaza identificadores inválidos antes de llamar a la API', async () => {
  globalThis.fetch = () => {
    assert.fail('No debe enviar datos inválidos')
  }

  const seleccion = {
    id_tutor: '2',
    id_materia: '1',
    id_bloque: '3',
  }

  const invalidos = [
    '', '   ', '0', '-2', '2.5', '2abc',
    '<script>2</script>', '9223372036854775808',
    2, null, undefined,
  ]

  for (const campo of Object.keys(seleccion)) {
    for (const valor of invalidos) {
      await assert.rejects(
        crearSolicitudTutoria(
          { ...seleccion, [campo]: valor },
          'jwt-de-prueba',
        ),
        /identificador válido/,
      )
    }
  }
})