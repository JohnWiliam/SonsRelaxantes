const SOUND_LIBRARY = [
  ['birds', 'Pássaros', '🐦'],
  ['boat', 'Barco', '🛶'],
  ['city', 'Cidade', '🏙️'],
  ['coffee-shop', 'Cafeteria', '☕'],
  ['fireplace', 'Lareira', '🔥'],
  ['pink-noise', 'Ruído Rosa', '🎚️'],
  ['rain', 'Chuva', '🌧️'],
  ['storm', 'Tempestade', '⛈️'],
  ['summer-night', 'Noite de Verão', '🌙'],
  ['train', 'Trem', '🚆'],
  ['waves', 'Ondas', '🌊'],
  ['white-noise', 'Ruído Branco', '📻'],
  ['wind', 'Vento', '🍃'],
];

const SOUND_BASE_PATH = './assets/sounds';
const isMobile = window.matchMedia('(max-width: 760px)').matches;

const soundList = document.querySelector('#soundList');
const template = document.querySelector('#soundItemTemplate');
const toggleAll = document.querySelector('#toggleAll');
const toggleVolume = document.querySelector('#toggleVolume');
const volumePanel = document.querySelector('#volumePanel');
const masterVolume = document.querySelector('#masterVolume');
const masterVolumeValue = document.querySelector('#masterVolumeValue');

let globalVolumeFactor = Number(masterVolume.value) / 100;

const players = SOUND_LIBRARY.map(([key, label, emoji], index) => {
  const audio = new Audio(`${SOUND_BASE_PATH}/${key}.ogg`);
  audio.loop = true;
  audio.preload = isMobile ? 'metadata' : 'auto';
  audio.volume = globalVolumeFactor;

  const item = template.content.firstElementChild.cloneNode(true);
  const title = item.querySelector('.sound-card__title');
  const icon = item.querySelector('.sound-card__emoji');
  const btn = item.querySelector('.sound-card__icon-btn');
  const slider = item.querySelector('.sound-card__volume');
  const sliderValue = item.querySelector('.sound-card__volume-value');

  title.textContent = label;
  icon.textContent = emoji;
  item.style.animationDelay = `${Math.min(index * 40, 400)}ms`;

  const applyVolume = () => {
    const individual = Number(slider.value) / 100;
    audio.volume = Math.min(individual * globalVolumeFactor, 1);
    sliderValue.textContent = `${slider.value}%`;
    slider.style.setProperty('--volume-percent', `${slider.value}%`);
  };

  slider.addEventListener('input', applyVolume);

  const setPlayingState = (isPlaying) => {
    btn.classList.toggle('is-playing', isPlaying);
    item.classList.toggle('is-playing', isPlaying);
  };

  btn.addEventListener('click', async () => {
    if (audio.paused) {
      await safePlay(audio, label);
      setPlayingState(!audio.paused);
    } else {
      audio.pause();
      setPlayingState(false);
    }

    refreshMasterButton();
  });

  audio.addEventListener('error', () => {
    btn.disabled = true;
    btn.title = 'Arquivo ausente';
  });

  applyVolume();
  soundList.appendChild(item);

  return { audio, btn, slider, item, setPlayingState };
});

async function safePlay(audio, label) {
  try {
    await audio.play();
  } catch (error) {
    console.error(`Falha ao tocar ${label}:`, error);
  }
}

function refreshMasterButton() {
  const isAnythingPlaying = players.some(({ audio }) => !audio.paused);
  toggleAll.querySelector('.dock-btn__icon').textContent = isAnythingPlaying ? '⏸' : '▶';
}

toggleAll.addEventListener('click', async () => {
  const isAnythingPlaying = players.some(({ audio }) => !audio.paused);

  if (isAnythingPlaying) {
    players.forEach(({ audio, setPlayingState }) => {
      audio.pause();
      setPlayingState(false);
    });
  } else {
    for (const player of players) {
      await safePlay(player.audio, 'lote');
      player.setPlayingState(!player.audio.paused);
    }
  }

  refreshMasterButton();
});

toggleVolume.addEventListener('click', () => {
  const isOpen = !volumePanel.hasAttribute('hidden');
  if (isOpen) {
    volumePanel.setAttribute('hidden', 'hidden');
    return;
  }

  volumePanel.removeAttribute('hidden');
});

masterVolume.addEventListener('input', (event) => {
  globalVolumeFactor = Number(event.target.value) / 100;
  masterVolumeValue.textContent = `${event.target.value}%`;
  masterVolume.style.setProperty('--volume-percent', `${event.target.value}%`);
  players.forEach(({ slider }) => slider.dispatchEvent(new Event('input')));
});

document.addEventListener('click', (event) => {
  if (!volumePanel.contains(event.target) && !toggleVolume.contains(event.target)) {
    volumePanel.setAttribute('hidden', 'hidden');
  }
});

masterVolume.style.setProperty('--volume-percent', `${masterVolume.value}%`);
masterVolumeValue.textContent = `${masterVolume.value}%`;
refreshMasterButton();
