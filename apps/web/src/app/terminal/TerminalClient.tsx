'use client';

/**
 * PNL Terminal — trading platform concept.
 *
 * One screen, one number: the live onchain price of an asset as a single
 * point drifting up and down. Below it, a Kalshi-style binary call reduced
 * to its absolute minimum — two arrows. Pick a side, stake, submit; the
 * ticket resolves against the live feed after the horizon elapses.
 *
 * Price transport is Pyth's Hermes SSE stream (realtime onchain oracle,
 * ~400ms cadence) consumed directly from the browser — no backend needed.
 *
 * Keys: P toggles settings · X / Esc returns to the terminal.
 * Tickets are simulated — this is a concept, no real orders are placed.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ————————————————————————————————————————————— palette (Kalshi-dark)
const GREEN = '#00d992';
const RED = '#ff5b5c';
const GOLD = '#b8a664';
const MUTED = '#7a827e';
const FAINT = '#3a3f3d';
const PANEL_BG = '#0e100f';
const PANEL_BORDER = '#232624';

// Pyth price-feed ids (mainnet, USD pairs) + display decimals chosen so a
// typical tick visibly rolls the last digit
const FEEDS: Record<string, { id: string; name: string; dec: number }> = {
  SOL: { id: 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d', name: 'Solana', dec: 3 },
  BTC: { id: 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43', name: 'Bitcoin', dec: 2 },
  ETH: { id: 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace', name: 'Ethereum', dec: 2 },
};

const HORIZONS = [
  { label: '30s', seconds: 30 },
  { label: '60s', seconds: 60 },
  { label: '5m', seconds: 300 },
];

const STAKES = [5, 10, 25, 50];

// Rolling window (ms) for the delta readout under the price
const BAND_WINDOW_MS = 60_000;

// Seismograph ball mapping: every tick KICKS the ball by that tick's move,
// scaled by a live EMA of recent tick sizes, then the deflection relaxes to
// center fast — the ball is a readout of movement itself, and the ±span rail
// labels retune to current price every tick.
const TICK_TAU_S = 10;
const DECAY_TAU_S = 1.8;
const GAIN = 3.5;
const SCALE_FLOOR_FRAC = 0.00003;

type Side = 'up' | 'down';

interface Position {
  side: Side;
  strike: number;
  stake: number;
  cost: number; // cents paid per $1 contract at submit
  expiresAt: number;
}

interface Result {
  won: boolean;
  amount: number; // net win (+) or stake lost (−)
}

const fmt = (p: number, dec = 2) =>
  p.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });

export default function TerminalClient() {
  const [asset, setAsset] = useState<keyof typeof FEEDS>('SOL');
  const [price, setPrice] = useState<number | null>(null);
  const [dir, setDir] = useState<0 | 1 | -1>(0);
  const [band, setBand] = useState<{ lo: number; hi: number } | null>(null);
  const [delta, setDelta] = useState<{ abs: number; pct: number } | null>(null);
  const [upCents, setUpCents] = useState(50);
  const [connected, setConnected] = useState(false);

  const [side, setSide] = useState<Side | null>(null); // ticket panel open for this side
  const [stake, setStake] = useState(10);
  const [position, setPosition] = useState<Position | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [horizon, setHorizon] = useState(60);

  // refs feeding the rAF ball loop without re-renders
  const samplesRef = useRef<{ t: number; p: number }[]>([]);
  const priceRef = useRef<number | null>(null);
  const tickScaleRef = useRef(0);
  const deflRef = useRef(0);
  const lastMsgTRef = useRef(0);
  const targetNormRef = useRef(0.5); // 0 = band low, 1 = band high
  const stageRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);

  // ————————————————————————————————————— live feed (Pyth Hermes SSE)
  useEffect(() => {
    samplesRef.current = [];
    priceRef.current = null;
    tickScaleRef.current = 0;
    deflRef.current = 0;
    lastMsgTRef.current = 0;
    setPrice(null);
    setBand(null);
    setDelta(null);
    setDir(0);
    setConnected(false);
    // an open ticket can't survive an asset switch — it priced a different feed
    setPosition(null);
    setResult(null);
    setSide(null);

    const url =
      'https://hermes.pyth.network/v2/updates/price/stream' +
      `?ids[]=${FEEDS[asset].id}&parsed=true`;
    const es = new EventSource(url);

    es.onmessage = (ev) => {
      let p: number;
      try {
        const parsed = JSON.parse(ev.data)?.parsed?.[0]?.price;
        p = Number(parsed.price) * 10 ** parsed.expo;
        if (!Number.isFinite(p)) return;
      } catch {
        return;
      }

      const now = Date.now();
      const samples = samplesRef.current;
      samples.push({ t: now, p });
      while (samples.length && samples[0].t < now - BAND_WINDOW_MS) samples.shift();

      // seismograph: kick by this tick's move (in adaptive tick-size units,
      // dt-aware), decay the standing deflection back toward center
      const dt = Math.min(5, Math.max(0.05, lastMsgTRef.current ? (now - lastMsgTRef.current) / 1000 : 0.4));
      lastMsgTRef.current = now;
      const prevP = priceRef.current;
      const d = prevP === null ? 0 : p - prevP;
      if (prevP !== null) {
        tickScaleRef.current += (Math.abs(d) - tickScaleRef.current) * (1 - Math.exp(-dt / TICK_TAU_S));
      }
      const span = Math.max(tickScaleRef.current, p * SCALE_FLOOR_FRAC) * GAIN;
      const defl = Math.max(
        -1,
        Math.min(1, deflRef.current * Math.exp(-dt / DECAY_TAU_S) + d / span),
      );
      deflRef.current = defl;
      const lo = p - span;
      const hi = p + span;
      targetNormRef.current = (defl + 1) / 2;

      const prev = priceRef.current;
      priceRef.current = p;
      const p0 = samples[0].p;

      // toy odds: drift over the window nudges the cents off 50/50
      const cents = Math.round(50 + Math.max(-10, Math.min(10, ((p - p0) / p0) * 4000)));

      setPrice(p);
      if (prev !== null && p !== prev) setDir(p > prev ? 1 : -1);
      setBand({ lo, hi });
      setDelta({ abs: p - p0, pct: ((p - p0) / p0) * 100 });
      setUpCents(cents);
      setConnected(true);
    };
    es.onerror = () => setConnected(false); // EventSource retries on its own

    return () => es.close();
  }, [asset]);

  // ————————————————————————————————————— ball animation (rAF lerp)
  useEffect(() => {
    let raf = 0;
    let y = -1;
    const tick = () => {
      const stage = stageRef.current;
      const ball = ballRef.current;
      if (stage && ball) {
        const h = stage.offsetHeight;
        const pad = 14;
        const target = pad + (1 - targetNormRef.current) * (h - pad * 2);
        y = y < 0 ? target : y + (target - y) * 0.3;
        ball.style.transform = `translate(-50%, ${y}px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ————————————————————————————————————— ticket resolution
  useEffect(() => {
    if (!position) return;
    const iv = setInterval(() => {
      const left = Math.max(0, Math.ceil((position.expiresAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left > 0) return;
      const p = priceRef.current;
      if (p === null) return; // no price yet — wait for the next tick
      const won = position.side === 'up' ? p > position.strike : p < position.strike;
      setResult({
        won,
        amount: won ? position.stake * (100 / position.cost) - position.stake : -position.stake,
      });
      setPosition(null);
    }, 250);
    return () => clearInterval(iv);
  }, [position]);

  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => setResult(null), 4000);
    return () => clearTimeout(t);
  }, [result]);

  // ————————————————————————————————————— magic keys: P settings · X back
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'p') {
        setShowSettings((s) => !s);
        setSide(null);
      } else if (k === 'x' || k === 'escape') {
        setShowSettings(false);
        setSide(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submit = useCallback(() => {
    const p = priceRef.current;
    if (!side || p === null || stake <= 0) return;
    setPosition({
      side,
      strike: p,
      stake,
      cost: side === 'up' ? upCents : 100 - upCents,
      expiresAt: Date.now() + horizon * 1000,
    });
    setSecondsLeft(horizon);
    setResult(null);
    setSide(null);
  }, [side, stake, upCents, horizon]);

  const dirColor = dir > 0 ? GREEN : dir < 0 ? RED : '#e6e9e7';
  const dec = FEEDS[asset].dec;
  const sideCents = side === 'up' ? upCents : 100 - upCents;
  const toWin = stake * (100 / Math.max(1, sideCents));
  const panelOpen = side !== null || showSettings;

  return (
    <div
      className="fixed inset-0 flex flex-col items-center overflow-hidden select-none"
      style={{
        background: 'radial-gradient(120% 90% at 50% 0%, #101211 0%, #0a0a0a 55%, #070808 100%)',
      }}
    >
      {/* header */}
      <div className="w-full flex items-center justify-between px-5 py-4">
        <div className="mono text-[11px] tracking-[0.25em]" style={{ color: MUTED }}>
          <span style={{ color: GREEN }}>■</span>&nbsp; PNL — TERMINAL
        </div>
        <div className="mono text-[11px] tracking-widest flex items-center gap-2" style={{ color: MUTED }}>
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{
              background: connected ? GREEN : FAINT,
              boxShadow: connected ? `0 0 6px ${GREEN}` : 'none',
              animation: connected ? 'pnl-pulse 2s ease-in-out infinite' : 'none',
            }}
          />
          {connected ? 'LIVE · ONCHAIN · PYTH' : 'CONNECTING…'}
        </div>
      </div>

      {/* stage — the moving point */}
      <div ref={stageRef} className="relative w-full max-w-md flex-1 min-h-[180px] max-h-[340px]">
        {band && (
          <>
            <div className="absolute inset-x-16 top-[10px] border-t" style={{ borderColor: '#1c1f1d' }}>
              <span className="mono absolute right-0 -top-2 text-[10px]" style={{ color: FAINT }}>
                {fmt(band.hi, dec)}
              </span>
            </div>
            <div
              className="absolute inset-x-16 top-1/2 border-t border-dashed"
              style={{ borderColor: '#1c1f1d', opacity: 0.6 }}
            />
            <div className="absolute inset-x-16 bottom-[10px] border-b" style={{ borderColor: '#1c1f1d' }}>
              <span className="mono absolute right-0 -bottom-2 text-[10px]" style={{ color: FAINT }}>
                {fmt(band.lo, dec)}
              </span>
            </div>
          </>
        )}
        <div
          ref={ballRef}
          className="absolute left-1/2 top-0 w-3 h-3 rounded-full"
          style={{
            background: dirColor,
            boxShadow: `0 0 14px ${dirColor}, 0 0 44px ${dirColor}66`,
            opacity: price === null ? 0 : 1,
            transition: 'background .25s, box-shadow .25s, opacity .4s',
          }}
        />
      </div>

      {/* price */}
      <div className="flex flex-col items-center gap-1 pb-8 pt-2">
        <div className="mono text-[11px] tracking-[0.3em]" style={{ color: MUTED }}>
          {asset} · {FEEDS[asset].name.toUpperCase()}
        </div>
        <div
          className="mono text-5xl sm:text-6xl font-medium tabular-nums"
          style={{ color: dirColor, textShadow: `0 0 30px ${dirColor}33`, transition: 'color .25s' }}
        >
          {price === null ? '——' : <Odometer text={`$${fmt(price, dec)}`} />}
        </div>
        {delta && (
          <div className="mono text-xs tabular-nums" style={{ color: delta.abs >= 0 ? GREEN : RED }}>
            {delta.abs >= 0 ? '+' : '−'}${fmt(Math.abs(delta.abs), dec)} · {delta.abs >= 0 ? '+' : '−'}
            {Math.abs(delta.pct).toFixed(3)}% <span style={{ color: FAINT }}>· 60s</span>
          </div>
        )}
      </div>

      {/* prediction — two arrows */}
      <div className="flex flex-col items-center gap-3 pb-10">
        <div className="mono text-[11px] tracking-[0.25em]" style={{ color: MUTED }}>
          {asset} HIGHER IN {horizon >= 60 ? `${horizon / 60}M` : `${horizon}S`}?
        </div>
        <div className="flex items-center gap-6">
          {(['up', 'down'] as const).map((s) => {
            const c = s === 'up' ? GREEN : RED;
            const cents = s === 'up' ? upCents : 100 - upCents;
            return (
              <button
                key={s}
                onClick={() => {
                  setSide(s);
                  setShowSettings(false);
                }}
                disabled={!!position || price === null}
                className="group flex flex-col items-center gap-1.5 disabled:opacity-30 outline-none"
              >
                <span
                  className="flex items-center justify-center w-16 h-16 rounded-full border text-2xl transition-all duration-200 group-hover:scale-105"
                  style={{
                    borderColor: `${c}55`,
                    color: c,
                    background: `${c}0d`,
                    boxShadow: side === s ? `0 0 18px ${c}44` : 'none',
                  }}
                >
                  {s === 'up' ? '▲' : '▼'}
                </span>
                <span className="mono text-[11px] tabular-nums" style={{ color: MUTED }}>
                  {cents}¢
                </span>
              </button>
            );
          })}
        </div>

        {/* active ticket / result */}
        <div className="h-9 flex items-center">
          <AnimatePresence mode="wait">
            {position && (
              <motion.div
                key="pos"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mono text-xs px-4 py-1.5 rounded-full border tabular-nums"
                style={{
                  borderColor: PANEL_BORDER,
                  background: PANEL_BG,
                  color: position.side === 'up' ? GREEN : RED,
                }}
              >
                {position.side === 'up' ? '▲' : '▼'} ${position.stake} @ ${fmt(position.strike)}
                <span style={{ color: MUTED }}> · {secondsLeft}s</span>
                {price !== null && (
                  <span
                    style={{
                      color: (position.side === 'up' ? price > position.strike : price < position.strike)
                        ? GREEN
                        : RED,
                    }}
                  >
                    {' '}
                    ●
                  </span>
                )}
              </motion.div>
            )}
            {result && (
              <motion.div
                key="res"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="mono text-sm px-5 py-1.5 rounded-full tabular-nums"
                style={{
                  color: result.won ? '#04120c' : '#fff',
                  background: result.won ? GREEN : `${RED}cc`,
                  boxShadow: `0 0 24px ${result.won ? GREEN : RED}55`,
                }}
              >
                {result.won ? `WON +$${fmt(result.amount)}` : `LOST −$${fmt(Math.abs(result.amount))}`}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* footer hint */}
      <div className="absolute bottom-3 right-4 mono text-[10px] tracking-widest" style={{ color: FAINT }}>
        P — SETTINGS
      </div>
      <div className="absolute bottom-3 left-4 mono text-[10px] tracking-widest" style={{ color: FAINT }}>
        CONCEPT · SIMULATED
      </div>

      {/* side panel — ticket */}
      <AnimatePresence>
        {side && (
          <SidePanel onClose={() => setSide(null)}>
            <div className="flex items-center justify-between mb-6">
              <span className="mono text-[11px] tracking-[0.25em]" style={{ color: MUTED }}>
                {asset} · {side === 'up' ? 'HIGHER' : 'LOWER'}
              </span>
              <CloseX onClick={() => setSide(null)} />
            </div>

            <div
              className="mono text-sm mb-1 px-3 py-2 rounded-lg inline-block tabular-nums"
              style={{
                color: side === 'up' ? '#04120c' : '#fff',
                background: side === 'up' ? GREEN : RED,
              }}
            >
              {side === 'up' ? '▲ HIGHER' : '▼ LOWER'} {sideCents}¢
            </div>
            <div className="mono text-xs mb-6 tabular-nums" style={{ color: MUTED }}>
              from ${price !== null ? fmt(price) : '—'} · resolves in{' '}
              {horizon >= 60 ? `${horizon / 60}m` : `${horizon}s`}
            </div>

            <label className="mono text-[10px] tracking-[0.25em] block mb-2" style={{ color: MUTED }}>
              STAKE
            </label>
            <div className="flex items-center gap-2 mb-6">
              <div
                className="mono flex items-center rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: PANEL_BORDER, background: '#0a0c0b' }}
              >
                <span style={{ color: MUTED }}>$</span>
                <input
                  type="number"
                  min={1}
                  value={stake}
                  onChange={(e) => setStake(Math.max(0, Number(e.target.value)))}
                  className="w-16 bg-transparent outline-none text-white ml-1 tabular-nums"
                />
              </div>
              {STAKES.map((v) => (
                <Chip key={v} active={stake === v} onClick={() => setStake(v)}>
                  {v}
                </Chip>
              ))}
            </div>

            <div className="mono text-xs mb-6 tabular-nums" style={{ color: MUTED }}>
              TO WIN <span style={{ color: GREEN }}>${fmt(toWin)}</span>
            </div>

            <button
              onClick={submit}
              disabled={price === null || stake <= 0}
              className="mono w-full py-3 rounded-full text-sm tracking-[0.2em] transition-opacity disabled:opacity-40 hover:opacity-90"
              style={{ background: GOLD, color: '#141204' }}
            >
              ⚡ SUBMIT
            </button>
            <div className="mono text-[10px] mt-4 text-center tracking-widest" style={{ color: FAINT }}>
              CONCEPT — NO REAL ORDER
            </div>
          </SidePanel>
        )}

        {/* side panel — settings (magic word: P) */}
        {showSettings && (
          <SidePanel onClose={() => setShowSettings(false)}>
            <div className="flex items-center justify-between mb-6">
              <span className="mono text-[11px] tracking-[0.25em]" style={{ color: MUTED }}>
                SETTINGS
              </span>
              <CloseX onClick={() => setShowSettings(false)} />
            </div>

            <label className="mono text-[10px] tracking-[0.25em] block mb-2" style={{ color: MUTED }}>
              ASSET
            </label>
            <div className="flex gap-2 mb-6">
              {Object.keys(FEEDS).map((k) => (
                <Chip key={k} active={asset === k} onClick={() => setAsset(k as keyof typeof FEEDS)}>
                  {k}
                </Chip>
              ))}
            </div>

            <label className="mono text-[10px] tracking-[0.25em] block mb-2" style={{ color: MUTED }}>
              HORIZON
            </label>
            <div className="flex gap-2 mb-6">
              {HORIZONS.map((h) => (
                <Chip key={h.seconds} active={horizon === h.seconds} onClick={() => setHorizon(h.seconds)}>
                  {h.label}
                </Chip>
              ))}
            </div>

            <label className="mono text-[10px] tracking-[0.25em] block mb-2" style={{ color: MUTED }}>
              DEFAULT STAKE
            </label>
            <div className="flex gap-2 mb-8">
              {STAKES.map((v) => (
                <Chip key={v} active={stake === v} onClick={() => setStake(v)}>
                  ${v}
                </Chip>
              ))}
            </div>

            <div className="mono text-[10px] leading-relaxed tracking-widest" style={{ color: FAINT }}>
              PRESS P OR X TO RETURN
              <br />
              REALTIME ONCHAIN FEED · PYTH
            </div>
          </SidePanel>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pnl-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        /* hide number-input spinners — they break the minimal look */
        input[type='number']::-webkit-outer-spin-button,
        input[type='number']::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type='number'] {
          -moz-appearance: textfield;
        }
        /* odometer price — digit strips roll to their value on every tick */
        .odo { display: inline-flex; line-height: 1; }
        .odo-col { display: inline-block; height: 1em; overflow: hidden; }
        .odo-strip {
          display: flex;
          flex-direction: column;
          transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
          will-change: transform;
        }
        .odo-digit { display: block; height: 1em; line-height: 1; }
      `}</style>
    </div>
  );
}

// ————————————————————————————————————————————— small shared pieces

/** Odometer readout: each digit is a 0-9 strip that rolls to its value, so
 *  every tick visibly spins the digits that changed. Non-digits ($ . ,) stay
 *  put. Positions are stable per asset because fmt() pads to fixed decimals. */
function Odometer({ text }: { text: string }) {
  return (
    <span className="odo">
      {text.split('').map((ch, i) =>
        /\d/.test(ch) ? (
          <span key={i} className="odo-col">
            <span className="odo-strip" style={{ transform: `translateY(-${Number(ch)}em)` }}>
              {'0123456789'.split('').map((d) => (
                <span key={d} className="odo-digit">
                  {d}
                </span>
              ))}
            </span>
          </span>
        ) : (
          <span key={i}>{ch}</span>
        ),
      )}
    </span>
  );
}

function SidePanel({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <motion.div
        className="fixed inset-0"
        style={{ background: '#00000066' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.aside
        className="fixed inset-y-0 right-0 w-[340px] max-w-[90vw] p-6 border-l"
        style={{ background: PANEL_BG, borderColor: PANEL_BORDER }}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.aside>
    </>
  );
}

function CloseX({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="close"
      className="mono w-7 h-7 rounded-full border text-xs transition-colors hover:text-white"
      style={{ borderColor: PANEL_BORDER, color: MUTED }}
    >
      ×
    </button>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="mono px-3 py-1.5 rounded-full border text-xs transition-colors"
      style={{
        borderColor: active ? GREEN : PANEL_BORDER,
        color: active ? GREEN : MUTED,
        background: active ? `${GREEN}0d` : 'transparent',
      }}
    >
      {children}
    </button>
  );
}
