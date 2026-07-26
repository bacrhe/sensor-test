/* ════ ГОЛОС НАСТАВНИКА (Web Speech API, укр. голос якщо є в системі) ════ */
const TTS={ on:(()=>{ try{ return (localStorage.getItem('vb3d_tts')??'1')==='1'; }catch(e){ return true; } })(), v:null };
function ttsPick(){ try{ const vs=speechSynthesis.getVoices();
  TTS.v = vs.find(v=>/^uk/i.test(v.lang)) || vs.find(v=>/ukrain/i.test(v.name)) || null; }catch(e){} }
if('speechSynthesis' in window){ ttsPick(); try{ speechSynthesis.onvoiceschanged=ttsPick; }catch(e){} }
function speakTut(html){
  if(!TTS.on || !('speechSynthesis' in window)) return;
  try{
    speechSynthesis.cancel();
    const txt=String(html)
      .replace(/<br\s*\/?>/gi,'. ').replace(/<[^>]+>/g,' ')
      .replace(/[📚📷⚡🔺✨⚔🔥🏁🎓👣🌀🛒⛏🪓🜍🜏🎯📜◆◇▦⬜⬛🪵🪨⛓·▷×→]/g,' ')
      .replace(/\s+/g,' ').trim();
    if(!txt) return;
    const u=new SpeechSynthesisUtterance(txt);
    if(TTS.v) u.voice=TTS.v;
    u.lang=(TTS.v&&TTS.v.lang)||'uk-UA'; u.rate=1.04; u.pitch=0.95;
    speechSynthesis.speak(u);
  }catch(e){}
}


export { TTS, speakTut, ttsPick };
