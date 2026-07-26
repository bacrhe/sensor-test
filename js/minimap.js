/* МІНІМАПА — перший модуль із циклічним імпортом ядра.
   Правила безпеки: на верхньому рівні НЕ читати імпортоване з main
   (він ще не обчислений) — лише створювати DOM/оголошувати функції. */
import { ADV, chessWhite, mode } from './main.js';

/* ── МІНІМАПА мета-світу 13×13: де я у глобальному світі ── */
const MM={seen:new Set(['6,6'])};
const mmC=document.createElement('canvas'); mmC.width=93; mmC.height=93;
mmC.style.cssText='position:fixed;top:64px;right:10px;z-index:22;display:none;width:93px;height:93px;'+
  'background:#020a14;border:1px solid #1e3a5f;border-radius:6px;pointer-events:none;opacity:.92';
document.body.appendChild(mmC);
function miniMapDraw(){
  if(!ADV.on || mode==='creator'){ mmC.style.display='none'; return; }
  mmC.style.display='block';
  const g=mmC.getContext('2d'); g.clearRect(0,0,93,93);
  for(let rx=0;rx<13;rx++) for(let ry=0;ry<13;ry++){
    const wht=chessWhite(rx,ry), seen=MM.seen.has(rx+','+ry), ring=Math.min(rx,ry,12-rx,12-ry);
    g.fillStyle = seen ? (wht?'#93a9c9':'#25436b') : (wht?'#2b3a4e':'#0c1725');
    g.fillRect(1+rx*7, 1+ry*7, 6, 6);
    if(!wht && ring<=1){ g.fillStyle=seen?'#b03040':'#3a1620'; g.fillRect(1+rx*7+2, 1+ry*7+2, 2, 2); }  // край: боси
  }
  g.fillStyle='#38bdf8'; g.fillRect(1+6*7+2, 1+6*7+2, 2, 2);          // дім
  g.strokeStyle='#fbbf24'; g.lineWidth=1.5;
  g.strokeRect(0.5+ADV.rx*7, 0.5+ADV.ry*7, 7, 7);                     // я
}


export { MM, miniMapDraw };
