"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ALGORITHMS, CATEGORY_LABELS, type Algorithm, type AlgorithmCategory } from "@/lib/algorithms";
import { buildSortOperations, type SortOperation } from "@/lib/sorts";

type RunStatus = "idle" | "running" | "paused" | "done";
type Filter = "all" | AlgorithmCategory;

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function shuffledValues(size: number) {
  const values = Array.from({ length: size }, (_, index) => index + 1);
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

function CharacterIcon({ algorithm, size = "small" }: { algorithm: Algorithm; size?: "small" | "large" }) {
  const column = algorithm.icon % 5;
  const row = Math.floor(algorithm.icon / 5);
  return (
    <span
      aria-hidden="true"
      className={`character-icon character-icon--${size}`}
      style={{
        backgroundImage: `url(${BASE_PATH}/sort-characters.webp)`,
        backgroundPosition: `${column * 25}% ${row * (100 / 3)}%`,
      }}
    />
  );
}

function Metric({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {unit && <small>{unit}</small>}
    </div>
  );
}

function strikeSteelPan(
  context: AudioContext,
  frequency: number,
  start: number,
  volume = 0.024,
  duration = 0.34,
  extraOutputs: AudioNode[] = [],
) {
  const partials = [
    { ratio: 1, level: 1, decay: 1 },
    { ratio: 2.01, level: 0.38, decay: 0.72 },
    { ratio: 3.98, level: 0.14, decay: 0.46 },
  ];

  partials.forEach(({ ratio, level, decay }) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const pitch = frequency * ratio;
    const end = start + duration * decay;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(pitch * 1.012, start);
    oscillator.frequency.exponentialRampToValueAtTime(pitch, start + 0.018);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume * level, start + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(gain);
    gain.connect(context.destination);
    extraOutputs.forEach((output) => gain.connect(output));
    oscillator.start(start);
    oscillator.stop(end + 0.025);
  });
}

export default function SortLab() {
  const [selectedId, setSelectedId] = useState("quick");
  const [filter, setFilter] = useState<Filter>("all");
  const [count, setCount] = useState(48);
  const [speed, setSpeed] = useState(76);
  const [sound, setSound] = useState(true);
  const [values, setValues] = useState(() => shuffledValues(48));
  const [status, setStatus] = useState<RunStatus>("idle");
  const [active, setActive] = useState<number[]>([]);
  const [activeType, setActiveType] = useState<SortOperation["type"] | null>(null);
  const [cursor, setCursor] = useState(0);
  const [metrics, setMetrics] = useState({ comparisons: 0, moves: 0 });
  const [elapsed, setElapsed] = useState(0);

  const algorithm = ALGORITHMS.find((item) => item.id === selectedId) ?? ALGORITHMS[0];
  const filteredAlgorithms = useMemo(
    () => ALGORITHMS.filter((item) => filter === "all" || item.category === filter),
    [filter],
  );

  const valuesRef = useRef(values);
  const initialRef = useRef(values);
  const operationsRef = useRef<SortOperation[]>([]);
  const cursorRef = useRef(0);
  const statusRef = useRef<RunStatus>("idle");
  const speedRef = useRef(speed);
  const soundRef = useRef(sound);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runStepRef = useRef<() => void>(() => undefined);
  const startedAtRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);
  const lastToneRef = useRef(0);

  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { soundRef.current = sound; }, [sound]);

  const setRunStatus = useCallback((next: RunStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const cancelTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const getAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    const AudioContextClass = window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    const context = audioRef.current ?? new AudioContextClass();
    audioRef.current = context;
    if (context.state === "suspended") void context.resume();
    return context;
  }, []);

  const playTone = useCallback((value: number) => {
    if (!soundRef.current) return;
    const nowMs = performance.now();
    if (nowMs - lastToneRef.current < 38) return;
    lastToneRef.current = nowMs;
    const context = getAudioContext();
    if (!context) return;
    const pentatonic = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
    const noteIndex = Math.min(
      pentatonic.length - 1,
      Math.floor(((value - 1) / Math.max(1, count - 1)) * pentatonic.length),
    );
    const frequency = 293.66 * 2 ** (pentatonic[noteIndex] / 12);
    strikeSteelPan(context, frequency, context.currentTime);
  }, [count, getAudioContext]);

  const playCompletionChime = useCallback(() => {
    if (!soundRef.current) return;
    const context = getAudioContext();
    if (!context) return;
    const now = context.currentTime;
    const delay = context.createDelay();
    const echo = context.createGain();
    delay.delayTime.value = 0.18;
    echo.gain.value = 0.14;
    delay.connect(echo).connect(context.destination);
    const notes = [587.33, 739.99, 880, 1174.66, 1318.51];
    notes.forEach((frequency, index) => {
      strikeSteelPan(
        context,
        frequency,
        now + index * 0.11,
        index === notes.length - 1 ? 0.045 : 0.034,
        0.82,
        [delay],
      );
    });
  }, [getAudioContext]);

  const finishRun = useCallback(() => {
    cancelTimer();
    setActive([]);
    setActiveType(null);
    setElapsed(Math.max(0, performance.now() - startedAtRef.current));
    setRunStatus("done");
    playCompletionChime();
  }, [cancelTimer, playCompletionChime, setRunStatus]);

  const applyOperation = useCallback((operation: SortOperation) => {
    const next = [...valuesRef.current];
    let toneValue = 1;
    if (operation.type === "compare") {
      setActive(operation.indices);
      toneValue = Math.max(next[operation.indices[0]] ?? 1, next[operation.indices[1]] ?? 1);
      setMetrics((current) => ({ ...current, comparisons: current.comparisons + 1 }));
    } else if (operation.type === "swap") {
      const [a, b] = operation.indices;
      [next[a], next[b]] = [next[b], next[a]];
      setActive(operation.indices);
      toneValue = Math.max(next[a] ?? 1, next[b] ?? 1);
      setMetrics((current) => ({ ...current, moves: current.moves + 1 }));
    } else {
      next[operation.index] = operation.value;
      setActive([operation.index]);
      toneValue = operation.value;
      setMetrics((current) => ({ ...current, moves: current.moves + 1 }));
    }
    setActiveType(operation.type);
    valuesRef.current = next;
    setValues(next);
    cursorRef.current += 1;
    setCursor(cursorRef.current);
    setElapsed(Math.max(0, performance.now() - startedAtRef.current));
    playTone(toneValue);
  }, [playTone]);

  useEffect(() => {
    runStepRef.current = () => {
      if (statusRef.current !== "running") return;
      const operation = operationsRef.current[cursorRef.current];
      if (!operation) {
        finishRun();
        return;
      }
      applyOperation(operation);
      const normalized = (101 - speedRef.current) / 100;
      const delay = Math.max(4, Math.round(230 * normalized * normalized));
      timeoutRef.current = setTimeout(() => runStepRef.current(), delay);
    };
  }, [applyOperation, finishRun]);

  useEffect(() => () => cancelTimer(), [cancelTimer]);

  const prepare = useCallback((source: number[]) => {
    operationsRef.current = buildSortOperations(algorithm.id, source);
    cursorRef.current = 0;
    setCursor(0);
    setMetrics({ comparisons: 0, moves: 0 });
    setElapsed(0);
    setActive([]);
    setActiveType(null);
    startedAtRef.current = performance.now();
  }, [algorithm.id]);

  const start = () => {
    if (statusRef.current === "paused") {
      startedAtRef.current = performance.now() - elapsed;
      setRunStatus("running");
      runStepRef.current();
      return;
    }
    if (statusRef.current === "running") return;
    const source = statusRef.current === "done" ? [...initialRef.current] : [...valuesRef.current];
    valuesRef.current = source;
    setValues(source);
    prepare(source);
    setRunStatus("running");
    runStepRef.current();
  };

  const pause = () => {
    if (statusRef.current !== "running") return;
    cancelTimer();
    setRunStatus("paused");
  };

  const step = () => {
    cancelTimer();
    if (statusRef.current === "idle" || statusRef.current === "done") {
      const source = statusRef.current === "done" ? [...initialRef.current] : [...valuesRef.current];
      valuesRef.current = source;
      setValues(source);
      prepare(source);
    }
    setRunStatus("paused");
    const operation = operationsRef.current[cursorRef.current];
    if (operation) applyOperation(operation);
    else finishRun();
  };

  const resetToInitial = useCallback(() => {
    cancelTimer();
    const next = [...initialRef.current];
    valuesRef.current = next;
    setValues(next);
    operationsRef.current = [];
    cursorRef.current = 0;
    setCursor(0);
    setMetrics({ comparisons: 0, moves: 0 });
    setElapsed(0);
    setActive([]);
    setActiveType(null);
    setRunStatus("idle");
  }, [cancelTimer, setRunStatus]);

  const shuffle = useCallback((size = count) => {
    cancelTimer();
    const next = shuffledValues(size);
    initialRef.current = next;
    valuesRef.current = next;
    setValues(next);
    operationsRef.current = [];
    cursorRef.current = 0;
    setCursor(0);
    setMetrics({ comparisons: 0, moves: 0 });
    setElapsed(0);
    setActive([]);
    setActiveType(null);
    setRunStatus("idle");
  }, [cancelTimer, count, setRunStatus]);

  const changeCount = (nextCount: number) => {
    setCount(nextCount);
    shuffle(nextCount);
  };

  const chooseAlgorithm = (next: Algorithm) => {
    if (next.id === algorithm.id) return;
    cancelTimer();
    setSelectedId(next.id);
    if (next.maxN && count > next.maxN) {
      setCount(next.maxN);
      shuffle(next.maxN);
    } else {
      resetToInitial();
    }
  };

  const totalOperations = operationsRef.current.length;
  const progress = totalOperations ? Math.min(100, (cursor / totalOperations) * 100) : 0;
  const maxValue = Math.max(...values, 1);
  const statusLabel = status === "running" ? "ソート中" : status === "paused" ? "一時停止" : status === "done" ? "完了" : "準備OK";
  const currentMax = algorithm.maxN ?? 160;

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="SortLand トップへ">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <span><strong>SORTLAND</strong><small>ALGORITHM PLAYGROUND</small></span>
        </a>
        <div className="topbar-copy">
          <span className="live-dot" />
          20人のソートガールズと、並び替えを観察しよう
        </div>
        <a className="github-link" href="https://github.com/kyoujyu88/SortLand" target="_blank" rel="noreferrer" aria-label="SortLandのGitHubリポジトリを開く">
          <span aria-hidden="true">↗</span> GitHub Pages Ready
        </a>
      </header>

      <div className="workspace" id="top">
        <aside className="algorithm-panel" aria-label="ソートアルゴリズム一覧">
          <div className="panel-heading">
            <div><span className="eyebrow">CHARACTER SELECT</span><h2>ソートガールズ</h2></div>
            <span className="count-badge">20</span>
          </div>
          <div className="filter-tabs" role="tablist" aria-label="カテゴリで絞り込み">
            {(Object.keys(CATEGORY_LABELS) as Filter[]).map((key) => (
              <button key={key} role="tab" aria-selected={filter === key} className={filter === key ? "is-active" : ""} onClick={() => setFilter(key)}>
                {CATEGORY_LABELS[key]}
              </button>
            ))}
          </div>
          <div className="character-grid">
            {filteredAlgorithms.map((item) => (
              <button
                className={`character-card ${item.id === algorithm.id ? "is-selected" : ""}`}
                style={{ "--card-accent": item.accent } as React.CSSProperties}
                key={item.id}
                onClick={() => chooseAlgorithm(item)}
                aria-pressed={item.id === algorithm.id}
                aria-label={`${item.name}を選択`}
              >
                <CharacterIcon algorithm={item} />
                <span className="character-card__copy"><strong>{item.name.replace("ソート", "")}</strong><small>{item.english}</small></span>
              </button>
            ))}
          </div>
        </aside>

        <section className="lab" aria-label={`${algorithm.name}の可視化`}>
          <div className="algorithm-hero" key={algorithm.id} style={{ "--accent": algorithm.accent } as React.CSSProperties}>
            <div className="hero-character"><CharacterIcon algorithm={algorithm} size="large" /><span className="character-level">No.{String(algorithm.icon + 1).padStart(2, "0")}</span></div>
            <div className="hero-copy">
              <div className="hero-kicker"><span>{algorithm.english}</span><i /> <span>{CATEGORY_LABELS[algorithm.category]}</span></div>
              <h1>{algorithm.name}</h1>
              <p className="tagline">{algorithm.tagline}</p>
              <p>{algorithm.description}</p>
              <div className="hero-badges">
                <span>平均 <b>{algorithm.average}</b></span>
                <span className={algorithm.stable ? "stable" : "unstable"}>{algorithm.stable ? "安定" : "不安定"}</span>
                {algorithm.maxN && <span>観察上限 n={algorithm.maxN}</span>}
              </div>
            </div>
            <div className="hero-status"><span className={`status-orb status-orb--${status}`} /><small>STATUS</small><strong>{statusLabel}</strong></div>
          </div>

          <section className="visualizer-card" aria-label="棒グラフのソート表示">
            <div className="visualizer-toolbar">
              <div className="metrics-row">
                <Metric label="要素数" value={count} unit="n" />
                <Metric label="比較" value={metrics.comparisons.toLocaleString("ja-JP")} />
                <Metric label="移動" value={metrics.moves.toLocaleString("ja-JP")} />
                <Metric label="経過" value={(elapsed / 1000).toFixed(2)} unit="秒" />
              </div>
              <div className="legend" aria-label="色の凡例"><span><i className="legend-normal" />未処理</span><span><i className="legend-compare" />比較</span><span><i className="legend-move" />交換・配置</span></div>
            </div>

            <div className={`bar-stage ${status === "done" ? "is-complete" : ""}`}>
              <div className="grid-lines" aria-hidden="true"><i /><i /><i /><i /></div>
              <div className="bars" aria-label={`${count}本の棒グラフ`}>
                {values.map((value, index) => {
                  const isActive = active.includes(index);
                  const activeClass = isActive ? `is-${activeType}` : "";
                  return (
                    <div className={`bar-wrap ${activeClass}`} key={index} style={{ width: `${100 / count}%` }}>
                      <div className="bar" style={{ height: `${(value / maxValue) * 100}%`, "--bar-index": index } as React.CSSProperties}>
                        {count <= 32 && <span>{value}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="stage-corner stage-corner--top" /><div className="stage-corner stage-corner--bottom" />
            </div>

            <div className="progress-track" aria-label={`進行度 ${Math.round(progress)}%`}><span style={{ width: `${progress}%`, background: algorithm.accent }} /></div>
          </section>

          <section className="control-deck" aria-label="ソート設定">
            <div className="primary-controls">
              {status === "running" ? (
                <button className="control-button control-button--primary" onClick={pause}><span>Ⅱ</span> 一時停止</button>
              ) : (
                <button className="control-button control-button--primary" onClick={start}><span>▶</span> {status === "paused" ? "再開" : status === "done" ? "もう一度" : "スタート"}</button>
              )}
              <button className="control-button" onClick={step} disabled={status === "running"}><span>▶│</span> 1ステップ</button>
              <button className="control-button control-button--icon" onClick={() => shuffle()} aria-label="棒をシャッフル"><span>⤨</span></button>
              <button className="control-button control-button--icon" onClick={resetToInitial} aria-label="最初の並びに戻す"><span>↺</span></button>
            </div>

            <div className="settings-grid">
              <label className="range-control">
                <span><b>要素数</b><output>{count}</output></span>
                <input type="range" min="8" max={currentMax} step="1" value={count} onChange={(event) => changeCount(Number(event.target.value))} disabled={status === "running"} />
                <small><span>8</span><span>{currentMax}</span></small>
              </label>
              <label className="range-control">
                <span><b>スピード</b><output>{speed}</output></span>
                <input type="range" min="1" max="100" step="1" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} />
                <small><span>SLOW</span><span>FAST</span></small>
              </label>
              <button className={`sound-toggle ${sound ? "is-on" : ""}`} onClick={() => setSound((value) => !value)} aria-pressed={sound}>
                <span className="sound-icon" aria-hidden="true">{sound ? "♪" : "×"}</span>
                <span><b>サウンド</b><small>{sound ? "ON・軽やかなスチールドラム" : "OFF・ミュート中"}</small></span>
                <i />
              </button>
            </div>
          </section>

          <section className="learning-grid">
            <article className="info-card">
              <span className="eyebrow">HOW SHE SORTS</span>
              <h2>{algorithm.character}の作戦</h2>
              <p>{algorithm.how}</p>
            </article>
            <article className="complexity-card">
              <span className="eyebrow">PERFORMANCE</span>
              <div className="complexity-table"><span>平均時間<strong>{algorithm.average}</strong></span><span>最悪時間<strong>{algorithm.worst}</strong></span><span>追加領域<strong>{algorithm.memory}</strong></span></div>
            </article>
          </section>
        </section>
      </div>

      <footer><span>SORTLAND</span><p>目で見て、耳で聴いて、アルゴリズムを好きになる。</p><small>20 ALGORITHMS · 100% STATIC · GITHUB PAGES</small></footer>
    </main>
  );
}
