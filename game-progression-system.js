/**
 * PROGRESSION SYSTEM for VESSEL BLADE 3D
 * Tutorial → Adventure Mode with alternating room types
 */

// ════════════════════ GAME PROGRESSION STATE ════════════════════
const GameProgress = {
  // Tutorial stages: 0=idle, 1=camera, 2=movement, 3=blocking, 4=obstacles, 5+=battles
  tutorialStage: 0,
  tutorialComplete: false,
  
  // Battle progression within tutorial
  battleStage: 0,  // 0=1v1, 1=1v2, 2=1v8, 3=1v3, 4=1v4
  battleStageCounts: [1, 2, 8, 3, 4],  // phantoms per stage
  battlePhantomKilled: 0,
  
  // Difficulty selection
  selectedDifficulty: 1,  // 0=Easy, 1=Normal, 2=Hard
  
  // Adventure mode
  adventureMode: false,
  currentRoom: { x: 6, y: 6 },  // start at center
  roomType: 'white',  // 'white' (safe) or 'black' (danger)
  roomEnemiesCleared: false,
  roomBossEncountered: false,
  
  // Statistics
  tutorialStartTime: null,
  adventureStartTime: null,
  totalRoomsCleared: 0,
  difficultySelected: false,
};

// ════════════════════ TUTORIAL UI & FLOW ════════════════════
function initTutorial() {
  GameProgress.tutorialStage = 1;
  GameProgress.battleStageCounts = [1, 2, 8, 3, 4];
  GameProgress.tutorialStartTime = Date.now();
  showTutorialStage(1);
}

function showTutorialStage(stage) {
  const stages = {
    1: {
      title: "📹 КАЛІБРУВАННЯ КАМЕРИ",
      desc: "Налаштуйте камеру для зручного спостереження за своїми рухами.\n\nОберніть телефон вертикально (книжна орієнтація) та знайдіть найзручнішу позицію. Натисніть ПРОДОВЖИТИ, коли готові.",
      action: "Натисніть для налаштування гіроскопа..."
    },
    2: {
      title: "👣 МЕХАНІКА РУХУ",
      desc: "Свайпи по екрану — це шаги на сітці 13×13.\n\n▲ Вверх = вперед | ▼ Вниз = назад | ◀ Влево = вліво | ▶ Вправо = вправо\n\nПрактикуйте рух. Досягніть усіх чотирьох кутків.",
      action: "Осваиваем свайпы (0/4 углов)"
    },
    3: {
      title: "⚔️ БЛОКУВАННЯ ТИСКОМ",
      desc: "Поверніть телефон ДО альбомної орієнтації (|γ|>45°) = Режим маяка 🔺\n\nПри альбомній орієнтації ви накопичуєте ТИСК (заряд) замість атаки. Заряд захищає від ударів.",
      action: "Включите альбомный режим для испытания..."
    },
    4: {
      title: "🧱 ЗНИЩЕННЯ ОБ'ЄКТІВ",
      desc: "Поверніться у режим атаки (книжна) та розбийте 2 прочні кристали ⬜.\n\nАтакуйте їх кілька разів. Кристали неживі і не атакують.",
      action: "Розбейте неживі об'єкти (0/2)"
    },
    5: {
      title: "⚡ БОРОТЬБА 1 НА 1",
      desc: "Один супротивник нападе на вас. Відбивайте атаки, атакуйте та отримуйте досвід.\n\nПобудьте його!",
      action: "Перемога: убейте 1 фантома"
    },
    6: {
      title: "⚡ БОРОТЬБА 1 НА 2",
      desc: "Два супротивники! Управління таке ж, але складнішає.",
      action: "Перемога: убейте 2 фантомов"
    },
    7: {
      title: "⚡ ВИЧЕРПНІ ТАЛАНТИ - 1 НА 8",
      desc: "Восьмеро йдуть на вас одночасно! Це буде важко. Вживайте всі навички.",
      action: "Перемога: убейте 8 фантомов"
    },
    8: {
      title: "⚡ БОРОТЬБА 1 НА 3",
      desc: "Три супротивники після великої атаки. Менше, ніж 8, але все ще складно.",
      action: "Перемога: убейте 3 фантомов"
    },
    9: {
      title: "⚡ ФІНАЛЬНИЙ ТЕСТ - 1 НА 4",
      desc: "Чотири супротивники. Якщо пережили 8 — це мають бути просто!",
      action: "Перемога: убейте 4 фантомов"
    },
    10: {
      title: "🎚️ ВИБІР СКЛАДНОСТІ",
      desc: "Вибір складності aventure.\n\n🟢 ЛЕГКО: мало ворогів, вони слабші\n🟡 НОРМАЛЬНО: збалансовано\n🔴 ВАЖКО: багато ворогів, сильні боси",
      action: "Вибірайте складність..."
    }
  };
  
  const stage = stages[stage];
  if (!stage) return;
  
  displayTutorialModal(stage.title, stage.desc, stage.action, stage);
}

function displayTutorialModal(title, desc, action, stageData) {
  // Create modal overlay
  const modal = document.createElement('div');
  modal.id = 'tutorialModal';
  modal.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(1,6,15,0.92);
    z-index: 25;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    padding: 24px;
    text-align: center;
  `;
  
  const content = document.createElement('div');
  content.innerHTML = `
    <div style="max-width: 400px;">
      <h2 style="color: #60a5fa; font-size: 18px; margin-bottom: 14px; letter-spacing: 0.12em;">
        ${title}
      </h2>
      <p style="color: #8ab0d8; font-size: 12px; line-height: 2; margin-bottom: 20px; white-space: pre-line;">
        ${desc}
      </p>
      <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
        <button id="tutBtn-continue" style="
          flex: 1;
          min-width: 150px;
          padding: 12px;
          background: #0c2a1f;
          color: #22c55e;
          border: 1px solid #16a34a;
          border-radius: 6px;
          font: inherit;
          cursor: pointer;
          letter-spacing: 0.1em;
        ">▶ ПРОДОВЖИТИ</button>
        <button id="tutBtn-skip" style="
          flex: 1;
          min-width: 150px;
          padding: 12px;
          background: #1a1a2e;
          color: #60a5fa;
          border: 1px solid #1e3a5f;
          border-radius: 6px;
          font: inherit;
          cursor: pointer;
          letter-spacing: 0.1em;
        ">⊘ ПРОПУСТИТЬ</button>
      </div>
      <div id="tutorialProgress" style="
        margin-top: 16px;
        color: #1e3a5f;
        font-size: 9px;
        letter-spacing: 0.1em;
      ">Етап ${GameProgress.tutorialStage} з 10</div>
    </div>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  document.getElementById('tutBtn-continue').addEventListener('click', () => {
    modal.remove();
    advanceTutorial();
  });
  
  document.getElementById('tutBtn-skip').addEventListener('click', () => {
    modal.remove();
    skipToAdventure();
  });
}

function advanceTutorial() {
  GameProgress.tutorialStage++;
  
  if (GameProgress.tutorialStage <= 4) {
    // Training stages: just show and continue
    showTutorialStage(GameProgress.tutorialStage);
  } else if (GameProgress.tutorialStage === 5) {
    // Start battle progression
    GameProgress.battleStage = 0;
    startTutorialBattle();
  } else if (GameProgress.tutorialStage === 10) {
    // Difficulty selection
    showDifficultySelection();
  } else if (GameProgress.tutorialStage === 11) {
    // Tutorial complete
    completeTutorial();
  } else if (GameProgress.tutorialStage <= 9) {
    // Next battle stage
    GameProgress.battleStage = GameProgress.tutorialStage - 5;
    startTutorialBattle();
  }
}

function startTutorialBattle() {
  const stageNum = GameProgress.battleStage;
  const phantomCount = GameProgress.battleStageCounts[stageNum];
  
  if (!phantomCount) {
    advanceTutorial();
    return;
  }
  
  // Reset battle state
  GameProgress.battlePhantomKilled = 0;
  
  // Spawn phantoms
  if (typeof spawnPhantoms === 'function') {
    spawnPhantoms(phantomCount);
  }
  
  // Show battle UI
  const stageNum_ = stageNum + 1;
  const stageNames = ['1 НА 1', '1 НА 2', '1 НА 8', '1 НА 3', '1 НА 4'];
  showTutorialStage(5 + stageNum);
  
  // Monitor battle completion
  monitorTutorialBattle();
}

function monitorTutorialBattle() {
  // Check if all phantoms are dead
  if (typeof phantoms !== 'undefined') {
    const aliveCount = phantoms.filter(p => !p.dead).length;
    
    if (aliveCount === 0 && GameProgress.battlePhantomKilled > 0) {
      // Battle won!
      setTimeout(() => {
        advanceTutorial();
      }, 1000);
    } else if (typeof player !== 'undefined' && player.dead) {
      // Player died - show difficulty selection anyway
      setTimeout(() => {
        GameProgress.tutorialStage = 10;
        showDifficultySelection();
      }, 2000);
    }
  }
  
  // Continue monitoring
  if (GameProgress.tutorialStage < 10 && !GameProgress.tutorialComplete) {
    requestAnimationFrame(monitorTutorialBattle);
  }
}

function showDifficultySelection() {
  const modal = document.createElement('div');
  modal.id = 'difficultyModal';
  modal.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(1,6,15,0.96);
    z-index: 26;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    padding: 24px;
  `;
  
  const content = document.createElement('div');
  content.innerHTML = `
    <div style="max-width: 450px; text-align: center;">
      <h2 style="color: #60a5fa; font-size: 18px; margin-bottom: 20px; letter-spacing: 0.12em;">
        🎯 ВИБІР СКЛАДНОСТІ
      </h2>
      <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
        <button class="diff-btn" data-diff="0" style="
          padding: 16px;
          background: #0a2e1f;
          color: #22c55e;
          border: 2px solid #16a34a;
          border-radius: 8px;
          font: inherit;
          cursor: pointer;
          font-size: 13px;
          letter-spacing: 0.1em;
          text-align: left;
        ">
          <div style="font-weight: bold; margin-bottom: 4px;">🟢 ЛЕГКО</div>
          <div style="font-size: 10px; color: #1e7e34; line-height: 1.6;">
            Мало ворогів. Повільні атаки. Перфектно для навчання.
          </div>
        </button>
        
        <button class="diff-btn" data-diff="1" style="
          padding: 16px;
          background: #1a2e3f;
          color: #60a5fa;
          border: 2px solid #3b82f6;
          border-radius: 8px;
          font: inherit;
          cursor: pointer;
          font-size: 13px;
          letter-spacing: 0.1em;
          text-align: left;
        ">
          <div style="font-weight: bold; margin-bottom: 4px;">🟡 НОРМАЛЬНО (РЕКОМЕНДОВАНО)</div>
          <div style="font-size: 10px; color: #60a5fa; line-height: 1.6;">
            Збалансована складність. Цікавий для більшості.
          </div>
        </button>
        
        <button class="diff-btn" data-diff="2" style="
          padding: 16px;
          background: #3f1a1f;
          color: #ef4444;
          border: 2px solid #dc2626;
          border-radius: 8px;
          font: inherit;
          cursor: pointer;
          font-size: 13px;
          letter-spacing: 0.1em;
          text-align: left;
        ">
          <div style="font-weight: bold; margin-bottom: 4px;">🔴 ВАЖКО</div>
          <div style="font-size: 10px; color: #fca5a5; line-height: 1.6;">
            Багато ворогів. Сильні боси. Тільки для ветеранів!
          </div>
        </button>
      </div>
    </div>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      GameProgress.selectedDifficulty = parseInt(btn.dataset.diff);
      GameProgress.difficultySelected = true;
      modal.remove();
      completeTutorial();
    });
  });
}

function completeTutorial() {
  GameProgress.tutorialComplete = true;
  GameProgress.adventureMode = true;
  GameProgress.adventureStartTime = Date.now();
  GameProgress.currentRoom = { x: 6, y: 6 };
  
  // Set game difficulty (affects bot behavior)
  if (typeof botDiff !== 'undefined') {
    botDiff = GameProgress.selectedDifficulty;
  }
  
  // Determine initial room type (start in white/safe room)
  updateRoomType();
  
  // Show adventure intro
  showAdventureIntro();
}

function skipToAdventure() {
  GameProgress.tutorialStage = 10;
  showDifficultySelection();
}

// ════════════════════ ADVENTURE MODE ════════════════════
function getRoomColorAtPosition(x, y) {
  // Checkerboard pattern: white rooms at (x+y)%2===0, black at (x+y)%2===1
  return (x + y) % 2 === 0 ? 'white' : 'black';
}

function updateRoomType() {
  const { x, y } = GameProgress.currentRoom;
  GameProgress.roomType = getRoomColorAtPosition(x, y);
  GameProgress.roomEnemiesCleared = false;
  GameProgress.roomBossEncountered = false;
}

function getEnemyCountForRoom() {
  const { x, y } = GameProgress.currentRoom;
  const diff = GameProgress.selectedDifficulty;
  
  // Calculate distance from center
  const distFromCenter = Math.max(Math.abs(x - 6), Math.abs(y - 6));
  
  if (GameProgress.roomType === 'white') {
    return 0;  // No enemies in white rooms
  }
  
  // Black rooms: enemies scale with distance from center
  const baseCount = [1, 2, 4][diff];
  const scaleFactor = 1 + Math.floor(distFromCenter / 3) * 0.5;
  return Math.ceil(baseCount * scaleFactor);
}

function hasBossInRoom() {
  const { x, y } = GameProgress.currentRoom;
  
  if (GameProgress.roomType === 'white') return false;
  
  // Bosses at the edges (distance >= 5 from center)
  const distFromCenter = Math.max(Math.abs(x - 6), Math.abs(y - 6));
  return distFromCenter >= 5;
}

function enterRoom(x, y) {
  // Clamp to grid
  GameProgress.currentRoom = {
    x: Math.max(0, Math.min(12, x)),
    y: Math.max(0, Math.min(12, y))
  };
  
  updateRoomType();
  
  // Spawn enemies if black room
  if (GameProgress.roomType === 'black') {
    const count = getEnemyCountForRoom();
    if (typeof spawnPhantoms === 'function') {
      spawnPhantoms(count);
    }
  } else {
    // Clear phantoms in white rooms
    if (typeof phantoms !== 'undefined') {
      phantoms.forEach(p => {
        if (typeof scene !== 'undefined') {
          scene.remove(p.mesh);
          scene.remove(p.blade);
        }
      });
      phantoms.length = 0;
    }
  }
}

function showAdventureIntro() {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(1,6,15,0.94);
    z-index: 24;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    padding: 24px;
    text-align: center;
  `;
  
  const content = document.createElement('div');
  content.innerHTML = `
    <div style="max-width: 420px;">
      <h2 style="color: #60a5fa; font-size: 20px; margin-bottom: 16px; letter-spacing: 0.15em;">
        🗺️ РЕЖИМ ПРИГОДИ
      </h2>
      <p style="color: #8ab0d8; font-size: 11px; line-height: 2; margin-bottom: 20px;">
        Ви вступили в лабіринт кімнат 13×13. Чергуються <b style="color: #22c55e;">білі (безпечні)</b> та <b style="color: #ef4444;">чорні (небезпечні)</b> кімнати.
      </p>
      <div style="
        background: rgba(34,197,94,0.1);
        border-left: 3px solid #22c55e;
        padding: 12px;
        margin-bottom: 14px;
        text-align: left;
        border-radius: 4px;
      ">
        <div style="color: #22c55e; font-weight: bold; margin-bottom: 4px;">⬜ БІЛІ КІМНАТИ (Безпечні коридори)</div>
        <div style="color: #6ee7b7; font-size: 10px; line-height: 1.8;">
          Немає ворогів. Можливі магазини, головоломки, пастки, але безпечні. Місця відпочинку.
        </div>
      </div>
      <div style="
        background: rgba(239,68,68,0.1);
        border-left: 3px solid #ef4444;
        padding: 12px;
        margin-bottom: 20px;
        text-align: left;
        border-radius: 4px;
      ">
        <div style="color: #ef4444; font-weight: bold; margin-bottom: 4px;">⬛ ЧОРНІ КІМНАТИ (Небезпечні)</div>
        <div style="color: #fca5a5; font-size: 10px; line-height: 1.8;">
          Ворогів. Чим далі від центру (6,6), тим більше ворогів та сильніших. На краях можуть бути БОСИ.
        </div>
      </div>
      <button id="adventureStart" style="
        width: 100%;
        padding: 14px;
        background: #0c2a3f;
        color: #60a5fa;
        border: 1px solid #3b82f6;
        border-radius: 6px;
        font: inherit;
        cursor: pointer;
        font-size: 13px;
        letter-spacing: 0.1em;
      ">▶ ПОЧНЕМО ПРИГОДУ!</button>
    </div>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  document.getElementById('adventureStart').addEventListener('click', () => {
    modal.remove();
    enterRoom(6, 6);  // Start at center in white room
  });
}

// ════════════════════ ROOM NAVIGATION ════════════════════
function handleRoomTransition(direction) {
  // direction: 'north', 'south', 'east', 'west'
  const { x, y } = GameProgress.currentRoom;
  let newX = x, newY = y;
  
  switch(direction) {
    case 'north': newY--; break;
    case 'south': newY++; break;
    case 'east': newX++; break;
    case 'west': newX--; break;
  }
  
  enterRoom(newX, newY);
}

// ════════════════════ EXPORT FOR INTEGRATION ════════════════════
window.GameProgress = GameProgress;
window.initTutorial = initTutorial;
window.startAdventure = completeTutorial;
window.handleRoomTransition = handleRoomTransition;
