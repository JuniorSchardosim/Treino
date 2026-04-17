/* =============================================
   MEU TREINO — app.js
   ============================================= */

'use strict';

// ─── CONSTANTS ───────────────────────────────
const STORAGE_KEY = 'meutreino_v1';
const WEEK_DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const TREINO_MAP = {
  a: { label: 'Treino A', day: 1, name: 'Peito + Tríceps',  emoji: '💪', color: '#c8f135' },
  b: { label: 'Treino B', day: 3, name: 'Costas + Bíceps',  emoji: '🔙', color: '#4af0b0' },
  c: { label: 'Treino C', day: 5, name: 'Pernas + Ombros',  emoji: '🦵', color: '#f0a84a' },
};
const MOTIVATIONAL = [
  'Incrível! Cada treino te aproxima do seu objetivo.',
  'Consistência é o segredo. Você está no caminho certo!',
  'Seu futuro eu vai agradecer. Ótimo trabalho!',
  'Força + descanso = crescimento. Você tá mandando bem!',
  'Mais um concluído! A disciplina é o maior músculo.',
];

// ─── STATE ───────────────────────────────────
let state = {
  completed: {},   // { 'YYYY-WW': { a: bool, b: bool, c: bool } }
  openCards: {},   // { cardId: bool }
};

// ─── UTILS ───────────────────────────────────
function getWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2,'0')}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = { ...state, ...JSON.parse(raw) };
  } catch(e) { /* ignore */ }
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch(e) { /* ignore */ }
}

function getThisWeek() {
  const key = getWeekKey();
  if (!state.completed[key]) state.completed[key] = {};
  return state.completed[key];
}

function randomMotivation() {
  return MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)];
}

// ─── TOAST ───────────────────────────────────
let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

// ─── MODAL ───────────────────────────────────
function showModal({ emoji, title, body }) {
  document.getElementById('modalEmoji').textContent = emoji;
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').textContent = body;
  document.getElementById('modalOverlay').classList.add('show');
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
}

// ─── WEEK STRIP ──────────────────────────────
function buildWeekStrip() {
  const strip = document.getElementById('weekStrip');
  strip.innerHTML = '';
  const week = getThisWeek();
  const today = new Date();

  // Build Mon–Sun of current week
  const dayOfWeek = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const isToday = d.toDateString() === today.toDateString();

    // Map training to day
    let treinoKey = null;
    if (i === 0) treinoKey = 'a';       // Monday
    else if (i === 2) treinoKey = 'b';  // Wednesday
    else if (i === 4) treinoKey = 'c';  // Friday

    const isDone = treinoKey && week[treinoKey];

    const el = document.createElement('div');
    el.className = 'week-day' + (isToday ? ' today' : '') + (isDone ? ' done' : '');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', WEEK_DAYS[d.getDay()]);

    if (!isDone) {
      el.innerHTML = `
        <div class="week-day-inner">
          <span class="wd-name">${WEEK_DAYS[d.getDay()]}</span>
          <span class="wd-treino">${treinoKey ? treinoKey.toUpperCase() : '·'}</span>
        </div>`;
    }

    // Click to jump to that training tab
    if (treinoKey) {
      el.addEventListener('click', () => switchTab(treinoKey));
    }

    strip.appendChild(el);
  }
}

// ─── PROGRESS BAR ────────────────────────────
function updateProgress() {
  const week = getThisWeek();
  const done = ['a','b','c'].filter(k => week[k]).length;
  const pct = (done / 3) * 100;
  document.getElementById('weekProgressBar').style.width = pct + '%';
  document.getElementById('weekLabel').textContent =
    done === 3
      ? '🎉 Semana completa! Parabéns!'
      : `${done} de 3 treinos concluídos esta semana`;
}

// ─── TAB CHECKS ──────────────────────────────
function updateTabChecks() {
  const week = getThisWeek();
  ['a','b','c'].forEach(k => {
    const el = document.getElementById('check' + k.toUpperCase());
    if (el) el.classList.toggle('hidden', !week[k]);
  });
}

// ─── CONCLUDE BUTTONS ────────────────────────
function updateConcludeButtons() {
  const week = getThisWeek();
  ['a','b','c'].forEach(k => {
    const btn = document.getElementById('btnConclude' + k.toUpperCase());
    if (!btn) return;
    const done = week[k];
    btn.classList.toggle('done', done);
    btn.innerHTML = done
      ? `<span class="btn-conclude-icon">✓</span> Treino ${k.toUpperCase()} Concluído`
      : `<span class="btn-conclude-icon">✓</span> Marcar Treino ${k.toUpperCase()} como Concluído`;
  });
}

function handleConclude(treinoKey) {
  const week = getThisWeek();
  const t = TREINO_MAP[treinoKey];

  if (week[treinoKey]) {
    // Already done — toggle off
    week[treinoKey] = false;
    saveState();
    updateAll();
    showToast(`Treino ${treinoKey.toUpperCase()} desmarcado.`);
    return;
  }

  week[treinoKey] = true;
  saveState();
  updateAll();

  const totalDone = ['a','b','c'].filter(k => week[k]).length;

  if (totalDone === 3) {
    showModal({
      emoji: '🏆',
      title: 'Semana Completa!',
      body: 'Você concluiu os 3 treinos desta semana. Descanso merecido! Continue assim na próxima semana.',
    });
  } else {
    showModal({
      emoji: t.emoji,
      title: `${t.label} Concluído!`,
      body: randomMotivation(),
    });
  }
}

// ─── TABS ─────────────────────────────────────
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-section').forEach(s => {
    s.classList.toggle('active', s.id === 'tab-' + tabId);
  });
  // Scroll to top of content
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── EXERCISE CARDS ───────────────────────────
function toggleCard(card) {
  const id = card.dataset.id;
  const isOpen = card.classList.contains('open');
  card.classList.toggle('open', !isOpen);
  state.openCards[id] = !isOpen;
  saveState();
}

function restoreOpenCards() {
  document.querySelectorAll('.ex-card').forEach(card => {
    if (state.openCards[card.dataset.id]) {
      card.classList.add('open');
    }
  });
}

// ─── RESET ────────────────────────────────────
function resetWeek() {
  const key = getWeekKey();
  state.completed[key] = {};
  saveState();
  updateAll();
  showToast('Semana resetada ✓');
}

// ─── UPDATE ALL ───────────────────────────────
function updateAll() {
  buildWeekStrip();
  updateProgress();
  updateTabChecks();
  updateConcludeButtons();
}

// ─── INIT ─────────────────────────────────────
function init() {
  loadState();

  // Splash → App
  const splash = document.getElementById('splash');
  const app = document.getElementById('app');
  setTimeout(() => {
    splash.classList.add('out');
    setTimeout(() => {
      splash.style.display = 'none';
      app.classList.remove('hidden');
      updateAll();
      restoreOpenCards();
    }, 600);
  }, 1400);

  // Tab navigation
  document.getElementById('tabNav').addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn');
    if (btn && btn.dataset.tab) switchTab(btn.dataset.tab);
  });

  // Exercise card toggle (event delegation)
  document.querySelector('.main-content').addEventListener('click', e => {
    const top = e.target.closest('.ex-card-top');
    if (top) {
      const card = top.closest('.ex-card');
      if (card) toggleCard(card);
    }
  });

  // Conclude buttons
  ['a','b','c'].forEach(k => {
    const btn = document.getElementById('btnConclude' + k.toUpperCase());
    if (btn) btn.addEventListener('click', () => handleConclude(k));
  });

  // Reset button
  document.getElementById('btnReset').addEventListener('click', () => {
    if (confirm('Resetar todos os treinos desta semana?')) resetWeek();
  });

  // Modal close
  document.getElementById('modalBtn').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

document.addEventListener('DOMContentLoaded', init);
