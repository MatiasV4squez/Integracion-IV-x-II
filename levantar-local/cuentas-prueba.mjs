// Crea las cuentas de prueba de Studia con los flujos reales de la app:
// registro -> verificación con el enlace (leído del log de usuarios-auth) -> postulación de tutor
// con certificado -> aprobación del administrador. Repetible: no duplica nada.
// Uso (con ./iniciar.sh corriendo):  node cuentas-prueba.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const LOG_USUARIOS = join(RAIZ, 'logs', 'usuarios-auth.log');
const GATEWAY = process.env.GATEWAY_URL ?? 'http://localhost:8080/api';
const AUTH = `${GATEWAY}/usuarios-auth`;
const MATERIAS = `${GATEWAY}/materias-tutores`;

const CUENTAS = [
  { nombre: 'Estudiante Prueba', correo: 'estudiante@alu.uct.cl', clave: 'Estudiante123' },
  { nombre: 'Estudiante Dos', correo: 'estudiante2@alu.uct.cl', clave: 'Estudiante123' },
  { nombre: 'Tutor Prueba', correo: 'tutor@alu.uct.cl', clave: 'Tutor1234', materias: ['INFO1126', 'INFO1157'] },
  { nombre: 'Tutora Dos', correo: 'tutor2@alu.uct.cl', clave: 'Tutor1234', materias: ['INFO1126', 'MAT1188'] },
  { nombre: 'Administrador Studia', correo: 'admin@alu.uct.cl', clave: 'Admin1234', admin: true },
];

// PNG de 1x1 px como certificado de notas.
const CERTIFICADO_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function http(metodo, url, { cuerpo, token, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body = form;
  if (!form && cuerpo !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(cuerpo);
  }
  const res = await fetch(url, { method: metodo, headers, body });
  const texto = await res.text();
  let datos;
  try { datos = texto ? JSON.parse(texto) : null; } catch { datos = texto; }
  return { status: res.status, datos };
}

function exigir(res, ...esperados) {
  if (!esperados.includes(res.status)) throw new Error(`respuesta ${res.status}: ${JSON.stringify(res.datos)}`);
  return res.datos;
}

// Último enlace de verificación que usuarios-auth escribió en su log para ese correo.
async function tokenDelLog(correo) {
  for (let i = 0; i < 20; i++) {
    const lineas = readFileSync(LOG_USUARIOS, 'utf8').split('\n').filter((l) => l.includes(`Verificación para ${correo}:`));
    const m = lineas.at(-1)?.match(/[?&]token=([^\s&]+)/);
    if (m) return decodeURIComponent(m[1]);
    await esperar(500);
  }
  return null;
}

const login = (c) => http('POST', `${AUTH}/auth/login`, { cuerpo: { correo_institucional: c.correo, password: c.clave } });

async function asegurarCuentaActiva(cuenta) {
  exigir(await http('POST', `${AUTH}/usuarios/registro`, {
    cuerpo: { nombre: cuenta.nombre, correo_institucional: cuenta.correo, password_hash: cuenta.clave },
  }), 201, 409);

  const sesion = await login(cuenta);
  if (sesion.status === 200) return;
  if (sesion.datos?.code !== 'AUTH_ACCOUNT_INACTIVE') exigir(sesion, 200);

  // Sin verificar: se pide un enlace nuevo y se usa el que queda en el log.
  exigir(await http('POST', `${AUTH}/auth/reenviar-verificacion`, { cuerpo: { correo_institucional: cuenta.correo } }), 202);
  const token = await tokenDelLog(cuenta.correo);
  if (!token) throw new Error(`no apareció el enlace de verificación de ${cuenta.correo} en logs/usuarios-auth.log`);
  exigir(await http('POST', `${AUTH}/auth/verificar-correo`, { cuerpo: { token } }), 200, 409);
  exigir(await login(cuenta), 200);
}

function darRolAdministrador(correo) {
  // No existe un endpoint para crear administradores: se asigna el rol directo en la base.
  const sql = `INSERT INTO usuario_rol (id_usuario, id_rol)
    SELECT u.id_usuario, r.id_rol FROM usuario u, rol r
    WHERE u.correo_institucional = '${correo}' AND r.nombre = 'ADMINISTRADOR' ON CONFLICT DO NOTHING;`;
  execFileSync('psql', ['-h', '127.0.0.1', '-U', 'postgres', '-d', 'usuarios_auth', '-v', 'ON_ERROR_STOP=1', '-q', '-c', sql], {
    stdio: 'inherit',
    env: { ...process.env, PGPASSWORD: process.env.PGPASSWORD ?? 'postgres' },
  });
}

const tokenDe = async (c) => exigir(await login(c), 200).access_token;

async function main() {
  exigir(await http('GET', `${GATEWAY}/health`), 200);

  for (const cuenta of CUENTAS) {
    await asegurarCuentaActiva(cuenta);
    if (cuenta.admin) darRolAdministrador(cuenta.correo);
  }

  const materias = exigir(await http('GET', `${MATERIAS}/materias`), 200);
  const idPorCodigo = Object.fromEntries(materias.map((m) => [m.codigo, m.idMateria]));
  const nombrePorCodigo = Object.fromEntries(materias.map((m) => [m.codigo, m.nombre]));
  const tutores = CUENTAS.filter((c) => c.materias);

  for (const tutor of tutores) {
    const token = await tokenDe(tutor);
    const propias = exigir(await http('GET', `${MATERIAS}/postulaciones/mias`, { token }), 200);
    for (const codigo of tutor.materias) {
      const idMateria = idPorCodigo[codigo];
      if (!idMateria) throw new Error(`no existe la materia ${codigo}`);
      if (propias.some((p) => p.idMateria === idMateria && p.estado !== 'RECHAZADA')) continue;
      const form = new FormData();
      form.append('idMateria', idMateria);
      form.append('certificado', new Blob([CERTIFICADO_PNG], { type: 'image/png' }), 'certificado.png');
      exigir(await http('POST', `${MATERIAS}/postulaciones`, { token, form }), 201);
    }
  }

  const tokenAdmin = await tokenDe(CUENTAS.find((c) => c.admin));
  const idsTutores = new Set();
  for (const t of tutores) idsTutores.add(exigir(await login(t), 200).usuario.id_usuario);
  const pendientes = exigir(await http('GET', `${MATERIAS}/postulaciones/pendientes`, { token: tokenAdmin }), 200);
  for (const p of pendientes.filter((p) => idsTutores.has(p.idUsuario))) {
    const url = `${MATERIAS}/postulaciones/${p.idPostulacion}`;
    if (p.estado === 'PENDIENTE_ROL') exigir(await http('POST', `${url}/reintentar-rol`, { token: tokenAdmin }), 200, 201);
    else exigir(await http('PATCH', `${url}/aprobar`, { token: tokenAdmin, cuerpo: { notaAcreditada: 6.0 } }), 200);
  }

  console.log('Cuentas de prueba listas:\n');
  for (const c of CUENTAS) {
    const u = exigir(await login(c), 200).usuario;
    const extra = c.materias ? ` — ${c.materias.map((cod) => nombrePorCodigo[cod]).join(', ')}` : '';
    console.log(`  ${c.correo.padEnd(24)} ${c.clave.padEnd(14)} ${u.roles.join(', ')}${extra}`);
  }
}

main().catch((e) => { console.error('Error:', e.message); process.exit(1); });
