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

if (!soundList || !template || !dockToggleAll || !dockVolumeToggle || !dockVolumePanel || !masterVolume || !masterVolumeValue) {
  throw new Error('Falha ao iniciar: elementos essenciais da interface não foram encontrados.');
}

const state = {
  masterVolume: Number(masterVolume.value) / 100,
  players: [],
  lastPlaybackSet: new Set(),
};

function buildPlayer(key, label, index) {
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

  if (!title || !btn || !slider || !sliderValue) {
    throw new Error(`Falha ao criar cartão do som "${label}".`);
  }

  title.textContent = label;
  item.style.animationDelay = `${Math.min(index * 45, 400)}ms`;

  const player = {
    key,
    label,
    audio,
    item,
    btn,
    slider,
    sliderValue,
    userVolume: Number(slider.value) / 100,
    isPlayable: true,
  };

  function updateVolume() {
    player.userVolume = Number(player.slider.value) / 100;
    player.audio.volume = Math.min(player.userVolume * state.masterVolume, 1);
    player.sliderValue.textContent = `${player.slider.value}%`;
    player.slider.style.setProperty('--volume-percent', `${player.slider.value}%`);
  }

  function setPlayingState(isPlaying) {
    player.btn.textContent = isPlaying ? 'Pausar' : 'Tocar';
    player.btn.classList.toggle('is-playing', isPlaying);
    player.item.classList.toggle('is-playing', isPlaying);
    player.btn.setAttribute('aria-pressed', String(isPlaying));
  }

  async function play() {
    if (!player.isPlayable) return false;
    try {
      await player.audio.play();
      setPlayingState(true);
      return true;
    } catch (error) {
      console.error(`Falha ao tocar ${player.label}:`, error);
      player.btn.textContent = 'Erro ao tocar';
      return false;
    }
  }

  function pause() {
    player.audio.pause();
    setPlayingState(false);
  }

  player.updateVolume = updateVolume;
  player.setPlayingState = setPlayingState;
  player.play = play;
  player.pause = pause;

  player.slider.addEventListener('input', updateVolume);

  player.btn.addEventListener('click', async () => {
    if (player.audio.paused) {
      await player.play();
    } else {
      player.pause();
    }
    syncDockState();
  });

  player.audio.addEventListener('error', () => {
    player.btn.textContent = 'Arquivo ausente';
    player.btn.disabled = true;
    player.isPlayable = false;
    setPlayingState(false);
    syncDockState();
  });

  updateVolume();
  soundList.appendChild(item);

  return player;
}

function getPlayingPlayers() {
  return state.players.filter((player) => player.isPlayable && !player.audio.paused);
}

function renderDockIcon(isPlaying) {
  const icon = dockToggleAll.querySelector('span');
  if (icon) icon.className = isPlaying ? 'icon-pause' : 'icon-play';

  dockToggleAll.setAttribute('aria-pressed', String(isPlaying));
  dockToggleAll.setAttribute('aria-label', isPlaying ? 'Pausar sons em reprodução' : 'Retomar sons pausados');
}

function syncDockState() {
  const playing = getPlayingPlayers();

  if (playing.length > 0) {
    state.lastPlaybackSet = new Set(playing.map((player) => player.key));
  }

  renderDockIcon(playing.length > 0);
}

async function toggleDockPlayback() {
  const playing = getPlayingPlayers();

  if (playing.length > 0) {
    playing.forEach((player) => player.pause());
    syncDockState();
    return;
  }

  let targets = state.players.filter((player) => state.lastPlaybackSet.has(player.key));
  if (targets.length === 0) {
    targets = state.players.filter((player) => player.isPlayable);
  }

  for (const player of targets) {
    await player.play();
  }

  syncDockState();
}

function toggleDockVolumePanel(forceOpen) {
  const isOpen = !dockVolumePanel.hasAttribute('hidden');
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !isOpen;

  if (shouldOpen) {
    dockVolumePanel.removeAttribute('hidden');
  } else {
    dockVolumePanel.setAttribute('hidden', '');
  }

  dockVolumeToggle.setAttribute('aria-expanded', String(shouldOpen));
}

state.players = SOUND_LIBRARY.map(([key, label], index) => buildPlayer(key, label, index));

masterVolume.addEventListener('input', (event) => {
  state.masterVolume = Number(event.target.value) / 100;
  masterVolumeValue.textContent = `${event.target.value}%`;
  masterVolume.style.setProperty('--volume-percent', `${event.target.value}%`);
  state.players.forEach((player) => player.updateVolume());
});

dockToggleAll.addEventListener('click', toggleDockPlayback);
dockVolumeToggle.addEventListener('click', () => toggleDockVolumePanel());

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  if (!target.closest('.dock__volume-area')) {
    toggleDockVolumePanel(false);
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    toggleDockVolumePanel(false);
  }
});

masterVolume.style.setProperty('--volume-percent', `${masterVolume.value}%`);
masterVolumeValue.textContent = `${masterVolume.value}%`;
syncDockState();
