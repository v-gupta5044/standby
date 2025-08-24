// app.jsx — StandBy YT Music v2 (Immersive toggle + backend search UI)
const { useEffect, useRef, useState, useMemo } = React;

const BACKEND_URL = ""; // e.g., "https://your-render-app.onrender.com"

const initialPlaylist = [
  { id: "ApXoWvfEYVU", title: "Sunflower (Spider‑Man: Into the Spider‑Verse)", artists: "Post Malone & Swae Lee", duration: 130 },
  { id: "fJ9rUzIMcZQ", title: "Bohemian Rhapsody", artists: "Queen", duration: 355 },
  { id: "kJQP7kiw5Fk", title: "Despacito", artists: "Luis Fonsi", duration: 282 }
];

const fmt = (s) => {
  if (isNaN(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};

function StandbyReplica(){
  const playerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playlist, setPlaylist] = useState(initialPlaylist);
  const [thumb, setThumb] = useState("");
  const [immersive, setImmersive] = useState(false);

  // search UI state
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [err, setErr] = useState("");

  const current = playlist[index] || playlist[0];
  const videoId = current?.id;

  // Load YT IFrame API
  useEffect(() => {
    const existing = document.querySelector("script[src='https://www.youtube.com/iframe_api']");
    if (!existing) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }
    window.onYouTubeIframeAPIReady = () => {
      const p = new window.YT.Player("yt-player", {
        height: "0",
        width: "0",
        videoId,
        playerVars: { controls: 0, disablekb: 1, rel: 0, playsinline: 1, modestbranding: 1 },
        events: {
          onReady: () => setReady(true),
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.PLAYING) {
              setPlaying(true);
              setDuration(p.getDuration());
            } else if ([window.YT.PlayerState.PAUSED, window.YT.PlayerState.ENDED].includes(e.data)) {
              setPlaying(false);
              if (e.data === window.YT.PlayerState.ENDED) next();
            }
          }
        }
      });
      playerRef.current = p;
    };
    return () => { window.onYouTubeIframeAPIReady = null; };
  }, []);

  // When track changes
  useEffect(() => {
    if (!playerRef.current || !videoId) return;
    playerRef.current.cueVideoById(videoId);
    const hi = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
    const med = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const img = new Image();
    img.onload = () => setThumb(hi);
    img.onerror = () => setThumb(med);
    img.src = hi;
    setCurrentTime(0);
  }, [videoId]);

  // ticker
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      setCurrentTime(p.getCurrentTime() || 0);
      setDuration(p.getDuration() || 0);
    }, 200);
    return () => clearInterval(id);
  }, [ready]);

  const play = () => playerRef.current?.playVideo();
  const pause = () => playerRef.current?.pauseVideo();
  const toggle = () => (playing ? pause() : play());
  const prev = () => setIndex((i) => (i - 1 + playlist.length) % playlist.length);
  const next = () => setIndex((i) => (i + 1) % playlist.length);
  const seek = (pct) => {
    if (!playerRef.current || !duration) return;
    playerRef.current.seekTo(duration * pct, true);
  };
  const setAndPlay = (list, i=0) => {
    if (!Array.isArray(list) || list.length === 0) return;
    setPlaylist(list);
    setIndex(Math.max(0, Math.min(i, list.length-1)));
    setTimeout(() => play(), 250);
  };

  // backend search
  async function doSearch(ev){
    ev?.preventDefault();
    if (!q.trim()) return;
    setErr("");
    setSearching(true);
    try {
      if (!BACKEND_URL) throw new Error("Set BACKEND_URL in app.jsx to use the search API.");
      const r = await fetch(`${BACKEND_URL}/api/search?q=`+encodeURIComponent(q.trim()));
      if (!r.ok) throw new Error(await r.text());
      const items = await r.json();
      setResults(items || []);
    } catch (e) {
      setErr(e.message || String(e));
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  const artSize = immersive ? "clamp(260px, 52vh, 640px)" : "clamp(220px, 42vh, 540px)";
  const trayMaxW = immersive ? "100vw" : "min(1500px, 94vw)";
  const trayMaxH = immersive ? "100vh" : "min(720px, 82vh)";
  const rounding = immersive ? "rounded-none" : "rounded-[40px]";
  const border = immersive ? "border-transparent" : "border border-white/10";
  const gridCols = immersive ? "1.2fr 1fr" : "1fr 1.2fr";

  const progressPct = duration ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="min-h-[100dvh] min-w-[100vw] bg-gradient-to-br from-zinc-950 via-black to-zinc-900 flex items-center justify-center p-[clamp(0px,2vw,30px)]">
      <div className={`relative w-full h-full ${rounding} overflow-hidden shadow-[0_40px_90px_rgba(0,0,0,0.7)] backdrop-blur-2xl ${border}`} style={{maxWidth: trayMaxW, maxHeight: trayMaxH}}>
        {/* top bar: search + immersive */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <form onSubmit={doSearch} className="flex items-center gap-2 bg-white/10 hover:bg-white/15 transition rounded-2xl px-3 py-2 backdrop-blur-md border border-white/10">
            <svg width="18" height="18" viewBox="0 0 24 24" className="text-white/80"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16a6.471 6.471 0 0 0 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14Z"/></svg>
            <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search YouTube Music…" className="bg-transparent outline-none text-white placeholder:text-white/60 w-[32ch]"/>
            <button type="submit" className="px-3 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white text-sm">Search</button>
          </form>
          <button onClick={()=>setImmersive(v=>!v)} className="px-3 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-white backdrop-blur-md border border-white/10 text-sm">{immersive ? "Card Mode" : "Immersive"}</button>
        </div>

        {/* results dropdown */}
        {(results.length>0 || searching || err) && (
          <div className="absolute top-[62px] right-4 z-20 w-[min(560px,90vw)] max-h-[60vh] overflow-auto rounded-2xl bg-zinc-900/90 backdrop-blur-xl border border-white/10 shadow-2xl p-2">
            {searching && <div className="text-white/80 p-3">Searching…</div>}
            {err && <div className="text-red-300 p-3">{err}</div>}
            {results.map((r, i)=> (
              <div key={r.id+i} className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-white/10 text-white">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{r.title}</div>
                  <div className="text-white/70 text-sm truncate">{r.artists || ""}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button className="px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25" onClick={()=>setAndPlay([r])}>Play</button>
                  <button className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20" onClick={()=>{ setPlaylist(p=>[...p, r]); }}>Queue</button>
                  <button className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20" onClick={()=>{ setResults([]); }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Animated blurred artwork background */}
        <div className="absolute inset-0 animate-pulse-slow" style={{ background: thumb ? `url(${thumb}) center/cover no-repeat` : undefined, filter: "blur(45px) brightness(0.35)", transform: "scale(1.25)" }} />
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950/80 via-zinc-900/65 to-zinc-800/55" />

        {/* Content */}
        <div className="relative z-10 h-full grid" style={{gridTemplateColumns: gridCols}}>
          {/* Artwork */}
          <div className="flex items-center justify-center">
            <div className="overflow-hidden rounded-[32px] shadow-2xl ring-1 ring-black/40 transition-transform duration-500 hover:scale-[1.03]" style={{width: artSize, height: artSize}}>
              {thumb ? (<img src={thumb} alt="artwork" className="w-full h-full object-cover" />) : (<div className="w-full h-full bg-zinc-700" />)}
            </div>
          </div>

          {/* Right panel */}
          <div className="flex flex-col justify-center px-[clamp(16px,3vw,44px)]">
            <div className="mb-[clamp(10px,2vh,22px)]">
              <div className="text-white font-bold tracking-tight drop-shadow-lg" style={{fontSize: "clamp(28px, 5vw, 60px)", lineHeight: "1.1"}}>{current?.title}</div>
              <div className="mt-3 text-zinc-300/95 font-medium" style={{fontSize: "clamp(16px, 2.5vw, 32px)"}}>{current?.artists}</div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-[clamp(18px,2.6vw,34px)] my-[clamp(12px,2vh,24px)]">
              <IconBtn onClick={prev} icon="prev" />
              <IconBtn onClick={toggle} icon={playing ? "pause" : "play"} big />
              <IconBtn onClick={next} icon="next" />
            </div>

            {/* Progress */}
            <div className="mt-[clamp(12px,2vh,26px)]">
              <div className="flex items-center text-zinc-200/95 font-medium">
                <span className="tabular-nums shrink-0" style={{fontSize: "clamp(12px,1.8vw,22px)", width: "clamp(44px,6ch,72px)"}}>{fmt(currentTime)}</span>
                <div className="mx-[clamp(12px,2vw,24px)] flex-1 h-[clamp(8px,1.4vh,14px)] rounded-full bg-zinc-600/40 overflow-hidden group">
                  <div className="h-full bg-gradient-to-r from-white/90 to-zinc-200/90 transition-all duration-300 group-hover:brightness-110 cursor-pointer" style={{ width: `${progressPct}%` }} onClick={(e) => {
                    const rect = e.currentTarget.parentElement.getBoundingClientRect();
                    const pct = (e.clientX - rect.left) / rect.width;
                    seek(pct);
                  }} />
                </div>
                <span className="tabular-nums shrink-0 text-right" style={{fontSize: "clamp(12px,1.8vw,22px)", width: "clamp(44px,6ch,72px)"}}>-{fmt(Math.max(0, duration - currentTime))}</span>
              </div>
            </div>

            {/* Mini queue */}
            {playlist.length > 1 && (
              <div className="mt-4 flex flex-wrap gap-2 max-h-[20vh] overflow-auto">
                {playlist.map((t, i) => (
                  <button key={t.id+i} onClick={()=>setIndex(i)} className={`px-3 py-1 rounded-xl border text-sm ${i===index ? "bg-white/25 text-white border-white/20" : "bg-white/10 text-white/90 border-white/10 hover:bg-white/15"}`}>
                    {i===index ? "▶ " : ""}{t.title.length>26 ? t.title.slice(0,26)+"…" : t.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Hidden player */}
        <div id="yt-player" className="hidden" />
      </div>
    </div>
  );
}

function IconBtn({ icon, onClick, big }) {
  const base = "transition active:scale-95 select-none inline-flex items-center justify-center rounded-2xl shadow-lg backdrop-blur-md border border-white/10";
  const pad = big ? "w-[80px] h-[80px]" : "w-[64px] h-[64px]";
  const bg = "bg-white/15 hover:bg-white/25 text-white";
  return (
    <button onClick={onClick} className={`${base} ${pad} ${bg}`}>
      {icon === "play" && (<svg width={34} height={34} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>)}
      {icon === "pause" && (<svg width={34} height={34} viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>)}
      {icon === "next" && (<svg width={34} height={34} viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm9-12h3v12h-3z"/></svg>)}
      {icon === "prev" && (<svg width={34} height={34} viewBox="0 0 24 24" fill="currentColor" style={{transform:"scaleX(-1)"}}><path d="M6 18l8.5-6L6 6v12zm9-12h3v12h-3z"/></svg>)}
    </button>
  );
}

// Mount
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<StandbyReplica />);
