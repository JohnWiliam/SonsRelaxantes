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

const soundList = document.querySelector('#soundList');
const template = document.querySelector('#soundItemTemplate');
const dockTogglePlayback = document.querySelector('#dockTogglePlayback');
const dockPlaybackIcon = document.querySelector('#dockPlaybackIcon');
const dockVolumeToggle = document.querySelector('#dockVolumeToggle');
const dockVolumePanel = document.querySelector('#dockVolumePanel');
const masterVolume = document.querySelector('#masterVolume');
const masterVolumeValue = document.querySelector('#masterVolumeValue');

const environment = {
  isTouch: window.matchMedia('(hover: none), (pointer: coarse)').matches,
};

let globalVolumeFactor = Number(masterVolume.value) / 100;

const players = SOUND_LIBRARY.map(([key, label], index) => {
  const audio = new Audio(`${SOUND_BASE_PATH}/${key}.ogg`);
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = globalVolumeFactor;

  const item = template.content.firstElementChild.cloneNode(true);
  const title = item.querySelector('.sound-card__title');
  const hitArea = item.querySelector('.sound-card__hit-area');
  const icon = item.querySelector('.sound-card__icon');
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
    icon.textContent = isPlaying ? '⏸' : '▶';
    item.classList.toggle('is-playing', isPlaying);
  };

  hitArea.addEventListener('click', async () => {
    await togglePlayer(audio, setPlayingState, label);
    refreshDockPlayback();
  });

  audio.addEventListener('error', () => {
    icon.textContent = '⚠';
    hitArea.disabled = true;
    hitArea.title = 'Arquivo ausente';
  });

  applyVolume();
  soundList.appendChild(item);

  return { audio, slider, setPlayingState };
});

async function togglePlayer(audio, setPlayingState, label) {
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
  }
}

function refreshDockPlayback() {
  const isAnythingPlaying = players.some(({ audio }) => !audio.paused);
  dockPlaybackIcon.textContent = isAnythingPlaying ? '⏸' : '▶';
  dockTogglePlayback.setAttribute('aria-label', isAnythingPlaying ? 'Pausar tudo' : 'Tocar tudo');
}

dockTogglePlayback.addEventListener('click', async () => {
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

  refreshDockPlayback();
});

masterVolume.addEventListener('input', (event) => {
  globalVolumeFactor = Number(event.target.value) / 100;
  masterVolumeValue.textContent = `${event.target.value}%`;
  masterVolume.style.setProperty('--volume-percent', `${event.target.value}%`);
  players.forEach(({ slider }) => slider.dispatchEvent(new Event('input')));
});

dockVolumeToggle.addEventListener('click', () => {
  const isOpen = !dockVolumePanel.hidden;
  dockVolumePanel.hidden = isOpen;
  dockVolumeToggle.setAttribute('aria-expanded', String(!isOpen));
});

if (environment.isTouch) {
  document.addEventListener('click', (event) => {
    const clickedInside = dockVolumePanel.contains(event.target) || dockVolumeToggle.contains(event.target);
    if (!clickedInside) {
      dockVolumePanel.hidden = true;
      dockVolumeToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

masterVolume.style.setProperty('--volume-percent', `${masterVolume.value}%`);
masterVolumeValue.textContent = `${masterVolume.value}%`;
refreshDockPlayback();
