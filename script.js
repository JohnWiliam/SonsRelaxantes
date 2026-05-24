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
};

function buildPlayer(key, label, index) {
  const audio = new Audio(`${SOUND_BASE_PATH}/${key}.ogg`);
  audio.loop = true;
  audio.preload = isMobile ? 'metadata' : 'auto';
  audio.volume = state.masterVolume;
  audio.playsInline = true;

  const item = template.content.firstElementChild.cloneNode(true);
  const title = item.querySelector('.sound-card__title');
  const slider = item.querySelector('.sound-card__volume');
  const sliderValue = item.querySelector('.sound-card__volume-value');

  if (!title || !slider || !sliderValue) {
    throw new Error(`Falha ao criar cartão do som "${label}".`);
  }

  title.textContent = label;
  item.style.animationDelay = `${Math.min(index * 45, 400)}ms`;

  const player = {
    key,
    label,
    audio,
    item,
    title,
    slider,
    sliderValue,
    userVolume: Number(slider.value) / 100,
    isPlayable: true,
    isSelected: false, // Nova memória de Estado
  };

  function updateVolume() {
    player.userVolume = Number(player.slider.value) / 100;
    player.audio.volume = Math.min(player.userVolume * state.masterVolume, 1);
    player.sliderValue.textContent = `${player.slider.value}%`;
    player.slider.style.setProperty('--volume-percent', `${player.slider.value}%`);
  }

  async function play() {
    if (!player.isPlayable) return false;
    try {
      await player.audio.play();
      return true;
    } catch (error) {
      console.error(`Falha ao tocar ${player.label}:`, error);
      return false;
    }
  }

  function pause() {
    player.audio.pause();
  }

  // Função central para alterar o estado do Card
  async function toggleSelection() {
    if (!player.isPlayable) return;

    player.isSelected = !player.isSelected;
    player.item.classList.toggle('is-selected', player.isSelected);
    player.item.setAttribute('aria-pressed', String(player.isSelected));

    if (player.isSelected) {
      await player.play();
    } else {
      player.pause();
    }
    syncDockState();
  }

  player.updateVolume = updateVolume;
  player.play = play;
  player.pause = pause;
  player.toggleSelection = toggleSelection;

  player.slider.addEventListener('input', updateVolume);

  // O clique no Card inteiro agora o ativa (desde que não seja no controle de volume)
  player.item.addEventListener('click', (e) => {
    if (e.target.closest('.sound-card__volume-wrap')) return;
    toggleSelection();
  });

  // Acessibilidade: permite apertar Enter ou Espaço com o Card focado
  player.item.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target === player.item) {
      e.preventDefault();
      toggleSelection();
    }
  });

  player.audio.addEventListener('error', () => {
    player.title.textContent = `${player.label} (Erro)`;
    player.isPlayable = false;
    player.isSelected = false;
    player.item.classList.remove('is-selected');
    player.item.style.opacity = '0.5';
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
  const playIcon = dockToggleAll.querySelector('.icon-play');
  const pauseIcon = dockToggleAll.querySelector('.icon-pause');

  if (playIcon && pauseIcon) {
    if (isPlaying) {
      playIcon.setAttribute('hidden', '');
      pauseIcon.removeAttribute('hidden');
    } else {
      playIcon.removeAttribute('hidden');
      pauseIcon.setAttribute('hidden', '');
    }
  }

  dockToggleAll.setAttribute('aria-pressed', String(isPlaying));
  dockToggleAll.setAttribute('aria-label', isPlaying ? 'Pausar sons em reprodução' : 'Retomar sons pausados');
}

function syncDockState() {
  const playing = getPlayingPlayers();
  renderDockIcon(playing.length > 0);
}

async function toggleDockPlayback() {
  const playing = getPlayingPlayers();

  // Se tem áudio rolando, pausamos todos. Repare que NÃO mexemos no player.isSelected!
  if (playing.length > 0) {
    playing.forEach((player) => player.pause());
    syncDockState();
    return;
  }

  // Se nada está tocando, buscamos todos os cards que estão com isSelected marcado
  const targets = state.players.filter((player) => player.isSelected && player.isPlayable);

  // Detalhe amigável: se o usuário clicar no Play global sem ter escolhido nenhum som,
  // nós selecionamos o primeiro som como exemplo.
  if (targets.length === 0 && state.players.length > 0) {
    const first = state.players[0];
    first.isSelected = true;
    first.item.classList.add('is-selected');
    first.item.setAttribute('aria-pressed', 'true');
    targets.push(first);
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
