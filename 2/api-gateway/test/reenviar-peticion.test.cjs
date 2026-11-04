const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ReenviarPeticion } = require('../dist/aplicacion/casos-de-uso/reenviar-peticion.js');
const { ErrorReenvio } = require('../dist/dominio/reenvio.js');

function crearPeticion(ruta = '/api/usuarios-auth/perfil?q=1&q=%2F') {
  return {
    metodo: 'POST',
    ruta,
    encabezados: { authorization: 'Bearer jwt-de-prueba' },
    cuerpo: (async function* () { yield new Uint8Array([0, 255, 42]); })(),
  };
}

test('el caso de uso funciona con puertos en memoria, sin NestJS ni servidores', async () => {
  const peticion = crearPeticion();
  const cancelacion = new AbortController().signal;
  const respuesta = { estado: 201, encabezados: {}, cuerpo: peticion.cuerpo };
  const configuracion = {
    obtenerUrl(servicio) {
      assert.equal(servicio, 'usuarios-auth');
      return 'https://micro.example/interno';
    },
    obtenerTiempoEsperaMs: () => 1234,
  };
  const cliente = {
    async enviar(solicitud, señal) {
      assert.equal(señal, cancelacion);
      assert.equal(solicitud.urlBase, 'https://micro.example/interno');
      assert.equal(solicitud.ruta, '/perfil?q=1&q=%2F');
      assert.equal(solicitud.tiempoEsperaMs, 1234);
      assert.equal(solicitud.metodo, 'POST');
      // Se entregan los mismos encabezados y flujo, sin consumir el cuerpo.
      assert.equal(solicitud.encabezados, peticion.encabezados);
      assert.equal(solicitud.cuerpo, peticion.cuerpo);
      return respuesta;
    },
  };
  const resultado = await new ReenviarPeticion(configuracion, cliente).ejecutar(peticion, cancelacion);
  assert.equal(resultado.servicio, 'usuarios-auth');
  assert.equal(resultado.respuesta, respuesta);
});

test('las rutas ajenas al reenvío no consultan los puertos de salida', async () => {
  const inesperado = () => assert.fail('No se debe consultar un puerto de salida');
  const caso = new ReenviarPeticion({
    obtenerUrl: inesperado,
    obtenerTiempoEsperaMs: inesperado,
  }, { enviar: inesperado });
  for (const ruta of ['/api/health', '/api/usuarios-auth-extra', '/usuarios-auth/perfil', '/api/toString']) {
    assert.equal(await caso.ejecutar(crearPeticion(ruta), new AbortController().signal), undefined);
  }
});

test('un servicio sin URL produce un error del núcleo sin llamar al cliente', async () => {
  const caso = new ReenviarPeticion({
    obtenerUrl: () => '',
    obtenerTiempoEsperaMs: () => assert.fail('No corresponde iniciar una petición'),
  }, { enviar: () => assert.fail('No corresponde llamar al micro') });
  await assert.rejects(caso.ejecutar(crearPeticion(), new AbortController().signal), (error) => {
    assert.ok(error instanceof ErrorReenvio);
    assert.equal(error.motivo, 'SIN_CONFIGURAR');
    assert.equal(error.servicio, 'usuarios-auth');
    return true;
  });
});

test('los fallos del puerto conservan su motivo e identifican al servicio', async () => {
  for (const motivo of ['COMUNICACION', 'TIEMPO_AGOTADO']) {
    const caso = new ReenviarPeticion({
      obtenerUrl: () => 'http://micro.example',
      obtenerTiempoEsperaMs: () => 1000,
    }, { enviar: async () => { throw new ErrorReenvio(motivo); } });
    await assert.rejects(caso.ejecutar(crearPeticion(), new AbortController().signal), (error) => {
      assert.ok(error instanceof ErrorReenvio);
      assert.equal(error.motivo, motivo);
      assert.equal(error.servicio, 'usuarios-auth');
      return true;
    });
  }
});
