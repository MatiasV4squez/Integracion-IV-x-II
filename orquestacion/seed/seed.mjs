// Carga las cuentas de prueba a través del API Gateway (mismos flujos que usa la app).
// Es idempotente: si una cuenta, postulación u horario ya existe, lo deja como está.
import { execFileSync } from 'node:child_process';

const GW = process.env.GATEWAY_URL ?? 'http://api-gateway:8080/api';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = (db, query) => execFileSync('psql', ['-d', db, '-tAc', query]).toString().trim();

async function call(method, path, { token, body, form } = {}) {
  const res = await fetch(`${GW}${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: form ?? (body ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}
const yaExiste = (e) => /-> 409/.test(String(e));

// Espera a que el Gateway y los micros respondan (las migraciones pueden tardar al primer arranque).
for (let i = 1; ; i++) {
  try {
    await call('GET', '/materias-tutores/materias');
    await call('POST', '/usuarios-auth/auth/login', { body: { correo_institucional: 'nadie@alu.uct.cl', password: 'x' } }).catch((e) => {
      if (!/-> 401/.test(String(e))) throw e;
    });
    break;
  } catch (e) {
    if (i > 90) throw e;
    console.log(`esperando servicios (${i})...`);
    await wait(2000);
  }
}

const login = (c, p) => call('POST', '/usuarios-auth/auth/login', { body: { correo_institucional: c, password: p } });
async function cuenta(nombre, correo, password) {
  try {
    await call('POST', '/usuarios-auth/usuarios/registro', { body: { nombre, correo_institucional: correo, password_hash: password } });
  } catch (e) {
    if (!yaExiste(e)) throw e;
  }
  return login(correo, password);
}
const santiagoDay = (n) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + n * 86400000));
const PDF = new Blob([new TextEncoder().encode('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n')], { type: 'application/pdf' });

// Estudiantes y administrador
await cuenta('Ana Estudiante', 'estudiante@alu.uct.cl', 'Estudiante123');
await cuenta('Diego Estudiante', 'estudiante2@alu.uct.cl', 'Estudiante123');
const adm0 = await cuenta('Carla Admin', 'admin@alu.uct.cl', 'Admin1234');
// No hay endpoint para crear administradores: el rol se asigna en la base de datos de usuarios-auth.
sql('usuarios_auth', `INSERT INTO usuario_rol (id_usuario, id_rol) SELECT ${adm0.usuario.id_usuario}, id_rol FROM rol WHERE nombre='ADMINISTRADOR' ON CONFLICT DO NOTHING`);
const admin = await login('admin@alu.uct.cl', 'Admin1234');

// Tutores: postulan con certificado y el administrador aprueba (materias-tutores asigna TUTOR en usuarios-auth).
const materias = await call('GET', '/materias-tutores/materias');
async function tutor(nombre, correo, codigos, horarios) {
  let t = await cuenta(nombre, correo, 'Tutor1234');
  for (const m of materias.filter((x) => codigos.includes(x.codigo))) {
    const form = new FormData();
    form.append('idMateria', m.idMateria);
    form.append('certificado', PDF, 'certificado-notas.pdf');
    try {
      const p = await call('POST', '/materias-tutores/postulaciones', { token: t.access_token, form });
      await call('PATCH', `/materias-tutores/postulaciones/${p.idPostulacion}/aprobar`, { token: admin.access_token, body: { notaAcreditada: 6.2 } });
    } catch (e) {
      if (!yaExiste(e)) throw e;
    }
  }
  t = await login(correo, 'Tutor1234'); // el rol TUTOR entra en el JWT al volver a iniciar sesión
  let publicados = 0;
  for (const [d, ini, fin] of horarios) {
    try {
      await call('POST', '/materias-tutores/disponibilidad/bloques', { token: t.access_token, body: { dia: santiagoDay(d), horaInicio: ini, horaFin: fin } });
      publicados++;
    } catch (e) {
      if (!yaExiste(e)) throw e;
    }
  }
  return publicados;
}
const b1 = await tutor('Bruno Tutor', 'tutor@alu.uct.cl', ['INFO1126', 'INFO1157'], [[1, '10:00', '11:00'], [1, '15:00', '16:00'], [2, '09:00', '10:00'], [3, '17:00', '18:30']]);
const b2 = await tutor('Camila Rojas', 'tutor2@alu.uct.cl', ['INFO1126', 'MAT1188'], [[1, '09:00', '10:00'], [2, '11:30', '13:00'], [4, '16:00', '17:00']]);

console.log(`Cuentas listas (horarios nuevos: Bruno ${b1}, Camila ${b2}):
  estudiante@alu.uct.cl / Estudiante123
  estudiante2@alu.uct.cl / Estudiante123
  tutor@alu.uct.cl / Tutor1234   (Programación III, Sistemas Inteligentes)
  tutor2@alu.uct.cl / Tutor1234  (Programación III, Cálculo Intermedio)
  admin@alu.uct.cl / Admin1234`);
