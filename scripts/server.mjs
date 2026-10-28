import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { configScript } from './config.mjs';
const root = path.resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    response.setHeader('Cache-Control','no-store');
    response.setHeader('Referrer-Policy','no-referrer');
    if(pathname === '/config.js') {
      response.setHeader('Content-Type','text/javascript; charset=utf-8');
      response.end(configScript());
      return;
    }
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) throw new Error('Not found');
    response.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.end(await readFile(file));
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(4173, '127.0.0.1', () => console.log('Local: http://127.0.0.1:4173'));
