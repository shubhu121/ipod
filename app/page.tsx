"use client";

import { useState, useRef, useCallback, useEffect } from "react";

/* ─────────────────── Playlist ─────────────────── */
const PLAYLIST = [
  {
    id: "dQw4w9WgXcQ",
    title: "Never Gonna Give You Up",
    artist: "Rick Astley",
    duration: "3:33",
  },
  {
    id: "fJ9rUzIMcZQ",
    title: "Bohemian Rhapsody",
    artist: "Queen",
    duration: "5:55",
  },
  {
    id: "hTWKbfoikeg",
    title: "Smells Like Teen Spirit",
    artist: "Nirvana",
    duration: "5:01",
  },
  {
    id: "YQHsXMglC9A",
    title: "Hello",
    artist: "Adele",
    duration: "4:55",
  },
  {
    id: "kJQP7kiw5Fk",
    title: "Despacito",
    artist: "Luis Fonsi",
    duration: "4:42",
  },
  {
    id: "RgKAFK5djSk",
    title: "See You Again",
    artist: "Wiz Khalifa",
    duration: "3:49",
  },
  {
    id: "JGwWNGJdvx8",
    title: "Shape of You",
    artist: "Ed Sheeran",
    duration: "3:53",
  },
  {
    id: "09R8_2nJtjg",
    title: "Sugar",
    artist: "Maroon 5",
    duration: "3:55",
  },
];

/* ─────────────────── Sound FX via Web Audio ─────────────────── */
function useClickSound() {
  const audioCtx = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!audioCtx.current) {
      audioCtx.current = new AudioContext();
    }
    if (audioCtx.current.state === "suspended") {
      audioCtx.current.resume();
    }
    return audioCtx.current;
  }, []);

  /* Tactile click — short percussive thud */
  const playClick = useCallback(() => {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Noise burst for physical "click" texture
    const bufferSize = ctx.sampleRate * 0.03;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2000;
    filter.Q.value = 1;

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.04);

    // Subtle tonal component
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
    oscGain.gain.setValueAtTime(0.08, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.start(now);
    osc.stop(now + 0.06);
  }, [getCtx]);

  /* Scroll tick — lighter, wheel-rotation feel */
  const playTick = useCallback(() => {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.02);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.start(now);
    osc.stop(now + 0.03);
  }, [getCtx]);

  /* Selection confirm — two-tone ascending chime */
  const playSelect = useCallback(() => {
    const ctx = getCtx();
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      const t = now + i * 0.07;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.start(t);
      osc.stop(t + 0.12);
    });
  }, [getCtx]);

  return { playClick, playTick, playSelect };
}

/* ─────────────────── SVG Icons ─────────────────── */
const PrevIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
  </svg>
);

const NextIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
  </svg>
);

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

/* ─────────────────── Page Component ─────────────────── */
export default function Home() {
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

  /* ── Progress timer ── */
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev >= duration) {
            // auto-advance
            setCurrentIndex((ci) => (ci + 1) % PLAYLIST.length);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, duration]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  /* ── Controls ── */
  const handlePlayPause = useCallback(() => {
    playClick();
    setIsPlaying((prev) => !prev);
  }, [playClick]);

  const handleNext = useCallback(() => {
    playTick();
    setCurrentIndex((prev) => (prev + 1) % PLAYLIST.length);
    setElapsed(0);
    setIsPlaying(true);
  }, [playTick]);

  const handlePrev = useCallback(() => {
    playTick();
    setCurrentIndex((prev) => (prev - 1 + PLAYLIST.length) % PLAYLIST.length);
    setElapsed(0);
    setIsPlaying(true);
  }, [playTick]);

  const handleMenuToggle = useCallback(() => {
    playSelect();
    setScreenView((prev) => (prev === "player" ? "menu" : "player"));
    setMenuIndex(currentIndex);
  }, [playSelect, currentIndex]);

  const handleMenuSelect = useCallback(
    (idx: number) => {
      playSelect();
      setCurrentIndex(idx);
      setScreenView("player");
      setElapsed(0);
      setIsPlaying(true);
    },
    [playSelect]
  );

  const handleMenuNav = useCallback(
    (dir: "up" | "down") => {
      playTick();
      if (screenView === "menu") {
        setMenuIndex((prev) => {
          if (dir === "up")
            return (prev - 1 + PLAYLIST.length) % PLAYLIST.length;
          return (prev + 1) % PLAYLIST.length;
        });
      }
    },
    [playTick, screenView]
  );

  const pressButton = (id: string) => {
    setActiveBtn(id);
    setTimeout(() => setActiveBtn(null), 120);
  };

  /* ── YouTube iframe URL ── */
  const ytSrc = `https://www.youtube.com/embed/${song.id}?autoplay=${isPlaying ? 1 : 0}&enablejsapi=1&loop=0&controls=0`;

  /* ── Shared style helpers ── */
  const wheelBtnInset = (isActive: boolean) => ({
    background: "#0c0c0c",
    boxShadow: isActive
      ? "0 0.5px 0 rgba(255,255,255,0.25), 0 1px 3px rgba(0,0,0,0.6) inset"
      : "0 0.5px 0 rgba(255,255,255,0.3), 0 2px 6px rgba(0,0,0,0.9) inset",
  });

  const wheelBtnRaised = (isActive: boolean) => ({
    background: "linear-gradient(to bottom, #222, #1a1a1a)",
    boxShadow: isActive
      ? "0 1px 3px rgba(0,0,0,0.7) inset"
      : "0 0.5px 0 rgba(255,255,255,0.1) inset, 0 1px 1px rgba(255,255,255,0.06) inset, 0 3px 6px rgba(0,0,0,0.5)",
    transition: "transform 80ms ease, box-shadow 80ms ease",
    transform: isActive ? "scale(0.94)" : "scale(1)",
  });

  return (
    <main className="relative flex-1 flex flex-col items-center justify-center min-h-screen overflow-hidden select-none">
      {/* ── Noise overlay ── */}
      <div className="noise-overlay" />

      {/* ── Ambient orbs ── */}
      <div
        className="pointer-events-none fixed w-[600px] h-[600px] rounded-full opacity-[0.035]"
        style={{
          background:
            "radial-gradient(circle, rgba(255,107,53,0.35) 0%, transparent 70%)",
          top: "5%",
          left: "-12%",
          animation: "orb-drift-1 22s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none fixed w-[450px] h-[450px] rounded-full opacity-[0.025]"
        style={{
          background:
            "radial-gradient(circle, rgba(120,160,255,0.25) 0%, transparent 70%)",
          bottom: "0%",
          right: "-10%",
          animation: "orb-drift-2 28s ease-in-out infinite",
        }}
      />

      {/* ── Hidden YouTube iframe (audio only) ── */}
      <iframe
        ref={iframeRef}
        src={ytSrc}
        allow="autoplay; encrypted-media"
        className="absolute w-0 h-0 opacity-0 pointer-events-none"
        style={{ position: "absolute", top: -9999, left: -9999 }}
        title="YouTube Audio Player"
      />

      {/* ──────── iPod Device ──────── */}
      <div style={{ animation: "float 6s ease-in-out infinite" }}>
        <div
          className="relative rounded-[36px] overflow-hidden"
          style={{
            width: "290px",
            background: "linear-gradient(to bottom, #232323, #1a1a1a)",
            boxShadow: `
              0 1px 0.5px rgba(255,255,255,0.1) inset,
              0 1px 2px rgba(255,255,255,0.2) inset,
              0 10px 10px -9px rgba(0,0,0,0.7),
              0 20px 20px -14px rgba(0,0,0,0.6),
              0 0px 6px 0px rgba(0,0,0,0.6),
              0 0 80px -20px rgba(255,107,53,0.05)
            `,
            animation: "shell-breathe 5s ease-in-out infinite",
            padding: "18px 16px 14px",
          }}
        >
          {/* ── Inner bevel line ── */}
          <div
            className="absolute inset-[2px] rounded-[34px] pointer-events-none"
            style={{ border: "1px solid rgba(255,255,255,0.03)" }}
          />

          {/* ════════════════ SCREEN ════════════════ */}
          <div
            className="relative rounded-[16px] overflow-hidden mb-5"
            style={{
              background: "#080808",
              boxShadow:
                "0 0.5px 0 rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.95) inset",
              padding: "2px",
            }}
          >
            <div
              className="relative rounded-[14px] overflow-hidden"
              style={{
                background:
                  "linear-gradient(145deg, #0f0f0f 0%, #121212 50%, #0e0e0e 100%)",
                padding: "14px 14px 12px",
                minHeight: "220px",
              }}
            >
              {/* CRT scanlines */}
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.015]"
                style={{
                  background:
                    "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)",
                }}
              />
              {/* Screen glare */}
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.02]"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 40%)",
                }}
              />

              {screenView === "player" ? (
                /* ── Now Playing ── */
                <div className="relative z-10">
                  {/* Status bar */}
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={handleMenuToggle}
                      className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors cursor-pointer tracking-wide"
                    >
                      ☰ MENU
                    </button>
                    <div className="flex items-center gap-2">
                      {isPlaying && (
                        <div className="flex items-end gap-[2px] h-[10px]">
                          {[0.5, 1, 0.35, 0.85, 0.6].map((h, i) => (
                            <div
                              key={i}
                              className="w-[2px] rounded-full"
                              style={{
                                height: `${h * 10}px`,
                                background:
                                  "linear-gradient(to top, #ff6b35, #ffaa70)",
                                animation: `float ${0.35 + i * 0.12}s ease-in-out infinite`,
                              }}
                            />
                          ))}
                        </div>
                      )}
                      <div className="flex gap-0.5">
                        {[0.7, 0.85, 1, 0.6].map((o, i) => (
                          <div
                            key={i}
                            className="w-[3px] h-[6px] rounded-[1px]"
                            style={{
                              background: `rgba(100,200,100,${o * 0.5})`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Vinyl disc */}
                  <div className="flex items-center justify-center mb-4">
                    <div
                      className="w-[110px] h-[110px] rounded-full relative"
                      style={{
                        background:
                          "conic-gradient(from 0deg, #181818, #252525, #181818, #252525, #181818, #252525, #181818)",
                        boxShadow:
                          "0 0.5px 0 rgba(255,255,255,0.15), 0 3px 8px rgba(0,0,0,0.9) inset, 0 4px 12px rgba(0,0,0,0.5)",
                        animation: isPlaying
                          ? "spin-slow 3s linear infinite"
                          : "none",
                      }}
                    >
                      {/* Grooves */}
                      {[10, 20, 30, 38].map((inset) => (
                        <div
                          key={inset}
                          className="absolute rounded-full pointer-events-none"
                          style={{
                            inset: `${inset}px`,
                            border: `1px solid rgba(255,255,255,${0.02 + (inset % 20 === 0 ? 0.015 : 0)})`,
                          }}
                        />
                      ))}
                      {/* Center label */}
                      <div
                        className="absolute rounded-full flex items-center justify-center"
                        style={{
                          inset: "34px",
                          background:
                            "radial-gradient(circle at 35% 35%, #ff8f55, #e55520)",
                          boxShadow: isPlaying
                            ? "0 0 20px rgba(255,107,53,0.35), 0 1px 1px rgba(255,255,255,0.15) inset"
                            : "0 1px 1px rgba(255,255,255,0.1) inset",
                        }}
                      >
                        <div
                          className="w-[7px] h-[7px] rounded-full"
                          style={{
                            background: "#0a0a0a",
                            boxShadow:
                              "0 0.5px 0 rgba(255,255,255,0.1) inset",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Song info */}
                  <div className="text-center mb-3">
                    <p className="text-[14px] font-semibold text-gray-100 truncate leading-tight">
                      {song.title}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-1 tracking-wide">
                      {song.artist}
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-1">
                    <div
                      className="h-[3px] rounded-full relative overflow-hidden"
                      style={{
                        background: "#151515",
                        boxShadow:
                          "0 0.5px 0 rgba(255,255,255,0.12), 0 1px 4px rgba(0,0,0,0.8) inset",
                      }}
                    >
                      <div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                          width: `${(elapsed / duration) * 100}%`,
                          background:
                            "linear-gradient(90deg, #ff6b35, #ff8f65)",
                          boxShadow: "0 0 8px rgba(255,107,53,0.35)",
                          transition: "width 1s linear",
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5 px-0.5">
                      <span className="text-[9px] text-gray-600 font-mono tabular-nums">
                        {formatTime(elapsed)}
                      </span>
                      <span className="text-[9px] text-gray-600 font-mono tabular-nums">
                        -{formatTime(duration - elapsed)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Menu / Song List ── */
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={handleMenuToggle}
                      className="text-[10px] text-[#ff6b35] hover:text-[#ff8f65] transition-colors cursor-pointer"
                    >
                      ← Now Playing
                    </button>
                    <span className="text-[9px] text-gray-600">
                      {PLAYLIST.length} songs
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-[0.2em] font-medium">
                    Library
                  </p>
                  <div className="space-y-[2px] max-h-[170px] overflow-y-auto pr-1">
                    {PLAYLIST.map((item, idx) => (
                      <button
                        key={item.id}
                        onClick={() => handleMenuSelect(idx)}
                        className="w-full text-left px-2.5 py-[7px] rounded-lg transition-all duration-100 cursor-pointer group"
                        style={{
                          background:
                            menuIndex === idx
                              ? "rgba(255,107,53,0.12)"
                              : "transparent",
                          borderLeft:
                            menuIndex === idx
                              ? "2px solid #ff6b35"
                              : "2px solid transparent",
                          animation: `slide-up 0.25s ease-out ${idx * 0.03}s both`,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p
                              className="text-[12px] truncate leading-tight"
                              style={{
                                color:
                                  currentIndex === idx ? "#ff6b35" : "#bbb",
                                fontWeight:
                                  currentIndex === idx ? 600 : 400,
                              }}
                            >
                              {currentIndex === idx && isPlaying
                                ? "♫ "
                                : ""}
                              {item.title}
                            </p>
                            <p className="text-[9px] text-gray-600 truncate mt-[1px]">
                              {item.artist}
                            </p>
                          </div>
                          <span className="text-[9px] text-gray-600 ml-2 flex-shrink-0 tabular-nums font-mono">
                            {item.duration}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ════════════════ CLICK WHEEL ════════════════ */}
          <div className="flex justify-center">
            <div
              className="relative w-[210px] h-[210px] rounded-full"
              style={{
                background: "linear-gradient(to bottom, #1d1d1d, #171717)",
                boxShadow: `
                  0 0.5px 0 rgba(255,255,255,0.06),
                  0 2px 8px rgba(0,0,0,0.85) inset,
                  0 -1px 0 rgba(255,255,255,0.04) inset
                `,
              }}
            >
              {/* Subtle concentric ring texture */}
              <div
                className="absolute inset-[4px] rounded-full pointer-events-none"
                style={{ border: "1px solid rgba(255,255,255,0.02)" }}
              />
              <div
                className="absolute inset-[40px] rounded-full pointer-events-none"
                style={{ border: "1px solid rgba(255,255,255,0.015)" }}
              />

              {/* ── MENU (top) ── */}
              <button
                id="btn-menu"
                onClick={() => {
                  pressButton("menu");
                  handleMenuToggle();
                }}
                className="absolute top-[14px] left-1/2 -translate-x-1/2 z-10 cursor-pointer"
              >
                {/* Inset well */}
                <div
                  className="rounded-[10px] p-[3px]"
                  style={wheelBtnInset(activeBtn === "menu")}
                >
                  {/* Raised button */}
                  <div
                    className="w-[48px] h-[26px] rounded-[8px] flex items-center justify-center"
                    style={wheelBtnRaised(activeBtn === "menu")}
                  >
                    <span className="text-[9px] font-semibold text-gray-400 tracking-[0.12em] uppercase">
                      Menu
                    </span>
                  </div>
                </div>
              </button>

              {/* ── PREV (left) ── */}
              <button
                id="btn-prev"
                onClick={() => {
                  pressButton("prev");
                  if (screenView === "menu") handleMenuNav("up");
                  else handlePrev();
                }}
                className="absolute left-[12px] top-1/2 -translate-y-1/2 z-10 cursor-pointer"
              >
                <div
                  className="rounded-full p-[3px]"
                  style={wheelBtnInset(activeBtn === "prev")}
                >
                  <div
                    className="w-[34px] h-[34px] rounded-full flex items-center justify-center"
                    style={wheelBtnRaised(activeBtn === "prev")}
                  >
                    <span className="text-gray-400">
                      <PrevIcon />
                    </span>
                  </div>
                </div>
              </button>

              {/* ── NEXT (right) ── */}
              <button
                id="btn-next"
                onClick={() => {
                  pressButton("next");
                  if (screenView === "menu") handleMenuNav("down");
                  else handleNext();
                }}
                className="absolute right-[12px] top-1/2 -translate-y-1/2 z-10 cursor-pointer"
              >
                <div
                  className="rounded-full p-[3px]"
                  style={wheelBtnInset(activeBtn === "next")}
                >
                  <div
                    className="w-[34px] h-[34px] rounded-full flex items-center justify-center"
                    style={wheelBtnRaised(activeBtn === "next")}
                  >
                    <span className="text-gray-400">
                      <NextIcon />
                    </span>
                  </div>
                </div>
              </button>

              {/* ── PLAY/PAUSE (bottom) ── */}
              <button
                id="btn-playpause"
                onClick={() => {
                  pressButton("play");
                  if (screenView === "menu") handleMenuSelect(menuIndex);
                  else handlePlayPause();
                }}
                className="absolute bottom-[14px] left-1/2 -translate-x-1/2 z-10 cursor-pointer"
              >
                <div
                  className="rounded-[10px] p-[3px]"
                  style={wheelBtnInset(activeBtn === "play")}
                >
                  <div
                    className="w-[48px] h-[26px] rounded-[8px] flex items-center justify-center gap-1"
                    style={wheelBtnRaised(activeBtn === "play")}
                  >
                    <span className="text-gray-400">
                      {isPlaying ? <PauseIcon /> : <PlayIcon />}
                    </span>
                  </div>
                </div>
              </button>

              {/* ── CENTER SELECT ── */}
              <button
                id="btn-select"
                onClick={() => {
                  pressButton("select");
                  playClick();
                  if (screenView === "menu") {
                    handleMenuSelect(menuIndex);
                  } else {
                    setShowPlaylist(!showPlaylist);
                  }
                }}
                className="absolute inset-0 m-auto z-10 cursor-pointer"
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  background: "linear-gradient(to bottom, #252525, #1e1e1e)",
                  boxShadow:
                    activeBtn === "select"
                      ? "0 1px 5px rgba(0,0,0,0.8) inset"
                      : `
                      0 0.5px 0px rgba(255,255,255,0.12) inset,
                      0 1px 1.5px rgba(255,255,255,0.08) inset,
                      0 4px 10px rgba(0,0,0,0.6)
                    `,
                  transition: "transform 80ms ease, box-shadow 80ms ease",
                  transform:
                    activeBtn === "select" ? "scale(0.96)" : "scale(1)",
                }}
              >
                {/* Inner ring on center button */}
                <div
                  className="absolute inset-[3px] rounded-full pointer-events-none"
                  style={{
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                />
              </button>

              {/* ── Tick marks around wheel ── */}
              {Array.from({ length: 32 }).map((_, i) => {
                const angle = (360 / 32) * i;
                const isCardinal = i % 8 === 0;
                return (
                  <div
                    key={i}
                    className="absolute pointer-events-none"
                    style={{
                      width: "1px",
                      height: isCardinal ? "7px" : "3px",
                      background: isCardinal
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(255,255,255,0.02)",
                      top: "50%",
                      left: "50%",
                      transformOrigin: "0 0",
                      transform: `rotate(${angle}deg) translate(-0.5px, -100px)`,
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* ── Bottom connector notch ── */}
          <div className="flex justify-center mt-3.5">
            <div
              className="w-[52px] h-[5px] rounded-full"
              style={{
                background: "#0e0e0e",
                boxShadow:
                  "0 0.5px 0 rgba(255,255,255,0.12), 0 1px 3px rgba(0,0,0,0.7) inset",
              }}
            />
          </div>
        </div>

        {/* ── Ambient reflection below iPod ── */}
        <div
          className="mx-auto mt-3 rounded-[50%]"
          style={{
            width: "200px",
            height: "30px",
            background:
              "radial-gradient(ellipse, rgba(255,107,53,0.15) 0%, transparent 70%)",
            filter: "blur(12px)",
            opacity: 0.5,
          }}
        />
      </div>

      {/* ════════════════ BOTTOM QUEUE PANEL ════════════════ */}
      {showPlaylist && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 max-h-[42vh] overflow-y-auto"
          style={{
            background:
              "linear-gradient(to top, rgba(8,8,8,0.98), rgba(8,8,8,0.88))",
            backdropFilter: "blur(24px)",
            borderTop: "1px solid rgba(255,255,255,0.04)",
            animation: "slide-up 0.3s ease-out",
            padding: "20px 16px 16px",
          }}
        >
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] text-gray-500 uppercase tracking-[0.2em] font-medium">
                Up Next
              </p>
              <button
                onClick={() => {
                  playClick();
                  setShowPlaylist(false);
                }}
                className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-[2px]">
              {PLAYLIST.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => {
                    playSelect();
                    setCurrentIndex(idx);
                    setElapsed(0);
                    setIsPlaying(true);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl transition-all duration-100 cursor-pointer group"
                  style={{
                    background:
                      currentIndex === idx
                        ? "rgba(255,107,53,0.08)"
                        : "transparent",
                    animation: `slide-up 0.25s ease-out ${idx * 0.04}s both`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* Mini vinyl icon */}
                    <div
                      className="w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background:
                          currentIndex === idx
                            ? "radial-gradient(circle at 35% 35%, #ff8f55, #e55520)"
                            : "conic-gradient(from 0deg, #1a1a1a, #222, #1a1a1a, #222, #1a1a1a)",
                        boxShadow:
                          currentIndex === idx
                            ? "0 0 12px rgba(255,107,53,0.25)"
                            : "0 0.5px 0 rgba(255,255,255,0.06), 0 1px 3px rgba(0,0,0,0.6) inset",
                        animation:
                          currentIndex === idx && isPlaying
                            ? "spin-slow 3s linear infinite"
                            : "none",
                      }}
                    >
                      <div
                        className="w-[5px] h-[5px] rounded-full"
                        style={{
                          background:
                            currentIndex === idx ? "#0a0a0a" : "#333",
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-[12px] truncate leading-tight"
                        style={{
                          color:
                            currentIndex === idx ? "#ff6b35" : "#bbb",
                          fontWeight:
                            currentIndex === idx ? 600 : 400,
                        }}
                      >
                        {item.title}
                      </p>
                      <p className="text-[9px] text-gray-600 truncate mt-[1px]">
                        {item.artist}
                      </p>
                    </div>
                    <span className="text-[9px] text-gray-600 flex-shrink-0 font-mono tabular-nums group-hover:text-gray-400 transition-colors">
                      {item.duration}
                    </span>
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
