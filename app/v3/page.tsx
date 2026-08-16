"use client";

import { useState, useRef, useCallback, useEffect } from "react";

/* ─────────────────── Playlist ─────────────────── */
const PLAYLIST = [
  { id: "dQw4w9WgXcQ", title: "Never Gonna Give You Up", artist: "Rick Astley", duration: "3:33" },
  { id: "fJ9rUzIMcZQ", title: "Bohemian Rhapsody", artist: "Queen", duration: "5:55" },
  { id: "hTWKbfoikeg", title: "Smells Like Teen Spirit", artist: "Nirvana", duration: "5:01" },
  { id: "YQHsXMglC9A", title: "Hello", artist: "Adele", duration: "4:55" },
  { id: "kJQP7kiw5Fk", title: "Despacito", artist: "Luis Fonsi", duration: "4:42" },
  { id: "RgKAFK5djSk", title: "See You Again", artist: "Wiz Khalifa", duration: "3:49" },
  { id: "JGwWNGJdvx8", title: "Shape of You", artist: "Ed Sheeran", duration: "3:53" },
  { id: "09R8_2nJtjg", title: "Sugar", artist: "Maroon 5", duration: "3:55" },
];

/* ─────────────────── Sound FX via Web Audio ─────────────────── */
function useClickSound() {
  const audioCtx = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!audioCtx.current) audioCtx.current = new AudioContext();
    if (audioCtx.current.state === "suspended") audioCtx.current.resume();
    return audioCtx.current;
  }, []);

  const playClick = useCallback(() => {
    const ctx = getCtx();
    const now = ctx.currentTime;
    // Noise burst
    const bufferSize = ctx.sampleRate * 0.025;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.25;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.1, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2200;
    filter.Q.value = 1.2;
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.035);
    // Tone
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.04);
    oscGain.gain.setValueAtTime(0.07, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.start(now);
    osc.stop(now + 0.05);
  }, [getCtx]);

  const playTick = useCallback(() => {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1600, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.02);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
    osc.start(now);
    osc.stop(now + 0.025);
  }, [getCtx]);

  const playSelect = useCallback(() => {
    const ctx = getCtx();
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      const t = now + i * 0.06;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.start(t);
      osc.stop(t + 0.1);
    });
  }, [getCtx]);

  return { playClick, playTick, playSelect };
}

/* ─────────────────── Page ─────────────────── */
export default function V3Page() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const duration = 213;
  const [activeBtn, setActiveBtn] = useState<string | null>(null);
  const [screenView, setScreenView] = useState<"player" | "menu">("player");
  const [menuIndex, setMenuIndex] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { playClick, playTick, playSelect } = useClickSound();
  const song = PLAYLIST[currentIndex];

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev >= duration) {
            setCurrentIndex((ci) => (ci + 1) % PLAYLIST.length);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, duration]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handlePlayPause = useCallback(() => { playClick(); setIsPlaying((p) => !p); }, [playClick]);
  const handleNext = useCallback(() => { playTick(); setCurrentIndex((p) => (p + 1) % PLAYLIST.length); setElapsed(0); setIsPlaying(true); }, [playTick]);
  const handlePrev = useCallback(() => { playTick(); setCurrentIndex((p) => (p - 1 + PLAYLIST.length) % PLAYLIST.length); setElapsed(0); setIsPlaying(true); }, [playTick]);
  const handleMenuToggle = useCallback(() => { playSelect(); setScreenView((p) => p === "player" ? "menu" : "player"); setMenuIndex(currentIndex); }, [playSelect, currentIndex]);
  const handleMenuSelect = useCallback((idx: number) => { playSelect(); setCurrentIndex(idx); setScreenView("player"); setElapsed(0); setIsPlaying(true); }, [playSelect]);
  const handleMenuNav = useCallback((dir: "up" | "down") => {
    playTick();
    if (screenView === "menu") {
      setMenuIndex((p) => dir === "up" ? (p - 1 + PLAYLIST.length) % PLAYLIST.length : (p + 1) % PLAYLIST.length);
    }
  }, [playTick, screenView]);

  const pressButton = (id: string) => { setActiveBtn(id); setTimeout(() => setActiveBtn(null), 120); };

  const ytSrc = `https://www.youtube.com/embed/${song.id}?autoplay=${isPlaying ? 1 : 0}&enablejsapi=1&loop=0&controls=0`;

  return (
    <main className="relative flex-1 flex flex-col items-center justify-center min-h-screen overflow-hidden select-none">
      <div className="noise-overlay" />

      {/* Ambient orbs */}
      <div
        className="pointer-events-none fixed w-[600px] h-[600px] rounded-full opacity-[0.03]"
        style={{
          background: "radial-gradient(circle, rgba(255,107,53,0.3) 0%, transparent 70%)",
          top: "5%", left: "-12%",
          animation: "orb-drift-1 22s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none fixed w-[450px] h-[450px] rounded-full opacity-[0.02]"
        style={{
          background: "radial-gradient(circle, rgba(120,160,255,0.2) 0%, transparent 70%)",
          bottom: "0%", right: "-10%",
          animation: "orb-drift-2 28s ease-in-out infinite",
        }}
      />

      {/* Hidden YT iframe */}
      <iframe
        ref={iframeRef}
        src={ytSrc}
        allow="autoplay; encrypted-media"
        className="absolute w-0 h-0 opacity-0 pointer-events-none"
        style={{ position: "absolute", top: -9999, left: -9999 }}
        title="YouTube Audio Player"
      />

      {/* ════════════════ iPod Device ════════════════ */}
      <div style={{ animation: "float 6s ease-in-out infinite" }}>
        {/* Shell */}
        <div
          className="relative overflow-hidden"
          style={{
            width: "280px",
            borderRadius: "30px",
            background: "linear-gradient(to bottom, #232323, #1a1a1a)",
            boxShadow: `
              0 1px 0.5px rgba(255,255,255,0.1) inset,
              0 1px 2px rgba(255,255,255,0.18) inset,
              0 10px 10px -9px rgba(0,0,0,0.7),
              0 20px 20px -14px rgba(0,0,0,0.6),
              0 0px 6px 0px rgba(0,0,0,0.6),
              0 0 80px -20px rgba(255,107,53,0.04)
            `,
            animation: "shell-breathe 5s ease-in-out infinite",
            padding: "16px 14px 12px",
          }}
        >
          {/* Inner bevel */}
          <div
            className="absolute inset-[2px] pointer-events-none"
            style={{ borderRadius: "28px", border: "1px solid rgba(255,255,255,0.025)" }}
          />

          {/* ════════ SCREEN ════════ */}
          <div
            className="relative overflow-hidden mb-4"
            style={{
              borderRadius: "14px",
              background: "#070707",
              boxShadow: "0 0.5px 0 rgba(255,255,255,0.22), 0 2px 8px rgba(0,0,0,0.95) inset",
              padding: "2px",
            }}
          >
            <div
              className="relative overflow-hidden"
              style={{
                borderRadius: "12px",
                background: "linear-gradient(145deg, #0e0e0e 0%, #111 50%, #0d0d0d 100%)",
                padding: "12px 12px 10px",
                minHeight: "210px",
              }}
            >
              {/* Scanlines */}
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.012]"
                style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.04) 2px, rgba(255,255,255,0.04) 4px)" }}
              />
              {/* Glare */}
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.015]"
                style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 35%)" }}
              />

              {screenView === "player" ? (
                <div className="relative z-10">
                  {/* Status bar */}
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={handleMenuToggle} className="text-[9px] text-gray-500 hover:text-gray-300 transition-colors cursor-pointer tracking-wider">
                      ☰ MENU
                    </button>
                    <div className="flex items-center gap-2">
                      {isPlaying && (
                        <div className="flex items-end gap-[2px] h-[9px]">
                          {[0.5, 1, 0.35, 0.85, 0.6].map((h, i) => (
                            <div key={i} className="w-[2px] rounded-full" style={{ height: `${h * 9}px`, background: "linear-gradient(to top, #ff6b35, #ffaa70)", animation: `float ${0.35 + i * 0.12}s ease-in-out infinite` }} />
                          ))}
                        </div>
                      )}
                      <div className="flex gap-[2px]">
                        {[0.7, 0.85, 1, 0.6].map((o, i) => (
                          <div key={i} className="w-[2.5px] h-[5px] rounded-[1px]" style={{ background: `rgba(100,200,100,${o * 0.45})` }} />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Vinyl */}
                  <div className="flex items-center justify-center mb-3">
                    <div
                      className="w-[100px] h-[100px] rounded-full relative"
                      style={{
                        background: "conic-gradient(from 0deg, #181818, #242424, #181818, #242424, #181818, #242424, #181818)",
                        boxShadow: "0 0.5px 0 rgba(255,255,255,0.12), 0 3px 8px rgba(0,0,0,0.9) inset, 0 4px 12px rgba(0,0,0,0.5)",
                        animation: isPlaying ? "spin-slow 3s linear infinite" : "none",
                      }}
                    >
                      {[9, 18, 27, 35].map((inset) => (
                        <div key={inset} className="absolute rounded-full pointer-events-none" style={{ inset: `${inset}px`, border: `1px solid rgba(255,255,255,${0.02 + (inset % 18 === 0 ? 0.01 : 0)})` }} />
                      ))}
                      <div
                        className="absolute rounded-full flex items-center justify-center"
                        style={{
                          inset: "31px",
                          background: "radial-gradient(circle at 35% 35%, #ff8f55, #e55520)",
                          boxShadow: isPlaying ? "0 0 18px rgba(255,107,53,0.3), 0 1px 1px rgba(255,255,255,0.12) inset" : "0 1px 1px rgba(255,255,255,0.08) inset",
                        }}
                      >
                        <div className="w-[6px] h-[6px] rounded-full" style={{ background: "#0a0a0a", boxShadow: "0 0.5px 0 rgba(255,255,255,0.08) inset" }} />
                      </div>
                    </div>
                  </div>

                  {/* Song info */}
                  <div className="text-center mb-2.5">
                    <p className="text-[13px] font-semibold text-gray-100 truncate leading-tight">{song.title}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 tracking-wide">{song.artist}</p>
                  </div>

                  {/* Progress */}
                  <div className="mb-0.5">
                    <div className="h-[2.5px] rounded-full relative overflow-hidden" style={{ background: "#141414", boxShadow: "0 0.5px 0 rgba(255,255,255,0.1), 0 1px 4px rgba(0,0,0,0.8) inset" }}>
                      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(elapsed / duration) * 100}%`, background: "linear-gradient(90deg, #ff6b35, #ff8f65)", boxShadow: "0 0 6px rgba(255,107,53,0.3)", transition: "width 1s linear" }} />
                    </div>
                    <div className="flex justify-between mt-1 px-0.5">
                      <span className="text-[8px] text-gray-600 font-mono tabular-nums">{formatTime(elapsed)}</span>
                      <span className="text-[8px] text-gray-600 font-mono tabular-nums">-{formatTime(duration - elapsed)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2.5">
                    <button onClick={handleMenuToggle} className="text-[9px] text-[#ff6b35] hover:text-[#ff8f65] transition-colors cursor-pointer">← Now Playing</button>
                    <span className="text-[8px] text-gray-600">{PLAYLIST.length} songs</span>
                  </div>
                  <p className="text-[9px] text-gray-500 mb-1.5 uppercase tracking-[0.2em] font-medium">Library</p>
                  <div className="space-y-[1px] max-h-[160px] overflow-y-auto pr-1">
                    {PLAYLIST.map((item, idx) => (
                      <button
                        key={item.id}
                        onClick={() => handleMenuSelect(idx)}
                        className="w-full text-left px-2 py-[6px] rounded-lg transition-all duration-100 cursor-pointer"
                        style={{
                          background: menuIndex === idx ? "rgba(255,107,53,0.1)" : "transparent",
                          borderLeft: menuIndex === idx ? "2px solid #ff6b35" : "2px solid transparent",
                          animation: `slide-up 0.2s ease-out ${idx * 0.025}s both`,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] truncate leading-tight" style={{ color: currentIndex === idx ? "#ff6b35" : "#bbb", fontWeight: currentIndex === idx ? 600 : 400 }}>
                              {currentIndex === idx && isPlaying ? "♫ " : ""}{item.title}
                            </p>
                            <p className="text-[8px] text-gray-600 truncate mt-[1px]">{item.artist}</p>
                          </div>
                          <span className="text-[8px] text-gray-600 ml-2 flex-shrink-0 tabular-nums font-mono">{item.duration}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ════════════════ CLASSIC CLICK WHEEL ════════════════ */}
          <div className="flex justify-center">
            <div
              className="relative"
              style={{
                width: "230px",
                height: "230px",
                borderRadius: "50%",
                background: "linear-gradient(180deg, #1e1e1e 0%, #191919 40%, #161616 100%)",
                boxShadow: `
                  0 0.5px 0 rgba(255,255,255,0.06),
                  0 1px 0 rgba(255,255,255,0.03) inset,
                  0 -1px 0 rgba(0,0,0,0.4) inset,
                  0 4px 12px rgba(0,0,0,0.7)
                `,
              }}
            >
              {/* Outer ring — subtle bevel */}
              <div
                className="absolute inset-[1px] rounded-full pointer-events-none"
                style={{
                  border: "1px solid rgba(255,255,255,0.03)",
                }}
              />

              {/* Inner circular track ring — the classic iPod groove */}
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  inset: "48px",
                  border: "1.5px solid rgba(0,0,0,0.5)",
                  boxShadow: "0 0.5px 0 rgba(255,255,255,0.04)",
                }}
              />

              {/* ── MENU (top) — text printed on wheel ── */}
              <button
                id="v3-btn-menu"
                onClick={() => { pressButton("menu"); handleMenuToggle(); }}
                className="absolute top-[16px] left-1/2 -translate-x-1/2 z-10 cursor-pointer group"
                style={{ transition: "transform 60ms ease", transform: activeBtn === "menu" ? "scale(0.92)" : "scale(1)" }}
              >
                <span
                  className="text-[10px] font-medium tracking-[0.22em] uppercase transition-colors"
                  style={{ color: activeBtn === "menu" ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.28)" }}
                >
                  MENU
                </span>
              </button>

              {/* ── PREV (left) — icon printed on wheel ── */}
              <button
                id="v3-btn-prev"
                onClick={() => { pressButton("prev"); if (screenView === "menu") handleMenuNav("up"); else handlePrev(); }}
                className="absolute left-[18px] top-1/2 -translate-y-1/2 z-10 cursor-pointer"
                style={{ transition: "transform 60ms ease", transform: activeBtn === "prev" ? "scale(0.88)" : "scale(1)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" style={{ fill: activeBtn === "prev" ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.25)" }}>
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>

              {/* ── NEXT (right) — icon printed on wheel ── */}
              <button
                id="v3-btn-next"
                onClick={() => { pressButton("next"); if (screenView === "menu") handleMenuNav("down"); else handleNext(); }}
                className="absolute right-[18px] top-1/2 -translate-y-1/2 z-10 cursor-pointer"
                style={{ transition: "transform 60ms ease", transform: activeBtn === "next" ? "scale(0.88)" : "scale(1)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" style={{ fill: activeBtn === "next" ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.25)" }}>
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>

              {/* ── PLAY/PAUSE (bottom) — icon printed on wheel ── */}
              <button
                id="v3-btn-play"
                onClick={() => { pressButton("play"); if (screenView === "menu") handleMenuSelect(menuIndex); else handlePlayPause(); }}
                className="absolute bottom-[16px] left-1/2 -translate-x-1/2 z-10 cursor-pointer"
                style={{ transition: "transform 60ms ease", transform: activeBtn === "play" ? "scale(0.88)" : "scale(1)" }}
              >
                {isPlaying ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" style={{ fill: activeBtn === "play" ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.25)" }}>
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" style={{ fill: activeBtn === "play" ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.25)" }}>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* ── CENTER SELECT ── */}
              <button
                id="v3-btn-select"
                onClick={() => {
                  pressButton("select");
                  playClick();
                  if (screenView === "menu") handleMenuSelect(menuIndex);
                  else setShowPlaylist(!showPlaylist);
                }}
                className="absolute inset-0 m-auto z-10 cursor-pointer"
                style={{
                  width: "82px",
                  height: "82px",
                  borderRadius: "50%",
                  background: "linear-gradient(180deg, #222 0%, #1b1b1b 50%, #181818 100%)",
                  boxShadow: activeBtn === "select"
                    ? "0 1px 4px rgba(0,0,0,0.7) inset, 0 0 0 1px rgba(0,0,0,0.3)"
                    : `
                      0 1px 0 rgba(255,255,255,0.06) inset,
                      0 -0.5px 0 rgba(0,0,0,0.3) inset,
                      0 3px 8px rgba(0,0,0,0.4),
                      0 0 0 1px rgba(255,255,255,0.02)
                    `,
                  transition: "transform 60ms ease, box-shadow 60ms ease",
                  transform: activeBtn === "select" ? "scale(0.97)" : "scale(1)",
                }}
              />
            </div>
          </div>

          {/* Bottom connector */}
          <div className="flex justify-center mt-3">
            <div
              className="w-[48px] h-[4px] rounded-full"
              style={{
                background: "#0d0d0d",
                boxShadow: "0 0.5px 0 rgba(255,255,255,0.1), 0 1px 3px rgba(0,0,0,0.7) inset",
              }}
            />
          </div>
        </div>

        {/* Reflection */}
        <div
          className="mx-auto mt-3 rounded-[50%]"
          style={{
            width: "180px", height: "25px",
            background: "radial-gradient(ellipse, rgba(255,107,53,0.12) 0%, transparent 70%)",
            filter: "blur(10px)", opacity: 0.45,
          }}
        />
      </div>

      {/* ════════ BOTTOM QUEUE PANEL ════════ */}
      {showPlaylist && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 max-h-[42vh] overflow-y-auto"
          style={{
            background: "linear-gradient(to top, rgba(8,8,8,0.98), rgba(8,8,8,0.88))",
            backdropFilter: "blur(24px)",
            borderTop: "1px solid rgba(255,255,255,0.04)",
            animation: "slide-up 0.3s ease-out",
            padding: "18px 16px 14px",
          }}
        >
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-medium">Up Next</p>
              <button onClick={() => { playClick(); setShowPlaylist(false); }} className="text-[9px] text-gray-500 hover:text-gray-300 transition-colors cursor-pointer">✕</button>
            </div>
            <div className="space-y-[2px]">
              {PLAYLIST.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => { playSelect(); setCurrentIndex(idx); setElapsed(0); setIsPlaying(true); }}
                  className="w-full text-left px-3 py-2 rounded-xl transition-all duration-100 cursor-pointer group"
                  style={{
                    background: currentIndex === idx ? "rgba(255,107,53,0.08)" : "transparent",
                    animation: `slide-up 0.2s ease-out ${idx * 0.03}s both`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-[28px] h-[28px] rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: currentIndex === idx ? "radial-gradient(circle at 35% 35%, #ff8f55, #e55520)" : "conic-gradient(from 0deg, #1a1a1a, #222, #1a1a1a, #222, #1a1a1a)",
                        boxShadow: currentIndex === idx ? "0 0 10px rgba(255,107,53,0.2)" : "0 0.5px 0 rgba(255,255,255,0.05), 0 1px 3px rgba(0,0,0,0.5) inset",
                        animation: currentIndex === idx && isPlaying ? "spin-slow 3s linear infinite" : "none",
                      }}
                    >
                      <div className="w-[4px] h-[4px] rounded-full" style={{ background: currentIndex === idx ? "#0a0a0a" : "#333" }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] truncate leading-tight" style={{ color: currentIndex === idx ? "#ff6b35" : "#bbb", fontWeight: currentIndex === idx ? 600 : 400 }}>{item.title}</p>
                      <p className="text-[8px] text-gray-600 truncate mt-[1px]">{item.artist}</p>
                    </div>
                    <span className="text-[8px] text-gray-600 flex-shrink-0 font-mono tabular-nums group-hover:text-gray-400 transition-colors">{item.duration}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
