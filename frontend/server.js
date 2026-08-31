const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const root = path.join(__dirname, 'dist');
const port = Number(process.env.PORT || 3000);
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const requestPath = (req.url || '/').split('?')[0];

  if (requestPath === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ status: 'ok', service: 'TeslaMarketplace frontend' }));
  }

  const requested = path.resolve(root, `.${requestPath === '/' ? '/index.html' : requestPath}`);
  const file = requested.startsWith(root) && fs.existsSync(requested) && fs.statSync(requested).isFile()
    ? requested
    : path.join(root, 'index.html');

  fs.readFile(file, (error, content) => {
    if (error) {
      console.error('Frontend build unavailable:', error.message);
      return res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Frontend build is unavailable.');
    }

    res.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': requestPath === '/' ? 'no-cache' : 'public, max-age=31536000, immutable'
    });
    res.end(content);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`TeslaMarketplace frontend listening on port ${port}`);
});
