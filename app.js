
// ====== GLOBAL STATE (queue + global cover) ======
const STORAGE_KEY = 'ytlink_queue_global_v1';
const COVER_KEY   = 'ytlink_global_cover_v1';

let queue = [];
let currentIndex = -1;
let ytPlayer;
let durationCache = 0;

// Restore queue
(function restoreQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const { queue: q = [], currentIndex: i = -1 } = JSON.parse(raw) || {};
      if (Array.isArray(q)) queue = q;
      if (typeof i === 'number') currentIndex = i;
    }
  } catch {}
})();

function persistQueue() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ queue, currentIndex }));
}

// ====== SELECTORS (match existing UI IDs) ======
const $searchForm = document.getElementById('searchForm');
const $searchInput = document.getElementById('searchInput');
const $queueList = document.getElementById('queueList');
const $coverImg = document.getElementById('albumCoverImg');

const $playPause = document.getElementById('playPauseBtn');
const $next = document.getElementById('nextBtn');
const $prev = document.getElementById('prevBtn');
const $seek = document.getElementById('seek');
const $volume = document.getElementById('volume');
const $cur = document.getElementById('currentTime');
const $dur = document.getElementById('duration');
const $clear = document.getElementById('clearQueue');

// ====== GLOBAL COVER (applies to all tracks) ======
let $hiddenCoverFile = document.createElement('input');
$hiddenCoverFile.type = 'file';
$hiddenCoverFile.accept = 'image/*';
$hiddenCoverFile.style.display = 'none';
document.body.appendChild($hiddenCoverFile);

// Restore global cover
(function restoreCover(){
  try {
    const dataUrl = localStorage.getItem(COVER_KEY);
    if (dataUrl && $coverImg) $coverImg.src = dataUrl;
  } catch {}
})();

if ($coverImg) {
  $coverImg.addEventListener('click', () => $hiddenCoverFile.click());
}

$hiddenCoverFile.addEventListener('change', async () => {
  const file = $hiddenCoverFile.files && $hiddenCoverFile.files[0];
  if (!file) return;
  const dataUrl = await fileToDataURL(file);
  localStorage.setItem(COVER_KEY, dataUrl);
  if ($coverImg) $coverImg.src = dataUrl;
  $hiddenCoverFile.value = '';
});

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// ====== YT IFRAME API ======
window.onYouTubeIframeAPIReady = function () {
  const playerEl = document.getElementById('player');
  ytPlayer = new YT.Player(playerEl.id || 'player', {
    height: '390',
    width: '640',
    videoId: null,
    playerVars: { modestbranding: 1, rel: 0, playsinline: 1 },
    events: { onReady, onStateChange }
  });
};

function onReady() {
  bindTransportControls();
  renderQueue();
  if (currentIndex >= 0 && queue[currentIndex]) loadIndex(currentIndex, false);
  if ($volume) ytPlayer.setVolume(parseInt($volume.value || '70', 10));
  setInterval(updateProgressUI, 250);
}

function onStateChange(e) {
  if (e.data === YT.PlayerState.ENDED) nextTrack();
  if (e.data === YT.PlayerState.PLAYING || e.data === YT.PlayerState.PAUSED) {
    durationCache = Math.floor(ytPlayer.getDuration() || 0);
  }
}

// ====== SEARCH: accept YT link and queue it ======
if ($searchForm && $searchInput) {
  $searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = ($searchInput.value || '').trim();
    if (!raw) return;
    const parsed = parseYouTubeUrl(raw);
    if (!parsed) {
      $searchInput.setCustomValidity('Paste a valid YouTube link');
      $searchInput.reportValidity();
      return;
    }
    $searchInput.setCustomValidity('');

    queue.push({ id: parsed.id, start: parsed.start || 0, title: null });
    persistQueue();
    if (currentIndex === -1) loadIndex(0, true);
    // optional: get a title via oEmbed (no API key)
    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${parsed.id}&format=json`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.title) {
          queue[queue.length - 1].title = data.title;
          persistQueue();
          renderQueue();
        }
      }).catch(()=>{});

    $searchInput.value = '';
    renderQueue();
  });
}

function parseYouTubeUrl(url) {
  try {
    const u = new URL(url);
    let id = null, start = 0;
    if (u.hostname.includes('youtu.be')) {
      id = u.pathname.slice(1);
    } else if (u.hostname.includes('youtube.com')) {
      if (u.searchParams.get('v')) id = u.searchParams.get('v');
      if (!id && u.pathname.startsWith('/shorts/')) id = u.pathname.split('/')[2];
    } else {
      return null;
    }
    const t = u.searchParams.get('t') || u.searchParams.get('start');
    if (t) start = parseTimeToSeconds(t);
    if (!id) return null;
    return { id, start };
  } catch { return null; }
}
function parseTimeToSeconds(s) {
  if (!s) return 0;
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  let secs = 0, m; const re = /(\d+)(h|m|s)/g;
  while ((m = re.exec(s))) {
    const v = parseInt(m[1], 10);
    if (m[2] === 'h') secs += v * 3600;
    if (m[2] === 'm') secs += v * 60;
    if (m[2] === 's') secs += v;
  }
  return secs;
}

// ====== Player controls ======
function bindTransportControls() {
  if ($playPause) $playPause.addEventListener('click', () => {
    const st = ytPlayer?.getPlayerState?.();
    if (st === YT.PlayerState.PLAYING) ytPlayer.pauseVideo(); else ytPlayer.playVideo();
  });
  if ($next) $next.addEventListener('click', nextTrack);
  if ($prev) $prev.addEventListener('click', prevTrack);

  if ($seek) $seek.addEventListener('input', () => {
    const d = ytPlayer?.getDuration?.() || 0;
    if (d > 0) {
      const newT = (parseFloat($seek.value) / 100) * d;
      ytPlayer.seekTo(newT, true);
    }
  });

  if ($volume) $volume.addEventListener('input', () => {
    ytPlayer?.setVolume?.(parseInt($volume.value, 10));
  });

  // keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      $playPause?.click();
    }
    if (e.shiftKey && e.code === 'ArrowRight') { e.preventDefault(); nextTrack(); }
    if (e.shiftKey && e.code === 'ArrowLeft') { e.preventDefault(); prevTrack(); }
  });

  if ($clear) $clear.addEventListener('click', () => {
    if (!queue.length) return;
    if (confirm('Clear the entire queue?')) {
      queue = [];
      currentIndex = -1;
      persistQueue();
      renderQueue();
      ytPlayer?.stopVideo?.();
    }
  });
}

function updateProgressUI() {
  const d = ytPlayer?.getDuration?.() || durationCache || 0;
  const t = ytPlayer?.getCurrentTime?.() || 0;
  if ($cur) $cur.textContent = fmtTime(t);
  if ($dur) $dur.textContent = fmtTime(d);
  if ($seek && d > 0) $seek.value = (t / d) * 100;
}
function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec||0));
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ====== Queue render / actions ======
function renderQueue() {
  if (!$queueList) return;
  $queueList.innerHTML = queue.map((item, i) => {
    const isActive = i === currentIndex;
    const title = item.title || item.id;
    return `
      <li class="${isActive ? 'active' : ''}">
        <div class="qthumb" aria-hidden="true"></div>
        <div class="qmain">
          <div class="qtitle">${escapeHtml(title)}</div>
          <div class="qmeta">#${i+1} ${item.start ? ' • starts @ '+fmtTime(item.start) : ''}</div>
        </div>
        <div class="qactions">
          <button data-act="play" data-i="${i}">Play</button>
          <button data-act="up" data-i="${i}">↑</button>
          <button data-act="down" data-i="${i}">↓</button>
          <button data-act="remove" data-i="${i}">✕</button>
        </div>
      </li>
    `;
  }).join('');

  $queueList.querySelectorAll('button[data-act]').forEach(btn => {
    btn.addEventListener('click', () => {
      const act = btn.dataset.act;
      const i = parseInt(btn.dataset.i, 10);
      if (act === 'play') loadIndex(i, true);
      if (act === 'up') move(i, -1);
      if (act === 'down') move(i, +1);
      if (act === 'remove') removeAt(i);
    });
  });
}

function move(i, delta) {
  const j = i + delta;
  if (j < 0 || j >= queue.length) return;
  const tmp = queue[i]; queue[i] = queue[j]; queue[j] = tmp;
  if (currentIndex === i) currentIndex = j;
  else if (currentIndex === j) currentIndex = i;
  persistQueue(); renderQueue();
}
function removeAt(i) {
  queue.splice(i, 1);
  if (currentIndex === i) {
    if (i >= queue.length) currentIndex = queue.length - 1;
    if (currentIndex >= 0) loadIndex(currentIndex, true);
    else { ytPlayer?.stopVideo?.(); currentIndex = -1; }
  } else if (i < currentIndex) currentIndex -= 1;
  persistQueue(); renderQueue();
}

function loadIndex(i, autoplay) {
  if (!queue[i]) return;
  currentIndex = i;
  const { id, start } = queue[i];
  if (autoplay) ytPlayer.loadVideoById({ videoId: id, startSeconds: start || 0 });
  else ytPlayer.cueVideoById({ videoId: id, startSeconds: start || 0 });
  persistQueue(); renderQueue();
}

// navigation helpers
function nextTrack() { if (currentIndex + 1 < queue.length) loadIndex(currentIndex + 1, true); }
function prevTrack() { if (currentIndex > 0) loadIndex(currentIndex - 1, true); }

function escapeHtml(s) {
  return (s||'').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
