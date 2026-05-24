const SOUND_LIBRARY = [
  ['birds', 'Pássaros'],
  ['boat', 'Barco'],
  ['city', 'Cidade'],
  ['coffee-shop', 'Cafeteria'],
  ['fireplace', 'Lareira'],
  ['pink-noise', 'Ruído Rosa'],
  ['rain', 'Chuva'],
  ['storm', 'Tempestade'],
  ['summer-night', 'Noite de Verão'],
  ['train', 'Trem'],
  ['waves', 'Ondas'],
  ['white-noise', 'Ruído Branco'],
  ['wind', 'Vento'],
];

const SOUND_BASE_PATH = './assets/sounds';
const isMobile = window.matchMedia('(max-width: 760px)').matches;

const soundList = document.querySelector('#soundList');
const template = document.querySelector('#soundItemTemplate');
const dockToggleAll = document.querySelector('#dockToggleAll');
const dockVolumeToggle = document.querySelector('#dockVolumeToggle');
const dockVolumePanel = document.querySelector('#dockVolumePanel');
const masterVolume = document.querySelector('#masterVolume');
const masterVolumeValue = document.querySelector('#masterVolumeValue');

const state = {
  masterVolume: Number(masterVolume.value) / 100,
  players: [],
  // Guarda quais sons o usuário escolheu para a sessão atual
  selectedKeys: new Set(),
  // Guarda o último conjunto tocando para retomar no play global
  lastPlayingKeys: new Set(),
};

function clampVolume(value) {
  return Math.min(Math.max(value, 0), 1);
}

function setRangeVisual(input, percentage) {
  input.style.setProperty('--volume-percent', `${percentage}%`);
}

function isAnyPlaying() {
  return state.players.some((player) => !player.audio.paused && !player.audio.ended);
}

function getPlayingKeys() {
  return state.players
    .filter((player) => !player.audio.paused && !player.audio.ended)
    .map((player) => player.key);
}

function renderDockIcon() {
  const icon = dockToggleAll.querySelector('span');
  if (!icon) return;

  const currentlyPlaying = isAnyPlaying();
  icon.className = currentlyPlaying ? 'icon-pause' : 'icon-play';
  dockToggleAll.setAttribute('aria-pressed', String(currentlyPlaying));
  dockToggleAll.setAttribute(
    'aria-label',
    currentlyPlaying ? 'Pausar sons selecionados' : 'Tocar sons selecionados',
  );
}

function updateCardUi(player, isPlaying) {
  player.btn.textContent = isPlaying ? 'Pausar' : 'Tocar';
  player.btn.classList.toggle('is-playing', isPlaying);
  player.item.classList.toggle('is-playing', isPlaying);
}

function applyPlayerVolume(player) {
  const individual = Number(player.slider.value) / 100;
  player.audio.volume = clampVolume(individual * state.masterVolume);
  player.sliderValue.textContent = `${player.slider.value}%`;
  setRangeVisual(player.slider, Number(player.slider.value));
}

function rememberCurrentPlayingSet() {
  state.lastPlayingKeys = new Set(getPlayingKeys());
}

async function playPlayer(player) {
  await player.audio.play();
  updateCardUi(player, true);
  state.selectedKeys.add(player.key);
}

function pausePlayer(player) {
  player.audio.pause();
  updateCardUi(player, false);
}

async function toggleSinglePlayer(player) {
  if (player.audio.paused || player.audio.ended) {
    try {
      await playPlayer(player);
    } catch (error) {
      console.error(`Falha ao tocar ${player.label}:`, error);
      player.btn.textContent = 'Erro ao tocar';
    }
  } else {
    pausePlayer(player);
  }

  rememberCurrentPlayingSet();
  renderDockIcon();
}

function buildPlayer([key, label], index) {
  const audio = new Audio(`${SOUND_BASE_PATH}/${key}.ogg`);
  audio.loop = true;
  audio.preload = isMobile ? 'metadata' : 'auto';
  audio.volume = state.masterVolume;
  audio.playsInline = true;

  const item = template.content.firstElementChild.cloneNode(true);
  const title = item.querySelector('.sound-card__title');
  const btn = item.querySelector('.sound-card__toggle');
  const slider = item.querySelector('.sound-card__volume');
  const sliderValue = item.querySelector('.sound-card__volume-value');

  title.textContent = label;
  item.style.animationDelay = `${Math.min(index * 45, 400)}ms`;

  const player = { key, label, audio, item, btn, slider, sliderValue };

  slider.addEventListener('input', () => applyPlayerVolume(player));
  btn.addEventListener('click', () => void toggleSinglePlayer(player));

  audio.addEventListener('play', () => {
    state.selectedKeys.add(key);
    updateCardUi(player, true);
    rememberCurrentPlayingSet();
    renderDockIcon();
  });

  audio.addEventListener('pause', () => {
    updateCardUi(player, false);
    rememberCurrentPlayingSet();
    renderDockIcon();
  });

  audio.addEventListener('error', () => {
    btn.textContent = 'Arquivo ausente';
    btn.disabled = true;
    item.classList.add('is-disabled');
    state.selectedKeys.delete(key);
  });

  applyPlayerVolume(player);
  soundList.appendChild(item);
  return player;
}

async function handleDockPlayPause() {
  const currentlyPlaying = isAnyPlaying();

  if (currentlyPlaying) {
    state.players.forEach((player) => {
      if (!player.audio.paused) pausePlayer(player);
    });
    rememberCurrentPlayingSet();
    renderDockIcon();
    return;
  }

  const candidates =
    state.selectedKeys.size > 0
      ? state.players.filter((player) => state.selectedKeys.has(player.key))
      : state.lastPlayingKeys.size > 0
        ? state.players.filter((player) => state.lastPlayingKeys.has(player.key))
        : [];

  if (candidates.length === 0) {
    // fallback seguro: não dispara tudo sem intenção do usuário
    return;
  }

  for (const player of candidates) {
    try {
      await playPlayer(player);
    } catch (error) {
      console.error(`Falha ao tocar ${player.label}:`, error);
    }
  }

  rememberCurrentPlayingSet();
  renderDockIcon();
}

function toggleVolumePanel(forceOpen) {
  const open = typeof forceOpen === 'boolean' ? forceOpen : dockVolumePanel.hasAttribute('hidden');
  if (open) {
    dockVolumePanel.removeAttribute('hidden');
  } else {
    dockVolumePanel.setAttribute('hidden', '');
  }
  dockVolumeToggle.setAttribute('aria-expanded', String(open));
}

function init() {
  state.players = SOUND_LIBRARY.map(buildPlayer);

  dockToggleAll.addEventListener('click', () => void handleDockPlayPause());

  dockVolumeToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleVolumePanel();
  });

  dockVolumePanel.addEventListener('click', (event) => event.stopPropagation());

  document.addEventListener('click', () => toggleVolumePanel(false));

  masterVolume.addEventListener('input', (event) => {
    state.masterVolume = Number(event.target.value) / 100;
    masterVolumeValue.textContent = `${event.target.value}%`;
    setRangeVisual(masterVolume, Number(event.target.value));
    state.players.forEach((player) => applyPlayerVolume(player));
  });

  setRangeVisual(masterVolume, Number(masterVolume.value));
  masterVolumeValue.textContent = `${masterVolume.value}%`;
  renderDockIcon();
}

init();
