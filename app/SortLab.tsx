"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ALGORITHMS, CATEGORY_LABELS, type Algorithm, type AlgorithmCategory } from "@/lib/algorithms";
import { buildPianoSweep, getCompletionSweepTiming } from "@/lib/completion";
import { ALGORITHM_EXPLANATIONS } from "@/lib/explanations";
import { buildSortOperations, type SortOperation } from "@/lib/sorts";

type RunStatus = "idle" | "running" | "paused" | "done";
type Filter = "all" | AlgorithmCategory;

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function shuffledValues(size: number, random: () => number = Math.random) {
  const values = Array.from({ length: size }, (_, index) => index + 1);
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

function initialValues(size: number) {
  let seed = (0x9e3779b9 ^ size) >>> 0;
  return shuffledValues(size, () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  });
}

function normalizeCountForAlgorithm(value: number, algorithm: Algorithm) {
  if (algorithm.allowedN?.length) {
    return algorithm.allowedN.reduce((nearest, option) => (
      Math.abs(option - value) < Math.abs(nearest - value) ? option : nearest
    ));
  }
  const maximum = algorithm.maxN ?? 160;
  const minimum = Math.min(8, maximum);
  return Math.max(minimum, Math.min(maximum, value));
}

function CharacterIcon({ algorithm, size = "small" }: { algorithm: Algorithm; size?: "small" | "large" }) {
  const isOriginalRoster = algorithm.icon < 20;
  const localIcon = isOriginalRoster ? algorithm.icon : algorithm.icon - 20;
  const columns = isOriginalRoster ? 5 : 3;
  const rows = isOriginalRoster ? 4 : 2;
  const column = localIcon % columns;
  const row = Math.floor(localIcon / columns);
  return (
    <span
      aria-hidden="true"
      className={`character-icon character-icon--${size}`}
      style={{
        backgroundImage: `url(${BASE_PATH}/${isOriginalRoster ? "sort-characters.webp" : "sort-characters-new.webp"})`,
        backgroundPosition: `${column * (100 / (columns - 1))}% ${row * (100 / (rows - 1))}%`,
        backgroundSize: `${columns * 100}% ${rows * 100}%`,
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

function strikePianoKey(
  context: AudioContext,
  frequency: number,
  start: number,
  output: AudioNode,
  volume = 0.017,
  duration = 0.72,
) {
  const partials = [
    { ratio: 1, level: 1, decay: 1 },
    { ratio: 2.002, level: 0.3, decay: 0.68 },
    { ratio: 3.997, level: 0.1, decay: 0.42 },
  ];

  partials.forEach(({ ratio, level, decay }) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const pitch = frequency * ratio;
    const end = start + duration * decay;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(pitch * 1.004, start);
    oscillator.frequency.exponentialRampToValueAtTime(pitch, start + 0.012);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume * level, start + 0.003);
    gain.gain.exponentialRampToValueAtTime(volume * level * 0.42, start + 0.055);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(gain).connect(output);
    oscillator.start(start);
    oscillator.stop(end + 0.03);
  });
}

export default function SortLab() {
  const [selectedId, setSelectedId] = useState("quick");
  const [filter, setFilter] = useState<Filter>("all");
  const [count, setCount] = useState(48);
  const [speed, setSpeed] = useState(76);
  const [sound, setSound] = useState(true);
  const [values, setValues] = useState(() => initialValues(48));
  const [status, setStatus] = useState<RunStatus>("idle");
  const [active, setActive] = useState<number[]>([]);
  const [activeType, setActiveType] = useState<SortOperation["type"] | null>(null);
  const [cursor, setCursor] = useState(0);
  const [operationCount, setOperationCount] = useState(0);
  const [metrics, setMetrics] = useState({ comparisons: 0, moves: 0 });
  const [elapsed, setElapsed] = useState(0);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const algorithm = ALGORITHMS.find((item) => item.id === selectedId) ?? ALGORITHMS[0];
  const explanation = ALGORITHM_EXPLANATIONS[algorithm.id];
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
  const completionAudioRef = useRef<{
    output: GainNode;
    disconnectTimer: ReturnType<typeof setTimeout>;
  } | null>(null);

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

  const cancelCompletionSweep = useCallback(() => {
    const current = completionAudioRef.current;
    if (!current) return;
    clearTimeout(current.disconnectTimer);
    current.output.disconnect();
    completionAudioRef.current = null;
  }, []);

  const playCompletionSweep = useCallback((size: number) => {
    cancelCompletionSweep();
    if (!soundRef.current) return;
    const context = getAudioContext();
    if (!context) return;
    const notes = buildPianoSweep(size);
    const { durationMs } = getCompletionSweepTiming(size);
    const output = context.createGain();
    const start = context.currentTime + 0.035;
    output.gain.setValueAtTime(0.86, start);
    output.connect(context.destination);

    notes.forEach((note, index) => {
      const isLast = index === notes.length - 1;
      strikePianoKey(
        context,
        note.frequency,
        start + note.delayMs / 1000,
        output,
        isLast ? 0.023 : 0.016,
        isLast ? 1.18 : 0.72,
      );
    });

    const releaseAt = start + durationMs / 1000;
    output.gain.setValueAtTime(0.86, releaseAt);
    output.gain.exponentialRampToValueAtTime(0.0001, releaseAt + 0.72);
    const disconnectTimer = setTimeout(() => {
      output.disconnect();
      if (completionAudioRef.current?.output === output) completionAudioRef.current = null;
    }, durationMs + 900);
    completionAudioRef.current = { output, disconnectTimer };
  }, [cancelCompletionSweep, getAudioContext]);

  const finishRun = useCallback(() => {
    cancelTimer();
    setActive([]);
    setActiveType(null);
    setElapsed(Math.max(0, performance.now() - startedAtRef.current));
    setRunStatus("done");
    playCompletionSweep(valuesRef.current.length);
  }, [cancelTimer, playCompletionSweep, setRunStatus]);

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
    } else if (operation.type === "write") {
      next[operation.index] = operation.value;
      setActive([operation.index]);
      toneValue = operation.value;
      setMetrics((current) => ({ ...current, moves: current.moves + 1 }));
    } else {
      next.splice(0, next.length, ...operation.values);
      setActive(next.map((_, index) => index));
      toneValue = next[Math.floor(next.length / 2)] ?? 1;
      setMetrics((current) => ({
        comparisons: current.comparisons + operation.comparisons,
        moves: current.moves + next.length,
      }));
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

  useEffect(() => () => {
    cancelTimer();
    cancelCompletionSweep();
  }, [cancelCompletionSweep, cancelTimer]);

  const prepare = useCallback((source: number[]) => {
    cancelCompletionSweep();
    const operations = buildSortOperations(algorithm.id, source);
    operationsRef.current = operations;
    setOperationCount(operations.length);
    cursorRef.current = 0;
    setCursor(0);
    setMetrics({ comparisons: 0, moves: 0 });
    setElapsed(0);
    setActive([]);
    setActiveType(null);
    startedAtRef.current = performance.now();
  }, [algorithm.id, cancelCompletionSweep]);

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
    cancelCompletionSweep();
    const next = [...initialRef.current];
    valuesRef.current = next;
    setValues(next);
    operationsRef.current = [];
    setOperationCount(0);
    cursorRef.current = 0;
    setCursor(0);
    setMetrics({ comparisons: 0, moves: 0 });
    setElapsed(0);
    setActive([]);
    setActiveType(null);
    setRunStatus("idle");
  }, [cancelCompletionSweep, cancelTimer, setRunStatus]);

  const shuffle = useCallback((size = count) => {
    cancelTimer();
    cancelCompletionSweep();
    const next = shuffledValues(size);
    initialRef.current = next;
    valuesRef.current = next;
    setValues(next);
    operationsRef.current = [];
    setOperationCount(0);
    cursorRef.current = 0;
    setCursor(0);
    setMetrics({ comparisons: 0, moves: 0 });
    setElapsed(0);
    setActive([]);
    setActiveType(null);
    setRunStatus("idle");
  }, [cancelCompletionSweep, cancelTimer, count, setRunStatus]);

  const changeCount = (nextCount: number) => {
    const normalized = normalizeCountForAlgorithm(nextCount, algorithm);
    if (normalized === count) return;
    setCount(normalized);
    shuffle(normalized);
  };

  const chooseAlgorithm = (next: Algorithm) => {
    if (next.id === algorithm.id) return;
    cancelTimer();
    setIsDetailsOpen(false);
    setSelectedId(next.id);
    const nextCount = normalizeCountForAlgorithm(count, next);
    if (nextCount !== count) {
      setCount(nextCount);
      shuffle(nextCount);
    } else {
      resetToInitial();
    }
  };

  const totalOperations = operationCount;
  const progress = totalOperations ? Math.min(100, (cursor / totalOperations) * 100) : 0;
  const maxValue = Math.max(...values, 1);
  const statusLabel = status === "running" ? "ソート中" : status === "paused" ? "一時停止" : status === "done" ? "完了" : "準備OK";
  const allowedCounts = algorithm.allowedN;
  const currentMax = allowedCounts?.at(-1) ?? algorithm.maxN ?? 160;
  const currentMin = allowedCounts?.[0] ?? Math.min(8, currentMax);
  const countSliderValue = allowedCounts ? Math.max(0, allowedCounts.indexOf(count)) : count;
  const completionTiming = getCompletionSweepTiming(count);

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="SortLand トップへ">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <span><strong>SORTLAND</strong><small>ALGORITHM PLAYGROUND</small></span>
        </a>
        <div className="topbar-copy">
          <span className="live-dot" />
          26組のソートキャラクターと、並び替えを観察しよう
        </div>
        <a className="github-link" href="https://github.com/kyoujyu88/SortLand" target="_blank" rel="noreferrer" aria-label="SortLandのGitHubリポジトリを開く">
          <span aria-hidden="true">↗</span> GitHub Pages Ready
        </a>
      </header>

      <div className="workspace" id="top">
        <aside className="algorithm-panel" aria-label="ソートアルゴリズム一覧">
          <div className="panel-heading">
            <div><span className="eyebrow">CHARACTER SELECT</span><h2>ソートキャラクターズ</h2></div>
            <span className="count-badge">{ALGORITHMS.length}</span>
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

            <div
              className={`bar-stage ${status === "done" ? "is-complete" : ""}`}
              style={{
                "--finish-step": `${completionTiming.stepMs}ms`,
                "--finish-pulse": `${completionTiming.pulseMs}ms`,
              } as React.CSSProperties}
            >
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
                <input
                  type="range"
                  min={allowedCounts ? 0 : currentMin}
                  max={allowedCounts ? allowedCounts.length - 1 : currentMax}
                  step="1"
                  value={countSliderValue}
                  onChange={(event) => {
                    const sliderValue = Number(event.target.value);
                    changeCount(allowedCounts?.[sliderValue] ?? sliderValue);
                  }}
                  disabled={status === "running"}
                />
                <small><span>{currentMin}</span><span>{currentMax}</span></small>
              </label>
              <label className="range-control">
                <span><b>スピード</b><output>{speed}</output></span>
                <input type="range" min="1" max="100" step="1" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} />
                <small><span>SLOW</span><span>FAST</span></small>
              </label>
              <button
                className={`sound-toggle ${sound ? "is-on" : ""}`}
                onClick={() => setSound((value) => {
                  const next = !value;
                  soundRef.current = next;
                  if (!next) cancelCompletionSweep();
                  return next;
                })}
                aria-pressed={sound}
              >
                <span className="sound-icon" aria-hidden="true">{sound ? "♪" : "×"}</span>
                <span><b>サウンド</b><small>{sound ? "ON・操作音＋ピアノの完了演出" : "OFF・ミュート中"}</small></span>
                <i />
              </button>
            </div>
          </section>

          <section className="learning-grid">
            <article className="info-card">
              <span className="eyebrow">HOW THEY SORT</span>
              <h2>{algorithm.character}の作戦</h2>
              <p>{algorithm.how}</p>
              <button
                className="details-toggle"
                type="button"
                aria-expanded={isDetailsOpen}
                aria-controls={`algorithm-details-${algorithm.id}`}
                onClick={() => setIsDetailsOpen((value) => !value)}
              >
                <span>{isDetailsOpen ? "詳しい解説を閉じる" : "詳しい解説を見る"}</span>
                <i aria-hidden="true">{isDetailsOpen ? "−" : "+"}</i>
              </button>
            </article>
            <article className="complexity-card">
              <span className="eyebrow">PERFORMANCE</span>
              <div className="complexity-table"><span>平均時間<strong>{algorithm.average}</strong></span><span>最悪時間<strong>{algorithm.worst}</strong></span><span>追加領域<strong>{algorithm.memory}</strong></span></div>
            </article>
          </section>

          {isDetailsOpen && (
            <section
              className="detail-panel"
              id={`algorithm-details-${algorithm.id}`}
              key={algorithm.id}
              aria-label={`${algorithm.name}の詳しい解説`}
              style={{ "--detail-accent": algorithm.accent } as React.CSSProperties}
            >
              <header className="detail-panel__header">
                <div>
                  <span className="eyebrow">DEEP DIVE</span>
                  <h2>{algorithm.name}を、もう少し詳しく</h2>
                </div>
                <span className="detail-panel__number">No.{String(algorithm.icon + 1).padStart(2, "0")}</span>
              </header>
              <p className="detail-panel__overview">{explanation.overview}</p>
              <div className="detail-panel__body">
                <article className="detail-steps">
                  <h3>処理の流れ</h3>
                  <ol>
                    {explanation.steps.map((step, index) => (
                      <li key={step}><span>{index + 1}</span><p>{step}</p></li>
                    ))}
                  </ol>
                </article>
                <div className="detail-insights">
                  <article>
                    <span>WATCH</span>
                    <h3>観察ポイント</h3>
                    <p>{explanation.watch}</p>
                  </article>
                  <article>
                    <span>GOOD AT</span>
                    <h3>向いている場面</h3>
                    <p>{explanation.goodFor}</p>
                  </article>
                  <article className="detail-insight--caution">
                    <span>CAUTION</span>
                    <h3>注意したいこと</h3>
                    <p>{explanation.caution}</p>
                  </article>
                </div>
              </div>
            </section>
          )}
        </section>
      </div>

      <footer><span>SORTLAND</span><p>目で見て、耳で聴いて、アルゴリズムを好きになる。</p><small>26 ALGORITHMS · 100% STATIC · GITHUB PAGES</small></footer>
    </main>
  );
}
