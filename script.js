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
  globalVolumeFactor: Number(masterVolume.value) / 100,
  selectedPlayerKeys: new Set(),
};

function updateRangeFill(slider, value) {
  slider.style.setProperty('--volume-percent', `${value}%`);
}

function updatePlayButtonVisual(button, isPlaying) {
  button.textContent = isPlaying ? 'Pausar' : 'Tocar';
  button.classList.toggle('is-playing', isPlaying);
}

function renderDockIcon(isPlaying) {
  dockToggleAll.innerHTML = `<span class="${isPlaying ? 'icon-pause' : 'icon-play'}" aria-hidden="true"></span>`;
  dockToggleAll.setAttribute('aria-label', isPlaying ? 'Pausar sons selecionados' : 'Tocar sons selecionados');
  dockToggleAll.setAttribute('aria-pressed', String(isPlaying));
}

function applyMasterVolumeToPlayer(player) {
  const individual = Number(player.slider.value) / 100;
  player.audio.volume = Math.min(individual * state.globalVolumeFactor, 1);
}

const players = SOUND_LIBRARY.map(([key, label], index) => {
  const audio = new Audio(`${SOUND_BASE_PATH}/${key}.ogg`);
  audio.loop = true;
  audio.preload = isMobile ? 'metadata' : 'auto';
  audio.volume = state.globalVolumeFactor;
  audio.playsInline = true;

  const item = template.content.firstElementChild.cloneNode(true);
  const title = item.querySelector('.sound-card__title');
  const btn = item.querySelector('.sound-card__toggle');
  const slider = item.querySelector('.sound-card__volume');
  const sliderValue = item.querySelector('.sound-card__volume-value');

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
    isSelected: false,
  };

  function syncCardUi() {
    const isPlaying = !audio.paused;
    updatePlayButtonVisual(btn, isPlaying);
    item.classList.toggle('is-playing', isPlaying);
    item.classList.toggle('is-selected', player.isSelected);
    btn.setAttribute('aria-pressed', String(isPlaying));
  }

  function applyVolume() {
    applyMasterVolumeToPlayer(player);
    sliderValue.textContent = `${slider.value}%`;
    updateRangeFill(slider, slider.value);
  }

  async function play() {
    await audio.play();
    player.isSelected = true;
    state.selectedPlayerKeys.add(key);
    syncCardUi();
  }

  function pause() {
    audio.pause();
    syncCardUi();
  }

  function toggleSelection() {
    player.isSelected = !player.isSelected;
    if (player.isSelected) {
      state.selectedPlayerKeys.add(key);
    } else {
      state.selectedPlayerKeys.delete(key);
    }
    syncCardUi();
  }

  btn.addEventListener('click', async () => {
    try {
      if (audio.paused) {
        await play();
      } else {
        pause();
      }
    } catch (error) {
      console.error(`Falha ao tocar ${label}:`, error);
      btn.textContent = 'Erro ao tocar';
    }

    refreshDockPlayButton();
  });

  item.querySelector('.sound-card__title').addEventListener('click', toggleSelection);
  item.addEventListener('dblclick', toggleSelection);

  slider.addEventListener('input', applyVolume);

  audio.addEventListener('play', syncCardUi);
  audio.addEventListener('pause', syncCardUi);
  audio.addEventListener('ended', syncCardUi);

  audio.addEventListener('error', () => {
    btn.textContent = 'Arquivo ausente';
    btn.disabled = true;
  });

  applyVolume();
  syncCardUi();
  soundList.appendChild(item);

  return { ...player, play, pause, syncCardUi };
});

function getSelectedPlayers() {
  return players.filter((player) => state.selectedPlayerKeys.has(player.key));
}

function refreshDockPlayButton() {
  const selectedPlayers = getSelectedPlayers();
  const isAnythingPlaying = selectedPlayers.some(({ audio }) => !audio.paused);

  dockToggleAll.disabled = selectedPlayers.length === 0;
  renderDockIcon(isAnythingPlaying);
}

async function playSelectedPlayers() {
  const selectedPlayers = getSelectedPlayers();
  for (const player of selectedPlayers) {
    if (player.audio.paused) {
      try {
        await player.play();
      } catch (error) {
        console.error(`Falha ao iniciar ${player.label}:`, error);
      }
    }
  }
}

function pauseSelectedPlayers() {
  getSelectedPlayers().forEach((player) => player.pause());
}

dockToggleAll.addEventListener('click', async () => {
  const selectedPlayers = getSelectedPlayers();
  if (selectedPlayers.length === 0) {
    return;
  }

  const hasAnyPlaying = selectedPlayers.some(({ audio }) => !audio.paused);

  if (hasAnyPlaying) {
    pauseSelectedPlayers();
  } else {
    await playSelectedPlayers();
  }

  refreshDockPlayButton();
});

dockVolumeToggle.addEventListener('click', (event) => {
  event.stopPropagation();
  const isOpen = !dockVolumePanel.hasAttribute('hidden');
  dockVolumePanel.toggleAttribute('hidden', isOpen);
  dockVolumeToggle.setAttribute('aria-expanded', String(!isOpen));
});

document.addEventListener('click', (event) => {
  const insideDock = event.target.closest('.dock__volume-area');
  if (!insideDock) {
    dockVolumePanel.setAttribute('hidden', '');
    dockVolumeToggle.setAttribute('aria-expanded', 'false');
  }
});

masterVolume.addEventListener('input', (event) => {
  const value = Number(event.target.value);
  state.globalVolumeFactor = value / 100;

  masterVolumeValue.textContent = `${value}%`;
  updateRangeFill(masterVolume, value);
  players.forEach((player) => applyMasterVolumeToPlayer(player));
});

updateRangeFill(masterVolume, masterVolume.value);
masterVolumeValue.textContent = `${masterVolume.value}%`;

if (players.length > 0) {
  players[0].isSelected = true;
  state.selectedPlayerKeys.add(players[0].key);
  players[0].syncCardUi();
}

refreshDockPlayButton();
