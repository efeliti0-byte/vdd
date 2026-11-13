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

function handleRequest(req, res) {
  try {
    const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname = decodeURIComponent(reqUrl.pathname);

    // Endpoints de comprobación de estado (Health Checks) para DigitalOcean
    if (pathname === '/health' || pathname === '/healthz' || pathname === '/ping') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('OK');
    }

    if (pathname === '/') {
      pathname = '/empresas.html';
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

      // DigitalOcean a menudo utiliza HEAD para el health check
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
