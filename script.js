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
const toggleAll = document.querySelector('#toggleAll');
const stopAll = document.querySelector('#stopAll');
const masterVolume = document.querySelector('#masterVolume');
const masterVolumeValue = document.querySelector('#masterVolumeValue');

let globalVolumeFactor = Number(masterVolume.value) / 100;

const players = SOUND_LIBRARY.map(([key, label], index) => {
  const audio = new Audio(`${SOUND_BASE_PATH}/${key}.ogg`);
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = globalVolumeFactor;

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

    refreshMasterButton();
  });

  audio.addEventListener('error', () => {
    btn.textContent = 'Arquivo ausente';
    btn.disabled = true;
  });

  applyVolume();
  soundList.appendChild(item);

  return { audio, btn, slider, item, setPlayingState };
});

function refreshMasterButton() {
  const isAnythingPlaying = players.some(({ audio }) => !audio.paused);
  toggleAll.textContent = isAnythingPlaying ? 'Pausar tudo' : 'Tocar tudo';
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
      try {
        await player.audio.play();
        player.setPlayingState(true);
      } catch (error) {
        console.error('Falha na reprodução em lote:', error);
      }
    }
  }

  refreshMasterButton();
});

stopAll.addEventListener('click', () => {
  players.forEach(({ audio, setPlayingState }) => {
    audio.pause();
    audio.currentTime = 0;
    setPlayingState(false);
  });

  refreshMasterButton();
});

masterVolume.addEventListener('input', (event) => {
  globalVolumeFactor = Number(event.target.value) / 100;
  masterVolumeValue.textContent = `${event.target.value}%`;
  masterVolume.style.setProperty('--volume-percent', `${event.target.value}%`);
  players.forEach(({ slider }) => slider.dispatchEvent(new Event('input')));
});

masterVolume.style.setProperty('--volume-percent', `${masterVolume.value}%`);
masterVolumeValue.textContent = `${masterVolume.value}%`;
refreshMasterButton();
