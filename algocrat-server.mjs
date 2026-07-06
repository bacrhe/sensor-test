/* ═══════════════════════════════════════════════════════════════════════
   АЛГО-КРАТ — серверный гейм-мастер для «МАТРИЦА 13×13 / Vessel Blade»
   Слушает blade/{room}/universe_lore_inputs, зовёт Gemini, раскладывает
   фракции/героев/злодеев по сетке 13×13 (Сходження/Спуск × Відлуння/Шум)
   и пишет результат обратно в Firebase: phantoms/algocrat (сущности),
   env (баннер/вспышка/перекраска). Клиент НЕ требует перезагрузки.

   Ритм памяти: «Фундаментальный Снимок» (полная копия комнаты) в
   blade/{room}/archive/fundamentals/{ts}; между ними — до 3 «Лёгких Теней»
   (дельты) в archive/shadows, после чего тени схлопываются в новый снимок.

   ЗАПУСК:
     npm i firebase-admin
     export FIREBASE_SERVICE_ACCOUNT=./serviceAccountKey.json   # ключ из консоли Firebase
     export FIREBASE_DB_URL=https://vessel-mir-13-default-rtdb.firebaseio.com
     export GEMINI_API_KEY=...                                  # ключ Gemini API
     export ROOM=HALL                                           # комната (по умолчанию HALL)
     node algocrat-server.mjs
   Требуется Node 18+ (глобальный fetch).
═══════════════════════════════════════════════════════════════════════ */
import { readFileSync } from 'node:fs';
import admin from 'firebase-admin';

const ROOM   = process.env.ROOM || 'HALL';
const DB_URL = process.env.FIREBASE_DB_URL || 'https://vessel-mir-13-default-rtdb.firebaseio.com';
const G_KEY  = process.env.GEMINI_API_KEY;
const SA     = process.env.FIREBASE_SERVICE_ACCOUNT || './serviceAccountKey.json';
if(!G_KEY){ console.error('GEMINI_API_KEY не задан'); process.exit(1); }

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(readFileSync(SA,'utf8'))),
  databaseURL: DB_URL,
});
const db = admin.database();
const R  = (p)=>db.ref(`blade/${ROOM}/${p}`);

/* ── РИТМ: Фундаментальный Снимок ↔ до 3 Лёгких Теней ────────────────── */
const SHADOW_LIMIT = 3;
async function roomState(){
  const snap = await db.ref(`blade/${ROOM}`).get();
  const v = snap.val() || {};
  delete v.archive;                       // архив не копируем в архив
  return v;
}
async function makeFundamental(reason){
  const state = await roomState();
  const ts = Date.now();
  await R(`archive/fundamentals/${ts}`).set({ ts, reason: reason||'rhythm', state });
  await R('archive/shadows').remove();    // тени схлопнуты в снимок
  console.log(`[ритм] Фундаментальный Снимок @${ts} (${reason})`);
}
async function recordShadow(delta){
  const cur = (await R('archive/shadows').get()).val() || {};
  if(Object.keys(cur).length >= SHADOW_LIMIT){ await makeFundamental('shadow-collapse'); }
  await R('archive/shadows').push({ ts: Date.now(), delta });
  console.log('[ритм] Лёгкая Тень:', JSON.stringify(delta).slice(0,120));
}

/* ── GEMINI: Алго-крат разбирает лор ─────────────────────────────────── */
const KINDS = ['fighter','crawler','flyer','gunner','boss'];
function algocratPrompt(lore){
  return `Ты — АЛГО-КРАТ, гейм-мастер игры на сетке 13×13 («Слепок Сознания»).
Оси мира: ось Y (ry) — Сходження(0, Свет/рост) … Спуск(12, Эрозия/распад);
ось X (rx) — Відлуння(0, Порядок/эхо) … Шум(12, Хаос). Центр (6,6) — Чистое Сознание.
Прочитай лор вымышленной вселенной ниже. Извлеки до 6 сущностей: фракции, героев, злодеев.
Каждой назначь координаты gx,gy (0..12) по её мировоззрению на этих осях
(светлый порядок → малые gx,gy; тёмный хаос → большие; и т.д.), тип kind из
${JSON.stringify(KINDS)} (boss — для главного злодея/лидера, crawler — рой/мелочь,
flyer — лётные/духи, gunner — стрелки/маги дальнего боя, fighter — прочие),
hp (40..240, боссам больше), size (1 обычный, 2-3 гигантам).
Также предложи env: короткий banner (до 60 знаков, на языке лора) и flash — hex-цвет вспышки.
ОТВЕТЬ СТРОГО JSON без пояснений и без markdown:
{"entities":[{"name":"...","role":"hero|villain|faction","kind":"...","gx":0,"gy":0,"hp":100,"size":1}],
 "env":{"banner":"...","flash":"#a78bfa"}}
ЛОР:
${lore}`;
}
async function askGemini(lore){
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${G_KEY}`;
  const body = { contents:[{ parts:[{ text: algocratPrompt(lore) }]}],
                 generationConfig:{ temperature:0.7, maxOutputTokens:1024 } };
  const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  if(!res.ok) throw new Error('Gemini HTTP '+res.status+' '+(await res.text()).slice(0,200));
  const data = await res.json();
  const txt = data?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('') || '';
  const clean = txt.replace(/```json|```/g,'').trim();
  const m = clean.match(/\{[\s\S]*\}/);            // страховка: вырезать первый JSON-объект
  return JSON.parse(m ? m[0] : clean);
}

/* ── Перевод ответа Алго-крата в игровые данные ──────────────────────── */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
async function applyVerdict(v, srcBy){
  const ents = Array.isArray(v.entities) ? v.entities.slice(0,6) : [];
  const obj = {};
  ents.forEach((e,i)=>{
    const kind = KINDS.includes(e.kind) ? e.kind : 'fighter';
    obj[i] = {
      x: clamp(Math.round(e.gx??6),0,12), y: clamp(Math.round(e.gy??6),0,12),
      yaw: 0, hp: clamp(Math.round(e.hp??100),10,400),
      len: 1, strike: 0, roll: 0, dead: 0,
      k: kind, sz: clamp(Math.round(e.size??1),1,3),
      hov: kind==='flyer' ? 1 : 0,
      nm: String(e.name||'').slice(0,24),
    };
  });
  // сущности Алго-крата живут под отдельным «владельцем» — клиенты рендерят их
  // тем же путём, что чужих фантомов: НИКАКИХ правок боевого кода не нужно.
  await R('phantoms/algocrat').set(Object.keys(obj).length ? obj : null);
  const env = v.env || {};
  await R('env').set({ t: Date.now(),
    banner: String(env.banner||'АЛГО-КРАТ ПЕРЕПИСАЛ КОМНАТУ').slice(0,60),
    color: '#a78bfa',
    flash: /^#[0-9a-f]{6}$/i.test(env.flash||'') ? env.flash : '#a78bfa',
    repaint: 1 });
  await recordShadow({ kind:'lore-verdict', by: srcBy||null,
    entities: ents.map(e=>({n:e.name,k:e.kind,gx:e.gx,gy:e.gy})) });
  console.log('[алго-крат] сущностей:', ents.length, ents.map(e=>e.name).join(', '));
}

/* ── Слушатель лора ──────────────────────────────────────────────────── */
async function main(){
  await makeFundamental('server-start');
  const seenBefore = Date.now();               // старые записи не переигрываем
  R('universe_lore_inputs').on('child_added', async snap=>{
    const v = snap.val();
    if(!v || !v.text || (v.t||0) < seenBefore) return;
    console.log('[лор] от', v.by, ':', String(v.text).slice(0,80).replace(/\n/g,' '), '…');
    try{
      const verdict = await askGemini(String(v.text).slice(0,6000));
      await applyVerdict(verdict, v.by);
    }catch(err){
      console.error('[алго-крат] ошибка:', err.message);
      await R('env').set({ t:Date.now(), banner:'АЛГО-КРАТ НЕ РАСЛЫШАЛ ЛОР', color:'#ef4444', flash:'#ef4444' });
    }finally{
      snap.ref.remove().catch(()=>{});         // вход обработан — очищаем очередь
    }
  });
  // периодический фундаментальный снимок раз в 10 минут (ритм дыхания мира)
  setInterval(()=>makeFundamental('interval').catch(console.error), 10*60*1000);
  console.log(`Алго-крат слушает blade/${ROOM}/universe_lore_inputs …`);
}
main().catch(e=>{ console.error(e); process.exit(1); });
