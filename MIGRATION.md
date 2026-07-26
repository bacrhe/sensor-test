# МІГРАЦІЯ НА МОДУЛІ — стан і карта (2026-07-16)

## Що вже зроблено (BUILD 2026-07-16c)
```
vessel-blade-3d.html   ← тонка оболонка: розмітка + CSS + importmap + <script src="js/main.js">
js/main.js             ← ядро гри (~5200 рядків) + ЕКСПОРТНА ПОВЕРХНЯ внизу (51 ім'я)
js/config.js           ← BUILD_TAG (версію тепер редагуємо ТУТ)
js/tts.js              ← голос наставника (нуль залежностей від ядра)
js/minimap.js          ← мінімапа: ЕТАЛОН циклічного живого імпорту з ядра
```
URL гри не змінився. Заливати на Pages тепер ТЕКУ (html + js/ поруч).

## Патерн (перевірений на minimap.js)
1. Модуль робить `import { ... } from './main.js'` — ES-експорти let/const ЖИВІ:
   читання завжди бачить актуальне значення.
2. ЗАБОРОНЕНО на верхньому рівні модуля читати імпортоване з main
   (main ще не обчислений: TDZ). Верхній рівень = створити DOM, оголосити
   функції, повісити слухачі/таймери. Всі читання ядра — всередині колбеків.
3. ЗАБОРОНЕНО присвоювати імпортованим іменам (botDiff=, equalizerOn=…) —
   у момент виносу таких блоків додати в main set-функції:
   `export function setBotDiff(v){ botDiff=v; }` тощо.
4. main.js імпортує модуль зверху і лишає свої виклики як були
   (функції-експорти доступні через живі зв'язки).

## Черга виносу (від простого до складного)
1. **js/voice-chat.js** — VC + кнопка меню + інтервал гучності.
   Імпорт з main: NET, player, ADV, clamp, showBanner, logE, sameAdvRoom*, VC.vol-повзунок лишити в main.
   Firebase-функції (ref/set/onValue/remove/onDisconnect) імпортувати НАПРЯМУ з CDN-URL у модулі.
   (*sameAdvRoom треба додати в експортну поверхню.)
2. **js/spells.js** — Морзе: MORSE_AB, SPELL_WORDS, RESERVED_ELEM, MI, ENCH, castSpell, слухачі тапів, HUD.
   Імпорт: player, sensor, dirXZ, obstacles, obstacleAt, addObstacle, phantomAtCell, damageTier,
   worldX, worldZ, TIER_H, snapshotRoom, showBanner, logE, blip, buzz, doFlash, clamp, QST, tutModal.
   Увага: ядро читає ENCH (шкода) через window.ENCH — лишити як є або перевести на імпорт із set-функцією.
3. **js/economy.js** — RES/saveRes/resHUD, CRAFT/кузня, TRADER, QST/QPLATE, RITUALS/SCROLLS/CODEX,
   advRoomExtras, plantTree/plantRock, FLAIL. Найбільше зв'язків із applyAdvRoom/updateRacks —
   у main знадобляться set-функції для playerWpn (через equipWpn — він уже в ядрі, лишити там).
4. **js/voxel.js** — VOXREG, voxelizeObstacle, burnVoxelsAt, burnTip, CHUNKS, SCARS, freeMesh/sharedBox.
   Ядро кличе їх із resolveBurn — імпорт у main зверху.
5. **js/tutorial.js** — TUT + VOID/пролог + tutModal/tutHint + ворота «ЯК ПОЧАТИ» + інтервал.
   Найбільший і найзв'язаніший — виносити ОСТАННІМ, з set-функціями:
   setBotDiff, setEqualizer(v), setPhantomCount(v).

## Правило сесії
Один модуль за раз → node --check → заливка → перевірка BUILD-бейджа на воротах → гра 5 хв → наступний.
