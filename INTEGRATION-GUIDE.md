# ІНТЕГРАЦІЯ СИСТЕМИ ПРОГРЕСІЇ В VESSEL BLADE 3D

## Короткий огляд змін

Додайте систему туторіалу та режиму пригоди з чергуванням білих/чорних кімнат.

---

## ШАГ 1: Додати скрипт прогресії в `<head>`

У точці після `</style>` (перед `<script type="importmap">`), додайте:

```html
<script src="game-progression-system.js"></script>
```

---

## ШАГ 2: Замінити вміст `#gate` (лінія 84-114)

Замініть:

```html
<div id="gate">
  <div class="sub">МАТРИЦА 13×13 · BLIND FIGHT</div>
  <h1>СЛЕПОК СОЗНАНИЯ <span>VOXEL BLADE ENGINE</span></h1>
  <div class="divider"></div>
  <div class="card">
    <div class="lbl">ДИАГНОСТИКА</div>
    <div id="diag"></div>
  </div>
  <!-- ... -->
</div>
```

На:

```html
<div id="gate">
  <div class="sub">МАТРИЦА 13×13 · BLIND FIGHT</div>
  <h1>СЛЕПОК СОЗНАНИЯ <span>VOXEL BLADE ENGINE</span></h1>
  <div class="divider"></div>
  
  <!-- РЕЖИМ ВИБОРУ -->
  <div id="startModeSelect" style="margin-bottom: 16px;">
    <div class="card">
      <div class="lbl">РЕЖИМ ГЕРИ</div>
      <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px;">
        <button id="btnTutorial" class="btn" style="
          background: #0c2a1f;
          border-color: #16a34a;
          color: #22c55e;
        ">📚 ТУТОРІАЛ (Навчання)</button>
        <button id="btnDirect" class="btn" style="
          background: #1a2030;
          border-color: #3b82f6;
          color: #60a5fa;
        ">⚔ БІЙКА БЕЗПЕРЕРВНА</button>
      </div>
    </div>
  </div>

  <!-- ДІАГНОСТИКА -->
  <div class="card">
    <div class="lbl">ДИАГНОСТИКА</div>
    <div id="diag"></div>
  </div>
  
  <!-- ... інша початкова інформація як раніше ... -->
</div>
```

---

## ШАГ 3: Оновити логіку запуску (лінія 1840)

Знайдіть:

```javascript
$('btnReq').addEventListener('click', async ()=>{
  // ... весь код кнопки ...
});
```

Замініть на:

```javascript
// Спочатку встановимо обробники вибору режиму
if ($('btnTutorial')) {
  $('btnTutorial').addEventListener('click', () => {
    $('startModeSelect').style.display = 'none';
    $('diag').style.display = 'block';
    // Розгорнути решту шлюза
    startGameMode('tutorial');
  });
}

if ($('btnDirect')) {
  $('btnDirect').addEventListener('click', () => {
    $('startModeSelect').style.display = 'none';
    $('diag').style.display = 'block';
    // Розгорнути решту шлюза
    startGameMode('direct');
  });
}

// Нова функція для запуску
async function startGameMode(gameMode) {
  window.selectedGameMode = gameMode;
  
  $('btnReq').textContent = '⏳ запрос...';
  $('btnReq').disabled = true;
  $('errMsg').style.display = 'none';
  
  try {
    if (needsPerm) {
      if (await DeviceOrientationEvent.requestPermission() !== 'granted') 
        throw new Error('Ориентация: отказано');
      if (typeof DeviceMotionEvent.requestPermission === 'function')
        if (await DeviceMotionEvent.requestPermission() !== 'granted') 
          throw new Error('Движение: отказано');
    }
    
    bindSensors();
    initAudio();
    if (AC && AC.state === 'suspended') await AC.resume();
    
    // Вибір кімнати залежить від режиму
    if (gameMode === 'tutorial') {
      NET.room = 'TUTORIAL_HALL';
    } else {
      const rm = ($('roomInput').value || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
      NET.room = rm || 'HALL';
    }
    
    NET.start();
    buzz([0, 120, 60, 120]);
    logE('СТАРТ. режим=' + gameMode + ', HAPTICS=' + HAPTICS + ' compass=' + sensor.haveCompass);
    logE('BUILD ' + BUILD_TAG);
    
    $('gate').style.display = 'none';
    $('pauseBtn').style.display = 'block';
    started = true;
    last = 0;
    
    // Запустити туторіал або звичайну гру
    if (gameMode === 'tutorial') {
      initTutorial();
      mode = 'fighter';  // Встановити режим бійки
    } else {
      mode = 'fighter';
      phantomCount = 1;
      spawnPhantoms(phantomCount);
    }
    
    applyMode();
  } catch (err) {
    $('errMsg').textContent = '⚠ ' + err.message;
    $('errMsg').style.display = 'block';
    $('btnReq').textContent = '▷ ПОПРОБОВАТЬ СНОВА';
    $('btnReq').disabled = false;
  }
}
```

---

## ШАГ 4: Оновити спавн фантомів (лінія 622-629)

Замініть:

```javascript
function spawnPhantoms(n){
  phantoms.forEach(p=>{ scene.remove(p.mesh); scene.remove(p.blade); });
  phantoms = [];
  for(let i=0;i<n;i++) phantoms.push(makePhantom(i));
  logE('фантомов: '+n);
}
```

На:

```javascript
function spawnPhantoms(n){
  // Очистити всіх фантомів
  phantoms.forEach(p=>{ 
    if(p.mesh) scene.remove(p.mesh); 
    if(p.blade) scene.remove(p.blade); 
  });
  phantoms = [];
  
  // Спавнити нових
  for(let i=0; i<n; i++) phantoms.push(makePhantom(i));
  
  logE('фантомов: '+n);
  
  // Оновити HUD для туторіалу
  if(window.GameProgress && window.GameProgress.tutorialComplete === false) {
    const stageNum = window.GameProgress.tutorialStage;
    // Можливо показати про хід (опціонально)
  }
}
```

---

## ШАГ 5: Додати обробник смерті гравця для туторіалу (лінія 1206-1211)

Знайдіть:

```javascript
if(av!==player){
  player.score=(player.score||0)+1;
  logE('ФАНТОМ убит, счёт '+player.score);
  showBanner('◌ ФАНТОМ РАЗВОПЛОЩЁН  +'+player.score,'#22c55e');
  blip(520,0.25,'sine',0.2);
}else{
  logE('ИГРОК погиб');
  showBanner('▼ СОЗНАНИЕ УГАСЛО','#ef4444'); doFlash('#ef4444');
  blip(80,0.6,'sawtooth',0.25);
  buzz([0,80,60,160]);
}
```

Замініть на:

```javascript
if(av!==player){
  player.score=(player.score||0)+1;
  logE('ФАНТОМ убит, счёт '+player.score);
  showBanner('◌ ФАНТОМ РАЗВОПЛОЩЁН  +'+player.score,'#22c55e');
  blip(520,0.25,'sine',0.2);
  
  // Трекування убивств для туторіалу
  if(window.GameProgress && !window.GameProgress.tutorialComplete) {
    window.GameProgress.battlePhantomKilled++;
  }
}else{
  logE('ИГРОК погиб');
  showBanner('▼ СОЗНАНИЕ УГАСЛО','#ef4444'); doFlash('#ef4444');
  blip(80,0.6,'sawtooth',0.25);
  buzz([0,80,60,160]);
}
```

---

## ШАГ 6: Додати CSS для модальних вікон туторіалу

Додайте в `<style>` (перед закриванням `</style>`):

```css
#tutorialModal {
  font-size: 12px;
  letter-spacing: 0.1em;
}

#tutorialModal h2 {
  color: #60a5fa;
  font-size: 18px;
  margin-bottom: 14px;
  letter-spacing: 0.12em;
}

#tutorialModal button:hover {
  opacity: 0.9;
}

#difficultyModal {
  font-size: 11px;
}

.diff-btn {
  transition: all 0.2s;
}

.diff-btn:hover {
  transform: translateY(-2px);
  opacity: 0.95;
}
```

---

## ШАГ 7: Оновити сценарій (якщо є інші посилання на `mode` в інших місцях)

Переконайтеся, що коли є туторіал, у кожному місці, де ви звертаєтеся до `mode`, враховується туторіальна логіка.

---

## СТРУКТУРА ТУТОРІАЛУ

```
1. Калібрування камери
2. Механіка руху (прогулка по сітці)
3. Блокування тиском (альбомний режим)
4. Знищення об'єктів ( 2 статичні перешкоди)
5. Боротьба 1 на 1 (1 фантом)
6. Боротьба 1 на 2 (2 фантоми)
7. Боротьба 1 на 8 (8 фантомів)
8. Боротьба 1 на 3 (3 фантоми)
9. Боротьба 1 на 4 (4 фантоми)
10. Вибір складності
11. Режим пригоди (з чергуванням кімнат)
```

---

## РЕЖИМ ПРИГОДИ

### Estructura kart:
```
Білі кімнати (безпечні):
  - (0,0), (0,2), (0,4), ... (парні суми координат)
  - Немає ворогів
  - Можуть бути магазини / головоломки
  
Чорні кімнати (небезпечні):
  - (0,1), (0,3), (1,0), ... (непарні суми координат)
  - Вороги масштабуються за відстанню від (6,6)
  - Боси на краях (距離 >= 5)
```

### Кількість ворогів залежить від:
- `GameProgress.selectedDifficulty` (0=easy, 1=normal, 2=hard)
- Відстані від центру (6,6)
- Типу кімнати (білі = 0, чорні = масштабовані)

---

## ФАЙЛИ

1. **game-progression-system.js** — вся логіка туторіалу/пригоди
2. **vessel-blade-3d.html** (оновлено) — ваша гра з інтеграцією

---

## ТЕСТУВАННЯ

1. Завантажте обидва файли на **bacrhe.github.io**
2. Відкрийте гру на телефоні (Android Chrome або iOS Safari)
3. Натисніть **📚 ТУТОРІАЛ**
4. Пройдіть всі етапи
5. Вибірайте складність
6. Досліджуйте кімнати!

---

## ОПЦІОНАЛЬНІ РОЗШИРЕННЯ

- Додати анімованої карти кімнат (сітка 13×13 з кольорами)
- Система збереження (локальний прогрес туторіалу)
- Лідерборд за кількість очищених кімнат
- Спеціальні события у чорних кімнатах (мініботи, квести)
