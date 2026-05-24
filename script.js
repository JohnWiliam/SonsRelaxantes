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

let globalVolumeFactor = Number(masterVolume.value) / 100;

const players = SOUND_LIBRARY.map(([key, label], index) => {
  const audio = new Audio(`${SOUND_BASE_PATH}/${key}.ogg`);
  audio.loop = true;
  audio.preload = isMobile ? 'metadata' : 'auto';
  audio.volume = globalVolumeFactor;
  audio.playsInline = true;

  const item = template.content.firstElementChild.cloneNode(true);
  const title = item.querySelector('.sound-card__title');
  const btn = item.querySelector('.sound-card__toggle');
  const slider = item.querySelector('.sound-card__volume');
  const sliderValue = item.querySelector('.sound-card__volume-value');

  title.textContent = label;
  item.style.animationDelay = `${Math.min(index * 45, 400)}ms`;

  const applyVolume = () => {
    const individual = Number(slider.value) / 100;
    audio.volume = Math.min(individual * globalVolumeFactor, 1);
    sliderValue.textContent = `${slider.value}%`;
    slider.style.setProperty('--volume-percent', `${slider.value}%`);
  };

  slider.addEventListener('input', applyVolume);

  const setPlayingState = (isPlaying) => {
    btn.textContent = isPlaying ? 'Pausar' : 'Tocar';
    btn.classList.toggle('is-playing', isPlaying);
    item.classList.toggle('is-playing', isPlaying);
  };

  btn.addEventListener('click', async () => {
    try {
      if (audio.paused) {
        await audio.play();
        setPlayingState(true);
      } else {
        audio.pause();
        setPlayingState(false);
      }
    } catch (error) {
      console.error(`Falha ao tocar ${label}:`, error);
      btn.textContent = 'Erro ao tocar';
    }

    refreshDockPlayButton();
  });

  audio.addEventListener('error', () => {
    btn.textContent = 'Arquivo ausente';
    btn.disabled = true;
  });

  applyVolume();
  soundList.appendChild(item);

  return { audio, slider, setPlayingState };
});

function renderDockIcon(isPlaying) {
  const icon = dockToggleAll.querySelector('span');
  if (icon) icon.className = isPlaying ? 'icon-pause' : 'icon-play';
  dockToggleAll.setAttribute('aria-pressed', String(isPlaying));
}

function refreshDockPlayButton() {
  const isAnythingPlaying = players.some(({ audio }) => !audio.paused);
  renderDockIcon(isAnythingPlaying);
}

dockToggleAll.addEventListener('click', async () => {
  const isAnythingPlaying = players.some(({ audio }) => !audio.paused);

  if (isAnythingPlaying) {
    players.forEach(({ audio, setPlayingState }) => {
      audio.pause();
      setPlayingState(false);
    });
  } else {
    for (const player of players) {
      try {
        await player.audio.play();
        player.setPlayingState(true);
      } catch (error) {
        console.error('Falha na reprodução em lote:', error);
      }
    }
  }

  refreshDockPlayButton();
});

dockVolumeToggle.addEventListener('click', () => {
  const isOpen = !dockVolumePanel.hasAttribute('hidden');

  if (isOpen) {
    dockVolumePanel.setAttribute('hidden', '');
  } else {
    dockVolumePanel.removeAttribute('hidden');
  }

  dockVolumeToggle.setAttribute('aria-expanded', String(!isOpen));
});

document.addEventListener('click', (event) => {
  const insideDock = event.target.closest('.dock__volume-area');
  if (!insideDock && !dockVolumePanel.hasAttribute('hidden')) {
    dockVolumePanel.setAttribute('hidden', '');
    dockVolumeToggle.setAttribute('aria-expanded', 'false');
  }
});

masterVolume.addEventListener('input', (event) => {
  globalVolumeFactor = Number(event.target.value) / 100;
  masterVolumeValue.textContent = `${event.target.value}%`;
  masterVolume.style.setProperty('--volume-percent', `${event.target.value}%`);
  players.forEach(({ slider }) => slider.dispatchEvent(new Event('input')));
});

masterVolume.style.setProperty('--volume-percent', `${masterVolume.value}%`);
masterVolumeValue.textContent = `${masterVolume.value}%`;
refreshDockPlayButton();
