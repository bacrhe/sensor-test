#!/usr/bin/env node
/* VESSEL BLADE · локальний сервер для гри БЕЗ ІНТЕРНЕТУ (одна Wi-Fi мережа або точка доступу телефона).
   Запуск:   node vb-lan-server.js [шлях/до/vessel-blade-3d.html] [http-порт=8080] [https-порт=8443]
   Потім на телефонах (у тій самій Wi-Fi) відкрити адресу, яку виведе сервер.
     • Гравцям (потрібні сенсори) — HTTPS-адресу: https://192.168.x.x:8443/  — браузер попередить про сертифікат
       («Додатково» → «Перейти»): він самопідписаний, це нормально для локальної гри.
     • Спостерігачам сенсори не потрібні — підійде і http://192.168.x.x:8080/
   Без залежностей: роздає HTML, тримає спільний стан (як Firebase: шляхи → значення), розсилає зміни через SSE,
   приймає операції POST /vb-lan/op, виконує onDisconnect при розриві з'єднання. Інтернет не потрібен. */
const http=require('http'), https=require('https'), fs=require('fs'), path=require('path'), os=require('os');
const FILE=path.resolve(process.argv[2]||path.join(__dirname,'vessel-blade-3d.html'));
const PORT=+(process.argv[3]||process.env.PORT||8080);
const PORTS=+(process.argv[4]||process.env.PORTS||8443);
const EMB_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC9KdLFMaMFFdSD\nmmzlWA9gRzqeDe/pDGzMVXpUPAGwyKf4/kMRB32OCKtHdW8DnF8aUNFuyaGL9q/x\nJrDJIzHQZnCPXNqAgvkuyCnw97WGQL1QmDHYKhzCXnTkZ5xIsIiEGUO1f61Nq23B\nodpMwAk0lleIdMP7CyMvDL37y6ifveTVEoc4TyFscrYVvKOpR9uBvz6/Y3EOnOCj\nZX+LV1grQNfYgAfr73hdCDswwcBr1HvuLOWIyC2VFAHxrW1ZU3JPD5URvu5zn6vN\nolVD3KnqftrByw9KmSFhgDrtgR96S5XqOIJl449PPMl+u5BndfINAwxS5MpN2/3Z\na1QoTTE7AgMBAAECggEAB25Rq9Jv237IiuTxmy7S587UhCn6/zYwPfSrqgxzaozv\nYE4ot04Khh5cECISWtt1NvTuzUHZeUSXE8uXzUb3KX8ks9ULdlnuzQIq957bgCsh\n5L0d1CaPW6lXQTO6xXY93qaZbNNXrQHrfVxM1ZADrI+tX5xqqH1/A9WlzvLorGG5\nhJoLjhoJ94QSkG6/2Ge1Kkqif5qL/j6Tq6e6DPlk1KLNDmmBC/ocC9/R3/D4O805\nlLIymgTGjBJCPnNCm8jn1fASvCrbnU2kdT0xjY8WzSUjGl6JEO05akAiiLx1dpyb\ngQReTv3Ux3Uaw7HqeUMndh2zX3GUzAvgj6+uBvsyoQKBgQDhkr/xxedNHq11GAQ9\ncnIgJ/BwJdkCjGDoSWYuVFJzg1/yEP//4scxis49z+I4vJd7nl150nEADlwuxE/h\nPYSjideq/JbRVWIS04J+/mdbFpoR66l6xpKPvdfKJOTohQkgEQGlUWo+BlaHrvyT\nXQyewLI2oDtvo5obfRlk6ugLoQKBgQDWrc63Cru/RHgh91/46vWYJnf4Si+JbVh3\nm4lQpeWKUIKcxYFgvDo5AEdwTSaCr4psp+7poKA1JfxBe0YTCjTEpLYukhb7iszP\nbjOlRgptYZjju8RD4FLnAh4x89DyMMP3GptP5MeyTm4EFMl2Vfh9+rY2L9tlimuW\nVbu2yx6vWwKBgDBJZrdNovbaQ01Wh8nTjuSdSBXptCucez4eQDZYrJG3pLk/tF1F\nYViUmxOWRZnZnR/ERcRHLRNS/56vPV48+gC8CCO9EFfdTDI1frDKqrtP+kktxkjW\n6xbED8Zg4XN4zvxDR7Po2rJOTwWaiszM1V/CZiPVZwO95MZPoDj/JA8hAoGASu2b\nCrQKV3W0YFaQ/rYzRgmXMefis5qgmA6HXMiqVx5GmCUvRO4tfBum04F6AX73V3k9\nn/laMXKymsBF8vtK859xnsuKjf0iAvw5tmO92/OGg2XT2MUA6nQIyfKJaR6wJxz4\nPGhjcs6BA5elwVG8S2woEL2fW892QaBmxiQa76UCgYEA3CBkwci/CbIDNpsmbWsU\nsiq7q/hZZg1bX1UfTENdg5tXO6rHgbN0mdnuf7+2ex+4caLjeBkKW3QJVaJqYHiT\nyxMFfjyC08hDpPQNYMqmTiyizO9MHoW9fFUFs1tXd92D1cXAtvOuytukUf30Jf29\nkyGVxPH2dnsc9aTtWqBx7iQ=\n-----END PRIVATE KEY-----\n";
const EMB_CERT="-----BEGIN CERTIFICATE-----\nMIIDMzCCAhugAwIBAgIUJHPm60RFAEHDrfchh2LS6hozGl4wDQYJKoZIhvcNAQEL\nBQAwGzEZMBcGA1UEAwwQdmVzc2VsLWJsYWRlLWxhbjAeFw0yNjEwMDYxMjI4Mjla\nFw0zNjEwMDMxMjI4MjlaMBsxGTAXBgNVBAMMEHZlc3NlbC1ibGFkZS1sYW4wggEi\nMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC9KdLFMaMFFdSDmmzlWA9gRzqe\nDe/pDGzMVXpUPAGwyKf4/kMRB32OCKtHdW8DnF8aUNFuyaGL9q/xJrDJIzHQZnCP\nXNqAgvkuyCnw97WGQL1QmDHYKhzCXnTkZ5xIsIiEGUO1f61Nq23BodpMwAk0lleI\ndMP7CyMvDL37y6ifveTVEoc4TyFscrYVvKOpR9uBvz6/Y3EOnOCjZX+LV1grQNfY\ngAfr73hdCDswwcBr1HvuLOWIyC2VFAHxrW1ZU3JPD5URvu5zn6vNolVD3KnqftrB\nyw9KmSFhgDrtgR96S5XqOIJl449PPMl+u5BndfINAwxS5MpN2/3Za1QoTTE7AgMB\nAAGjbzBtMB0GA1UdDgQWBBTYEGZDWcWG9yvWf7aTYK+BqkwpGzAfBgNVHSMEGDAW\ngBTYEGZDWcWG9yvWf7aTYK+BqkwpGzAPBgNVHRMBAf8EBTADAQH/MBoGA1UdEQQT\nMBGCCWxvY2FsaG9zdIcEfwAAATANBgkqhkiG9w0BAQsFAAOCAQEAcUNiMGImb1qi\ndmroFDNH0DrKSznzryrZ1lNbEW8oVkZ6iqX4b3aqKjz6jqnpnR2gR33Qr9lSswa2\nBrkUQZ7HYQvjqVLCLzjVj4QdRfVO7y4PnfS+8maMPLARSDjz3tXSSA6IDgz7hscz\nJuHFLpAOX0ZRa+ws3bjk7dUw6Jn2odSVHfOspUIE9pnXfhy4lURO6zmUZc6aDbTy\nPJtVhhEhkX4kcPsM5NJE2xI1iKFBWx5g8DjHr3ajtesmWWfXPvtlj7BQXv9jr2DA\nhc0fAsyttQK/7Q6R8ZdPeNmEEcn6zn20UjbMPDQ30bprmO/wSEJZnLGslrWwJfmg\nMTR56gzwEg==\n-----END CERTIFICATE-----\n";   // самопідписаний сертифікат лише для локальної гри (браузер попередить — це очікувано)
let store={};
const clients=new Map();   // cid → {res, onDisc:[{path,action,val}]}
let nextCid=1;
const getAt=(p)=>{ if(!p) return store; let o=store; for(const k of p.split('/')){ if(!k) continue; if(o==null||typeof o!=='object') return null; o=o[k]; } return o==null?null:o; };
const setAt=(p,v)=>{ const ks=p.split('/').filter(Boolean); if(!ks.length){ store=(v&&typeof v==='object')?v:{}; return; }
  let o=store; for(let i=0;i<ks.length-1;i++){ if(o[ks[i]]==null||typeof o[ks[i]]!=='object') o[ks[i]]={}; o=o[ks[i]]; }
  const last=ks[ks.length-1]; if(v==null){ delete o[last]; } else o[last]=v; prune(ks); };
function prune(ks){ // порожні гілки — геть, як у Firebase
  for(let n=ks.length-1;n>=1;n--){ let o=store; for(let i=0;i<n-1;i++){ o=o&&o[ks[i]]; } const k=ks[n-1]; if(o&&o[k]&&typeof o[k]==='object'&&!Object.keys(o[k]).length) delete o[k]; } }
function broadcast(p){ const msg='data: '+JSON.stringify({path:p,val:getAt(p)})+'\n\n'; for(const c of clients.values()){ try{ c.res.write(msg); }catch(e){} } }
function applyOp(cid, m){
  const c=clients.get(cid); const p=String(m.path||'').replace(/^\/+|\/+$/g,'');
  switch(m.op){
    case 'set': setAt(p, m.val); broadcast(p); break;
    case 'update': { const cur=getAt(p); const base=(cur&&typeof cur==='object')?cur:{}; const nv=Object.assign({}, base); for(const k in (m.val||{})){ if(m.val[k]==null) delete nv[k]; else nv[k]=m.val[k]; } setAt(p, nv); broadcast(p); break; }
    case 'remove': setAt(p, null); broadcast(p); break;
    case 'ondisc': if(c) c.onDisc.push({path:p, action:m.action||'remove', val:m.val}); break;
    default: break;
  }
}
function lanIps(){ const out=[]; const ifs=os.networkInterfaces(); for(const n in ifs) for(const i of ifs[n]) if(i.family==='IPv4' && !i.internal) out.push(i.address); return out; }
const stamp=()=>new Date().toISOString().slice(11,19);
function handler(req,res){
  const u=new URL(req.url,'http://x');
  res.setHeader('Access-Control-Allow-Origin','*');
  if(req.method==='OPTIONS'){ res.setHeader('Access-Control-Allow-Headers','content-type'); res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS'); res.writeHead(204); res.end(); return; }
  if(u.pathname==='/vb-lan/ping'){ res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}); res.end(JSON.stringify({lan:true, clients:clients.size, http:PORT, https:PORTS, t:Date.now()})); return; }
  if(u.pathname==='/vb-lan/events'){
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive','X-Accel-Buffering':'no'});
    const cid='c'+(nextCid++); clients.set(cid,{res,onDisc:[]});
    res.write('data: '+JSON.stringify({hello:cid, path:'', val:store})+'\n\n');
    const ka=setInterval(()=>{ try{ res.write(': ping\n\n'); }catch(e){} }, 15000);
    req.on('close',()=>{ clearInterval(ka); const c=clients.get(cid); clients.delete(cid);
      if(c){ for(const d of c.onDisc){ if(d.action==='remove') setAt(d.path,null); else setAt(d.path,d.val); broadcast(d.path); } }
      console.log(stamp(),'відключився',cid,'· залишилось',clients.size); });
    console.log(stamp(),'підключився',cid,'· усього',clients.size);
    return;
  }
  if(u.pathname==='/vb-lan/op' && req.method==='POST'){
    let body=''; req.on('data',d=>{ body+=d; if(body.length>4e6) req.destroy(); });
    req.on('end',()=>{ try{ const m=JSON.parse(body||'{}'); const ops=Array.isArray(m.ops)?m.ops:[m]; for(const o of ops) applyOp(m.cid||o.cid, o); res.writeHead(200,{'Content-Type':'application/json'}); res.end('{"ok":1}'); }
      catch(e){ res.writeHead(400); res.end(String(e.message)); } });
    return;
  }
  if(u.pathname==='/vb-lan/state'){ res.writeHead(200,{'Content-Type':'application/json'}); res.end(JSON.stringify(store)); return; }
  // статика: гра + усе поруч із нею (audio/…)
  const dir=path.dirname(FILE);
  let fp = (u.pathname==='/'||u.pathname==='/index.html') ? FILE : path.join(dir, decodeURIComponent(u.pathname));
  if(!fp.startsWith(dir)){ res.writeHead(403); res.end(); return; }
  fs.readFile(fp,(err,data)=>{ if(err){ res.writeHead(404); res.end('not found'); return; }
    const ext=path.extname(fp).toLowerCase(); const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}[ext]||'application/octet-stream';
    res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-cache'}); res.end(data); });
}
if(!fs.existsSync(FILE)){ console.log('Не знайдено файл гри: '+FILE+'\nПоклади vessel-blade-3d.html поруч із цим скриптом або вкажи шлях: node vb-lan-server.js /шлях/vessel-blade-3d.html'); process.exit(1); }
const srv=http.createServer(handler);
srv.on('error',e=>{ console.log('HTTP порт '+PORT+' зайнятий або недоступний: '+e.message); });
srv.listen(PORT,'0.0.0.0',()=>{
  console.log('VESSEL BLADE · локальний сервер · файл: '+FILE);
  const ips=lanIps();
  if(!ips.length) console.log('Мережевих інтерфейсів не знайдено — увімкни Wi-Fi або точку доступу. Поки що: http://localhost:'+PORT+'/');
  for(const ip of ips){ console.log('Гравці (сенсори, HTTPS):  https://'+ip+':'+PORTS+'/   ← «Додатково» → «Перейти» на попередженні про сертифікат'); console.log('Спостерігачі (HTTP):       http://'+ip+':'+PORT+'/'); }
  console.log('Інтернет не потрібен. Усі пристрої — в одній Wi-Fi (або в точці доступу телефона). Зупинити: Ctrl+C');
});
try{ const srvS=https.createServer({key:EMB_KEY, cert:EMB_CERT}, handler);
  srvS.on('error',e=>{ console.log('HTTPS порт '+PORTS+' зайнятий або недоступний: '+e.message); });
  srvS.listen(PORTS,'0.0.0.0'); }catch(e){ console.log('HTTPS не запустився: '+e.message); }
