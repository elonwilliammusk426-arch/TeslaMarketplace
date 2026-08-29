const test = require('node:test');
const assert = require('node:assert/strict');

process.env.AUTH_SECRET = 'test-secret-with-at-least-32-characters-long';
const app = require('../server');
const http = require('node:http');

function request(path) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      http.get({ hostname: '127.0.0.1', port, path }, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => { server.close(); resolve({ status: res.statusCode, body: JSON.parse(body) }); });
      }).on('error', (error) => { server.close(); reject(error); });
    });
  });
}

test('health endpoint responds', async () => {
  const response = await request('/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
});

test('unknown route returns JSON 404', async () => {
  const response = await request('/not-a-route');
  assert.equal(response.status, 404);
  assert.equal(response.body.error, 'Route not found');
});
