const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createServer, request } = require('node:http');
const { gzipSync } = require('node:zlib');
const { test } = require('node:test');

function consultar(base, ruta, { method = 'GET', headers = {}, cuerpo } = {}) {
  return new Promise((resolve, reject) => {
    const solicitud = request(base, { path: ruta, method, headers }, (respuesta) => {
      const partes = [];
      respuesta.on('data', (parte) => partes.push(parte));
      respuesta.on('error', reject);
      respuesta.on('end', () => resolve({
        estado: respuesta.statusCode,
        encabezados: respuesta.headers,
        cuerpo: Buffer.concat(partes),
      }));
    });
    solicitud.on('error', reject);
    solicitud.end(cuerpo);
  });
}

test('Gateway HTTP con microservicios locales', { timeout: 15000 }, async (t) => {
  const variables = {
    'usuarios-auth': 'USUARIOS_AUTH_URL',
    'materias-tutores': 'MATERIAS_TUTORES_URL',
    'agendamiento-sesiones': 'AGENDAMIENTO_SESIONES_URL',
    'reportes-moderacion': 'REPORTES_MODERACION_URL',
  };
  const originales = { ...process.env };
  process.env.CORS_ORIGIN = 'http://localhost:5173';
  process.env.HTTP_TIMEOUT_MS = '2000';
  for (const variable of Object.values(variables)) process.env[variable] = '';
  t.after(() => {
    for (const variable of ['CORS_ORIGIN', 'HTTP_TIMEOUT_MS', ...Object.values(variables)]) {
      if (originales[variable] === undefined) delete process.env[variable];
      else process.env[variable] = originales[variable];
    }
  });

  let llamadas = 0;
  const comprimido = gzipSync(Buffer.from('Respuesta binaria del microservicio'));
  const micro = createServer((entrada, salida) => {
    llamadas++;
    if (entrada.url.endsWith('/lento')) return;
    if (entrada.url.endsWith('/interrumpido')) {
      salida.writeHead(200, { 'content-length': '1000' });
      salida.write('incompleto');
      setImmediate(() => salida.destroy());
      return;
    }
    if (entrada.url.endsWith('/goteo')) {
      salida.writeHead(200);
      const intervalo = setInterval(() => salida.write('parte'), 10);
      salida.once('close', () => clearInterval(intervalo));
      return;
    }
    const partes = [];
    entrada.on('data', (parte) => partes.push(parte));
    entrada.on('end', () => {
      if (entrada.url.endsWith('/binario')) {
        salida.writeHead(200, {
          'content-type': 'application/octet-stream',
          'content-encoding': 'gzip',
          'content-length': comprimido.length,
        });
        salida.end(comprimido);
        return;
      }
      if (entrada.url.endsWith('/redireccion')) {
        salida.writeHead(302, { location: '/login' });
        salida.end();
        return;
      }
      if (entrada.url.endsWith('/denegado')) {
        salida.writeHead(401, { 'www-authenticate': 'Bearer' });
        salida.end('JWT rechazado por el microservicio');
        return;
      }
      salida.writeHead(201, {
        'content-type': 'application/json',
        'set-cookie': ['sesion=abc; HttpOnly', 'preferencia=oscuro'],
        'x-servicio': 'micro-local',
        'access-control-allow-origin': 'https://otro-origen.example',
        vary: 'Accept-Encoding',
        connection: 'keep-alive, x-interno',
        'x-interno': 'solo-para-esta-conexion',
      });
      salida.end(JSON.stringify({
        metodo: entrada.method,
        ruta: entrada.url,
        encabezados: entrada.headers,
        cuerpo: Buffer.concat(partes).toString('base64'),
      }));
    });
  });
  t.after(() => new Promise((resolve) => {
    micro.close(resolve);
    micro.closeAllConnections();
  }));
  micro.listen(0, '127.0.0.1');
  await once(micro, 'listening');
  const destino = `http://127.0.0.1:${micro.address().port}`;

  const { crearAplicacion } = await import('../dist/crear-aplicacion.js');
  const { ConfigService } = await import('@nestjs/config');
  const aplicacion = await crearAplicacion({ logger: false });
  t.after(() => aplicacion.close());
  const configuracion = aplicacion.get(ConfigService);
  for (const [servicio, variable] of Object.entries(variables)) {
    configuracion.set(variable, `${destino}/interno/${servicio}/`);
  }
  await aplicacion.listen(0, '127.0.0.1');
  const gateway = await aplicacion.getUrl();

  await t.test('conserva health y deja las rutas desconocidas en 404', async () => {
    const salud = await consultar(gateway, '/api/health');
    assert.equal(salud.estado, 200);
    assert.deepEqual(JSON.parse(salud.cuerpo), { estado: 'ok', servicio: 'api-gateway' });
    const previas = llamadas;
    for (const ruta of ['/api/desconocido', '/api/usuarios-auth-extra/perfil', '/usuarios-auth/perfil']) {
      assert.equal((await consultar(gateway, ruta)).estado, 404);
    }
    assert.equal(llamadas, previas);
  });

  await t.test('conecta los cuatro servicios y conserva la ruta base y la consulta exacta', async () => {
    for (const servicio of Object.keys(variables)) {
      const resultado = await consultar(gateway, `/api/${servicio}/perfil/a%2Fb?q=uno+dos&q=%2F`);
      assert.equal(resultado.estado, 201);
      assert.equal(JSON.parse(resultado.cuerpo).ruta, `/interno/${servicio}/perfil/a%2Fb?q=uno+dos&q=%2F`);
    }
    for (const sufijo of ['', '/', '?q=1']) {
      const resultado = await consultar(gateway, `/api/usuarios-auth${sufijo}`);
      assert.equal(JSON.parse(resultado.cuerpo).ruta, `/interno/usuarios-auth/${sufijo.startsWith('?') ? sufijo : ''}`);
    }
  });

  await t.test('conserva métodos, JWT, cuerpos, cookies y encabezados pertinentes', async () => {
    const cuerpo = Buffer.from('{ "nombre": "Sergio", "activo": true }\n');
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'GET']) {
      const resultado = await consultar(gateway, '/api/usuarios-auth/perfil', {
        method,
        cuerpo,
        headers: {
          authorization: 'Bearer jwt-de-prueba',
          'content-type': 'application/json',
          'content-length': cuerpo.length,
          connection: 'keep-alive, x-solo-conexion',
          'x-solo-conexion': 'no-reenviar',
        },
      });
      const eco = JSON.parse(resultado.cuerpo);
      assert.equal(resultado.estado, 201);
      assert.equal(eco.metodo, method);
      assert.equal(eco.encabezados.authorization, 'Bearer jwt-de-prueba');
      assert.equal(eco.encabezados['content-type'], 'application/json');
      assert.equal(eco.encabezados.host, new URL(destino).host);
      assert.equal(eco.encabezados['x-solo-conexion'], undefined);
      assert.deepEqual(Buffer.from(eco.cuerpo, 'base64'), cuerpo);
      assert.deepEqual(resultado.encabezados['set-cookie'], ['sesion=abc; HttpOnly', 'preferencia=oscuro']);
      assert.equal(resultado.encabezados['x-servicio'], 'micro-local');
      assert.equal(resultado.encabezados['x-interno'], undefined);
    }
    const head = await consultar(gateway, '/api/usuarios-auth/perfil', { method: 'HEAD' });
    assert.equal(head.estado, 201);
    assert.equal(head.cuerpo.length, 0);
  });

  await t.test('transmite multipart y binarios grandes sin parsearlos', async () => {
    const cuerpo = Buffer.concat([
      Buffer.from('--archivo\r\nContent-Disposition: form-data; name="adjunto"; filename="prueba.bin"\r\nContent-Type: application/octet-stream\r\n\r\n'),
      Buffer.alloc(256 * 1024, 0xab),
      Buffer.from('\r\n--archivo--\r\n'),
    ]);
    const resultado = await consultar(gateway, '/api/reportes-moderacion/adjunto', {
      method: 'POST', cuerpo,
      headers: { 'content-type': 'multipart/form-data; boundary=archivo' },
    });
    const eco = JSON.parse(resultado.cuerpo);
    assert.equal(eco.encabezados['content-type'], 'multipart/form-data; boundary=archivo');
    assert.deepEqual(Buffer.from(eco.cuerpo, 'base64'), cuerpo);
    const binario = await consultar(gateway, '/api/reportes-moderacion/binario');
    assert.equal(binario.encabezados['content-encoding'], 'gzip');
    assert.deepEqual(binario.cuerpo, comprimido);
  });

  await t.test('conserva errores del micro y no sigue redirecciones', async () => {
    const denegado = await consultar(gateway, '/api/usuarios-auth/denegado');
    assert.equal(denegado.estado, 401);
    assert.equal(denegado.encabezados['www-authenticate'], 'Bearer');
    assert.equal(denegado.cuerpo.toString(), 'JWT rechazado por el microservicio');
    const redireccion = await consultar(gateway, '/api/usuarios-auth/redireccion');
    assert.equal(redireccion.estado, 302);
    assert.equal(redireccion.encabezados.location, '/login');
  });

  await t.test('CORS cubre respuestas y preflight con Authorization sin llamar al micro', async () => {
    const previas = llamadas;
    const preflight = await consultar(gateway, '/api/usuarios-auth/perfil', {
      method: 'OPTIONS',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'PATCH',
        'access-control-request-headers': 'authorization,content-type',
      },
    });
    assert.equal(preflight.estado, 204);
    assert.equal(preflight.encabezados['access-control-allow-origin'], 'http://localhost:5173');
    assert.match(preflight.encabezados['access-control-allow-headers'], /authorization/i);
    assert.match(preflight.encabezados['access-control-allow-methods'], /PATCH/);
    assert.equal(llamadas, previas);
    const resultado = await consultar(gateway, '/api/usuarios-auth/perfil', {
      headers: { origin: 'http://localhost:5173' },
    });
    assert.equal(resultado.encabezados['access-control-allow-origin'], 'http://localhost:5173');
    assert.match(resultado.encabezados.vary, /Origin/);
    assert.match(resultado.encabezados.vary, /Accept-Encoding/);
    const ajeno = await consultar(gateway, '/api/health', { headers: { origin: 'https://ajeno.example' } });
    assert.notEqual(ajeno.encabezados['access-control-allow-origin'], 'https://ajeno.example');
  });

  await t.test('devuelve 503 sin configuración y 502 cuando el servicio es inaccesible', async () => {
    const original = configuracion.get('USUARIOS_AUTH_URL');
    try {
      configuracion.set('USUARIOS_AUTH_URL', '');
      const vacio = await consultar(gateway, '/api/usuarios-auth/perfil');
      assert.equal(vacio.estado, 503);
      assert.equal(JSON.parse(vacio.cuerpo).servicio, 'usuarios-auth');
      assert.equal(vacio.encabezados['access-control-allow-origin'], 'http://localhost:5173');
      const cerrado = createServer();
      cerrado.listen(0, '127.0.0.1');
      await once(cerrado, 'listening');
      const puerto = cerrado.address().port;
      await new Promise((resolve) => cerrado.close(resolve));
      configuracion.set('USUARIOS_AUTH_URL', `http://127.0.0.1:${puerto}`);
      const inaccesible = await consultar(gateway, '/api/usuarios-auth/perfil');
      assert.equal(inaccesible.estado, 502);
    } finally {
      configuracion.set('USUARIOS_AUTH_URL', original);
    }
  });

  await t.test('devuelve 504 al agotar el plazo y corta respuestas incompletas', async () => {
    configuracion.set('HTTP_TIMEOUT_MS', 80);
    try {
      const lento = await consultar(gateway, '/api/usuarios-auth/lento');
      assert.equal(lento.estado, 504);
      assert.equal(JSON.parse(lento.cuerpo).statusCode, 504);
      await assert.rejects(consultar(gateway, '/api/usuarios-auth/interrumpido'));
      // El plazo es total: también se aplica si el micro sigue enviando datos.
      await assert.rejects(consultar(gateway, '/api/usuarios-auth/goteo'));
    } finally {
      configuracion.set('HTTP_TIMEOUT_MS', 2000);
    }
  });
});

test('valida entorno, CORS y tiempo de espera', async () => {
  const { validarConfiguracion } = await import('../dist/infraestructura/configuracion-entorno.js');
  const valores = validarConfiguracion({});
  assert.equal(valores.PORT, 8080);
  assert.equal(valores.HTTP_TIMEOUT_MS, 10000);
  assert.equal(valores.CORS_ORIGIN, 'http://localhost:5173');
  assert.equal(validarConfiguracion({ CORS_ORIGIN: '*' }).CORS_ORIGIN, '*');
  for (const PORT of ['abc', 0, 65536, 1.5]) {
    assert.throws(() => validarConfiguracion({ PORT }), /PORT/);
  }
  for (const HTTP_TIMEOUT_MS of ['', 0, 'abc', 1.5, 2147483648]) {
    assert.throws(() => validarConfiguracion({ HTTP_TIMEOUT_MS }), /HTTP_TIMEOUT_MS/);
  }
  for (const CORS_ORIGIN of ['', 'ftp://web.example', 'http://localhost:5173/', 'https://web.example/ruta']) {
    assert.throws(() => validarConfiguracion({ CORS_ORIGIN }), /CORS_ORIGIN/);
  }
  for (const variable of ['USUARIOS_AUTH_URL', 'MATERIAS_TUTORES_URL', 'AGENDAMIENTO_SESIONES_URL', 'REPORTES_MODERACION_URL']) {
    assert.equal(validarConfiguracion({ [variable]: '' })[variable], '');
    assert.equal(validarConfiguracion({ [variable]: 'https://micro.example/api' })[variable], 'https://micro.example/api');
    for (const valor of ['no-es-url', 'ftp://micro.example', 'https://micro.example/?q=1', 'https://micro.example/#fragmento']) {
      assert.throws(() => validarConfiguracion({ [variable]: valor }), new RegExp(variable));
    }
  }
});
