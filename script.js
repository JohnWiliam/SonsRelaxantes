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
const INITIAL_VOLUME = 70;

const ui = {
  soundList: document.querySelector('#soundList'),
  template: document.querySelector('#soundItemTemplate'),
  dockToggleAll: document.querySelector('#dockToggleAll'),
  dockVolumeToggle: document.querySelector('#dockVolumeToggle'),
  dockVolumePanel: document.querySelector('#dockVolumePanel'),
  masterVolume: document.querySelector('#masterVolume'),
  masterVolumeValue: document.querySelector('#masterVolumeValue'),
};

const state = {
  masterVolumeFactor: Number(ui.masterVolume.value) / 100,
  players: [],
};

function clampVolume(value) {
  return Math.min(Math.max(value, 0), 100);
}

function updateRangeVisual(input, value) {
  input.style.setProperty('--volume-percent', `${value}%`);
}

function updateDockPlayButton() {
  const hasSelected = state.players.some((player) => player.isSelected);
  const isPlayingSelected = hasSelected && state.players.some((player) => player.isSelected && !player.audio.paused);

  const icon = ui.dockToggleAll.querySelector('span');
  if (icon) {
    icon.className = isPlayingSelected ? 'icon-pause' : 'icon-play';
  }

  ui.dockToggleAll.setAttribute('aria-pressed', String(isPlayingSelected));
  ui.dockToggleAll.disabled = !hasSelected;
  ui.dockToggleAll.title = hasSelected
    ? 'Tocar ou pausar sons selecionados'
    : 'Selecione ao menos um som para controlar pela dock';
}

function syncPlayerVolume(player) {
  const individualFactor = player.volume / 100;
  player.audio.volume = Math.min(individualFactor * state.masterVolumeFactor, 1);
  player.sliderValue.textContent = `${player.volume}%`;
  updateRangeVisual(player.slider, player.volume);
}

function setSelected(player, selected) {
  player.isSelected = selected;
  player.card.classList.toggle('is-selected', selected);
  player.toggleButton.classList.toggle('is-selected', selected);
  player.toggleButton.setAttribute('aria-pressed', String(selected));
  player.toggleButton.textContent = selected ? 'Selecionado' : 'Selecionar';

  if (!selected && !player.audio.paused) {
    player.audio.pause();
  }

  updatePlayerPlayingStyle(player);
  updateDockPlayButton();
}

function updatePlayerPlayingStyle(player) {
  const isPlaying = !player.audio.paused;
  player.card.classList.toggle('is-playing', isPlaying);
  player.status.textContent = isPlaying ? 'Tocando' : player.isSelected ? 'Pronto' : 'Parado';
}

async function playSelectedPlayers() {
  for (const player of state.players) {
    if (!player.isSelected || !player.audio.paused) {
      continue;
    }

    try {
      await player.audio.play();
    } catch (error) {
      console.error(`Falha ao tocar ${player.label}:`, error);
    }

    updatePlayerPlayingStyle(player);
  }

  updateDockPlayButton();
}

function pauseSelectedPlayers() {
  state.players.forEach((player) => {
    if (player.isSelected && !player.audio.paused) {
      player.audio.pause();
      updatePlayerPlayingStyle(player);
    }
  });

  updateDockPlayButton();
}

function buildPlayer(key, label, index) {
  const audio = new Audio(`${SOUND_BASE_PATH}/${key}.ogg`);
  audio.loop = true;
  audio.preload = 'metadata';
  audio.playsInline = true;

  const card = ui.template.content.firstElementChild.cloneNode(true);
  const title = card.querySelector('.sound-card__title');
  const toggleButton = card.querySelector('.sound-card__toggle');
  const status = card.querySelector('.sound-card__status');
  const slider = card.querySelector('.sound-card__volume');
  const sliderValue = card.querySelector('.sound-card__volume-value');

  title.textContent = label;
  card.style.animationDelay = `${Math.min(index * 45, 400)}ms`;

  const player = {
    key,
    label,
    audio,
    card,
    toggleButton,
    slider,
    sliderValue,
    status,
    volume: INITIAL_VOLUME,
    isSelected: false,
  };

  slider.value = String(INITIAL_VOLUME);
  slider.addEventListener('input', (event) => {
    player.volume = clampVolume(Number(event.target.value));
    syncPlayerVolume(player);
  });

  toggleButton.addEventListener('click', () => {
    setSelected(player, !player.isSelected);
  });

  audio.addEventListener('play', () => {
    updatePlayerPlayingStyle(player);
    updateDockPlayButton();
  });

  audio.addEventListener('pause', () => {
    updatePlayerPlayingStyle(player);
    updateDockPlayButton();
  });

  audio.addEventListener('error', () => {
    toggleButton.disabled = true;
    toggleButton.textContent = 'Arquivo ausente';
    status.textContent = 'Erro de áudio';
  });

  syncPlayerVolume(player);
  updatePlayerPlayingStyle(player);

  ui.soundList.appendChild(card);
  return player;
}

function closeVolumePanel() {
  ui.dockVolumePanel.setAttribute('hidden', '');
  ui.dockVolumeToggle.setAttribute('aria-expanded', 'false');
}

function toggleVolumePanel() {
  const isOpen = !ui.dockVolumePanel.hasAttribute('hidden');
  if (isOpen) {
    closeVolumePanel();
    return;
  }

  ui.dockVolumePanel.removeAttribute('hidden');
  ui.dockVolumeToggle.setAttribute('aria-expanded', 'true');
}

function setupDockEvents() {
  ui.dockToggleAll.addEventListener('click', async () => {
    const hasSelected = state.players.some((player) => player.isSelected);
    if (!hasSelected) {
      return;
    }

    const isPlayingSelected = state.players.some((player) => player.isSelected && !player.audio.paused);

    if (isPlayingSelected) {
      pauseSelectedPlayers();
    } else {
      await playSelectedPlayers();
    }
  });

  ui.dockVolumeToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleVolumePanel();
  });

  ui.masterVolume.addEventListener('input', (event) => {
    const volume = clampVolume(Number(event.target.value));
    state.masterVolumeFactor = volume / 100;
    ui.masterVolumeValue.textContent = `${volume}%`;
    updateRangeVisual(ui.masterVolume, volume);
    state.players.forEach(syncPlayerVolume);
  });

  document.addEventListener('click', (event) => {
    const insideDockVolume = event.target.closest('.dock__volume-area');
    if (!insideDockVolume) {
      closeVolumePanel();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeVolumePanel();
    }
  });
}

function init() {
  state.players = SOUND_LIBRARY.map(([key, label], index) => buildPlayer(key, label, index));
  setupDockEvents();

  ui.masterVolume.value = String(clampVolume(Number(ui.masterVolume.value)));
  ui.masterVolumeValue.textContent = `${ui.masterVolume.value}%`;
  updateRangeVisual(ui.masterVolume, Number(ui.masterVolume.value));
  updateDockPlayButton();
}

init();
