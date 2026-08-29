const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const root = path.join(__dirname, 'dist');
const port = Number(process.env.PORT || 3000);
const mimeTypes = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };

http.createServer((req, res) => {
  const requestPath = req.url.split('?')[0];
  const requested = path.resolve(root, `.${requestPath === '/' ? '/index.html' : requestPath}`);
  const file = requested.startsWith(root) && fs.existsSync(requested) && fs.statSync(requested).isFile() ? requested : path.join(root, 'index.html');
  fs.readFile(file, (error, content) => {
    if (error) return res.writeHead(500).end('Frontend build is unavailable.');
    res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(file)] || 'application/octet-stream' });
    res.end(content);
  });
}).listen(port, '0.0.0.0', () => console.log(`TeslaMarketplace frontend listening on port ${port}`));
