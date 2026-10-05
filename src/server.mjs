import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { optimize, portfolio, simulate, reconcileLedger } from './engine.mjs';

const root = new URL('../', import.meta.url);
const items = JSON.parse(await readFile(new URL('data/initiatives.json', root)));
const ledger = JSON.parse(await readFile(new URL('data/ledger.json', root)));
const routes = new Map([
  ['/', ['web/index.html','text/html']], ['/web/app.mjs',['web/app.mjs','text/javascript']],
  ['/web/style.css',['web/style.css','text/css']], ['/src/engine.mjs',['src/engine.mjs','text/javascript']],
  ['/data/initiatives.json',['data/initiatives.json','application/json']], ['/data/ledger.json',['data/ledger.json','application/json']]
]);
export function createServer() {
  return http.createServer(async (req,res) => {
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'");
    res.setHeader('Cache-Control','no-store');
    const send = (status,body) => { res.writeHead(status,{'Content-Type':'application/json'}); res.end(JSON.stringify(body)); };
    try {
      const path = new URL(req.url,'http://localhost').pathname;
      if (req.method === 'GET' && path === '/api/health') return send(200,{status:'ok',mode:'synthetic-demo'});
      if (req.method === 'GET' && path === '/api/ledger') return send(200,reconcileLedger(ledger));
      if (req.method === 'POST' && ['/api/optimize','/api/evaluate'].includes(path)) {
        let body = '', length = 0;
        for await (const chunk of req) {
          length += chunk.length;
          if (length > 65536) { send(413,{error:'Request body exceeds 64 KiB'}); return; }
          body += chunk;
        }
        const payload = JSON.parse(body || '{}');
        if (!payload || Array.isArray(payload) || typeof payload !== 'object') throw new RangeError('Expected a JSON object');
        const scenario = payload.scenario ?? {};
        const result = path === '/api/optimize' ? optimize(items,scenario) : portfolio(items,payload.ids ?? [],scenario);
        return send(200,{...result, uncertainty:simulate(items,result.ids,scenario)});
      }
      if (req.method !== 'GET') return send(405,{error:'Method not allowed'});
      if (!routes.has(path)) return send(404,{error:'Not found'});
      const [file,mime] = routes.get(path);
      res.writeHead(200,{'Content-Type':mime}); res.end(await readFile(new URL(file,root)));
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof RangeError || error instanceof TypeError) send(400,{error:error.message});
      else { console.error(error); send(500,{error:'Internal server error'}); }
    }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000), host = process.env.HOST || '127.0.0.1';
  createServer().listen(port,host,()=>console.log(`MarginOps ready: http://${host}:${port}`));
}
