import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
const root = resolve('dist');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css','.mjs':'text/javascript','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'};
createServer(async (req,res) => {
  try {
    const url = new URL(req.url,'http://localhost');
    const file = resolve(root, '.' + decodeURIComponent(url.pathname) + (url.pathname.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    const body = await readFile(file);
    res.writeHead(200, {'Content-Type':types[extname(file)] || 'application/octet-stream'}); res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(4173,'127.0.0.1',() => console.log('http://localhost:4173'));
