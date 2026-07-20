"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ALGORITHMS, CATEGORY_LABELS, type Algorithm, type AlgorithmCategory } from "@/lib/algorithms";
import { buildPianoSweep, getCompletionSweepTiming } from "@/lib/completion";
import { ALGORITHM_EXPLANATIONS } from "@/lib/explanations";
import { buildSortOperations, type SortOperation } from "@/lib/sorts";
import { projectGraphOperation, type GraphValue } from "@/lib/visualization";

type RunStatus = "idle" | "running" | "paused" | "done";
type Filter = "all" | AlgorithmCategory;

type SortMetrics = {
  comparisons: number;
  moves: number;
  counts: number;
  distributions: number;
  collections: number;
  drops: number;
  levels: number;
};

type CountAuxiliary = {
  kind: "counts";
  title: string;
  labels: string[];
  counts: number[];
  output: Array<number | null>;
  activeBucket: number;
  phase: "count" | "collect";
};

type BucketAuxiliary = {
  kind: "buckets";
  title: string;
  labels: string[];
  buckets: number[][];
  output: Array<number | null>;
  activeBucket: number;
  phase: "distribute" | "collect";
};

type BeadAuxiliary = {
  kind: "beads";
  title: string;
  heights: number[];
  maxLevel: number;
  activeRow: number;
  level: number;
};

type SlotAuxiliary = {
  kind: "slots";
  title: string;
  slots: Array<number | null>;
  activeSlot: number;
};

type ChainAuxiliary = {
  kind: "chain";
  title: string;
  values: number[];
  activeValue: number;
  phase: "main" | "insert";
};

type MergeAuxiliary = {
  kind: "merge";
  title: string;
  left: number;
  right: number;
  leftValues: number[];
  rightValues: number[];
  output: Array<number | null>;
  consumedLeft: number;
  consumedRight: number;
  activeLeft: number | null;
  activeRight: number | null;
};

type AuxiliaryState = CountAuxiliary | BucketAuxiliary | BeadAuxiliary | SlotAuxiliary | ChainAuxiliary | MergeAuxiliary;

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const DEFAULT_MAX_N = 256;

// Bars must fill the stage without clipping at any element count, so the gap and
// minimum bar width shrink as the roster grows. Above these thresholds we also
// drop per-bar shadows/transitions to keep dense views crisp and smooth.
function graphDensity(count: number) {
  if (count > 200) return { tier: "ultra", gap: 0, minBar: 0 };
  if (count > 120) return { tier: "dense", gap: 1, minBar: 1 };
  if (count > 60) return { tier: "packed", gap: 2, minBar: 2 };
  return { tier: "roomy", gap: 3, minBar: 2 };
}

const ACTIVE_LEGEND_CATEGORY: Partial<Record<SortOperation["type"], string>> = {
  compare: "compare",
  mergeCompare: "compare",
  swap: "move",
  write: "move",
  shuffle: "move",
  slotWrite: "move",
  count: "auxiliary",
  distribute: "auxiliary",
  drop: "auxiliary",
  collect: "collect",
  mergeTake: "collect",
};

function createMetrics(): SortMetrics {
  return {
    comparisons: 0,
    moves: 0,
    counts: 0,
    distributions: 0,
    collections: 0,
    drops: 0,
    levels: 0,
  };
}

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
  const maximum = algorithm.maxN ?? DEFAULT_MAX_N;
  const minimum = Math.min(8, maximum);
  return Math.max(minimum, Math.min(maximum, value));
}

function CharacterIcon({ algorithm, size = "small" }: { algorithm: Algorithm; size?: "small" | "large" }) {
  return (
    <span
      aria-hidden="true"
      className={`character-icon character-icon--${size}`}
    >
      <Image
        alt=""
        decoding="async"
        height={768}
        loading={size === "large" ? "eager" : "lazy"}
        src={`${BASE_PATH}/characters/${algorithm.id}.webp`}
        width={768}
      />
    </span>
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

function AuxiliaryPanel({ state }: { state: AuxiliaryState }) {
  const isCollecting = (state.kind === "counts" || state.kind === "buckets") && state.phase === "collect";
  return (
    <section className={`auxiliary-panel auxiliary-panel--${state.kind}`} aria-label={state.title}>
      <header className="auxiliary-panel__header">
        <div><span>AUXILIARY WORKSPACE</span><strong>{state.title}</strong></div>
        <small>
          {state.kind === "counts"
            ? isCollecting ? "小さい値から回収中" : "出現回数を記録中"
            : state.kind === "buckets"
              ? isCollecting ? "バケットから回収中" : "対応する場所へ振り分け中"
              : state.kind === "beads"
                ? `レベル ${state.level} / ${state.maxLevel}`
                : state.kind === "slots"
                  ? "すき間を保ちながら挿入中"
                  : state.kind === "chain"
                    ? state.phase === "main" ? "ペアの勝者から主鎖を作成" : "敗者を二分探索で挿入"
                  : `区間 ${state.left + 1}〜${state.right + 1} を結合中`}
        </small>
      </header>

      {state.kind === "counts" && (
        <div className="auxiliary-scroll">
          <div className="count-cells">
            {state.labels.map((label, index) => (
              <div className={index === state.activeBucket ? "is-active" : ""} key={label}>
                <span>{label}</span><strong>{state.counts[index]}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.kind === "buckets" && (
        <div className="auxiliary-scroll">
          <div className="bucket-rack">
            {state.buckets.map((bucket, index) => (
              <div className={`bucket ${index === state.activeBucket ? "is-active" : ""}`} key={`${state.title}-${state.labels[index]}`}>
                <span>{state.labels[index]}</span>
                <div>{bucket.length ? bucket.map((value, itemIndex) => <i key={`${value}-${itemIndex}`}>{value}</i>) : <em>—</em>}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.kind === "beads" && (
        <div className="auxiliary-scroll">
          <div className="bead-rack">
            {state.heights.map((height, row) => (
              <div className={row === state.activeRow ? "is-active" : ""} key={row}>
                <span style={{ height: `${(height / Math.max(1, state.maxLevel)) * 100}%` }} />
                <small>{height || ""}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.kind === "slots" && (
        <div className="auxiliary-scroll">
          <div className="slot-shelf">
            {state.slots.map((value, index) => (
              <div
                className={`${index === state.activeSlot ? "is-active" : ""} ${value === null ? "is-empty" : ""}`}
                key={index}
              >
                <strong>{value ?? "·"}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.kind === "chain" && (
        <div className="main-chain">
          <span>MAIN CHAIN</span>
          <div>
            {state.values.map((value, index) => (
              <i className={value === state.activeValue ? "is-active" : ""} key={`${value}-${index}`}>
                {value}
              </i>
            ))}
          </div>
        </div>
      )}

      {state.kind === "merge" && (
        <div className="merge-buffers">
          <div>
            <span>LEFT BUFFER</span>
            <div>
              {state.leftValues.map((value, index) => (
                <i
                  className={`${index < state.consumedLeft ? "is-consumed" : ""} ${index === state.activeLeft ? "is-active" : ""}`}
                  key={`left-${index}`}
                >{value}</i>
              ))}
            </div>
          </div>
          <div>
            <span>RIGHT BUFFER</span>
            <div>
              {state.rightValues.map((value, index) => (
                <i
                  className={`${index < state.consumedRight ? "is-consumed" : ""} ${index === state.activeRight ? "is-active" : ""}`}
                  key={`right-${index}`}
                >{value}</i>
              ))}
            </div>
          </div>
        </div>
      )}

      {state.kind !== "beads" && state.kind !== "slots" && state.kind !== "chain" && (
        <div className="output-buffer">
          <span>OUTPUT</span>
          <div>
            {state.output.map((value, index) => (
              <i className={value === null ? "is-empty" : ""} key={index}>{value ?? "·"}</i>
            ))}
          </div>
        </div>
      )}
    </section>
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
  const [graphValues, setGraphValues] = useState<GraphValue[]>(() => initialValues(48));
  const [status, setStatus] = useState<RunStatus>("idle");
  const [active, setActive] = useState<number[]>([]);
  const [activeType, setActiveType] = useState<SortOperation["type"] | null>(null);
  const [cursor, setCursor] = useState(0);
  const [operationCount, setOperationCount] = useState(0);
  const [metrics, setMetrics] = useState<SortMetrics>(() => createMetrics());
  const [auxiliary, setAuxiliary] = useState<AuxiliaryState | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const algorithm = ALGORITHMS.find((item) => item.id === selectedId) ?? ALGORITHMS[0];
  const explanation = ALGORITHM_EXPLANATIONS[algorithm.id];
  const filteredAlgorithms = useMemo(
    () => ALGORITHMS.filter((item) => filter === "all" || item.category === filter),
    [filter],
  );

  const valuesRef = useRef(values);
  const graphValuesRef = useRef(graphValues);
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
    const graphNext = projectGraphOperation(graphValuesRef.current, operation);
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
    } else if (operation.type === "shuffle") {
      next.splice(0, next.length, ...operation.values);
      setActive(next.map((_, index) => index));
      toneValue = next[Math.floor(next.length / 2)] ?? 1;
      setMetrics((current) => ({
        ...current,
        comparisons: current.comparisons + operation.comparisons,
        moves: current.moves + next.length,
      }));
    } else if (operation.type === "count") {
      setActive([operation.index]);
      toneValue = operation.value;
      setMetrics((current) => ({ ...current, counts: current.counts + 1 }));
      setAuxiliary((current) => {
        const base: CountAuxiliary | null = operation.setup
          ? {
              kind: "counts",
              title: operation.setup.title,
              labels: operation.setup.labels,
              counts: new Array(operation.setup.labels.length).fill(0),
              output: new Array(operation.setup.outputSize).fill(null),
              activeBucket: operation.bucket,
              phase: "count",
            }
          : current?.kind === "counts" ? current : null;
        if (!base) return current;
        const counts = [...base.counts];
        counts[operation.bucket] = (counts[operation.bucket] ?? 0) + 1;
        return { ...base, counts, activeBucket: operation.bucket, phase: "count" };
      });
    } else if (operation.type === "distribute") {
      setActive([operation.index]);
      toneValue = operation.value;
      setMetrics((current) => ({ ...current, distributions: current.distributions + 1 }));
      setAuxiliary((current) => {
        const base: BucketAuxiliary | null = operation.setup
          ? {
              kind: "buckets",
              title: operation.setup.title,
              labels: operation.setup.labels,
              buckets: Array.from({ length: operation.setup.labels.length }, () => []),
              output: new Array(operation.setup.outputSize).fill(null),
              activeBucket: operation.bucket,
              phase: "distribute",
            }
          : current?.kind === "buckets" ? current : null;
        if (!base) return current;
        const buckets = base.buckets.map((bucket) => [...bucket]);
        buckets[operation.bucket].push(operation.value);
        return { ...base, buckets, activeBucket: operation.bucket, phase: "distribute" };
      });
    } else if (operation.type === "collect") {
      next[operation.index] = operation.value;
      setActive([operation.index]);
      toneValue = operation.value;
      setMetrics((current) => ({ ...current, collections: current.collections + 1 }));
      setAuxiliary((current) => {
        if (current?.kind === "counts") {
          const counts = [...current.counts];
          counts[operation.bucket] = Math.max(0, (counts[operation.bucket] ?? 0) - 1);
          const output = [...current.output];
          output[operation.index] = operation.value;
          return { ...current, counts, output, activeBucket: operation.bucket, phase: "collect" };
        }
        if (current?.kind === "buckets") {
          const buckets = current.buckets.map((bucket) => [...bucket]);
          const valueIndex = buckets[operation.bucket].indexOf(operation.value);
          if (valueIndex >= 0) buckets[operation.bucket].splice(valueIndex, 1);
          const output = [...current.output];
          output[operation.index] = operation.value;
          return { ...current, buckets, output, activeBucket: operation.bucket, phase: "collect" };
        }
        return current;
      });
    } else if (operation.type === "drop") {
      if (operation.setup) next.fill(0);
      next[operation.row] = operation.value;
      setActive([operation.row]);
      toneValue = operation.value;
      setMetrics((current) => ({
        ...current,
        drops: current.drops + 1,
        levels: Math.max(current.levels, operation.level),
      }));
      setAuxiliary((current) => {
        const base: BeadAuxiliary | null = operation.setup
          ? {
              kind: "beads",
              title: operation.setup.title,
              heights: new Array(operation.setup.rowCount).fill(0),
              maxLevel: operation.setup.maxLevel,
              activeRow: operation.row,
              level: operation.level,
            }
          : current?.kind === "beads" ? current : null;
        if (!base) return current;
        const heights = [...base.heights];
        heights[operation.row] = operation.value;
        return { ...base, heights, activeRow: operation.row, level: operation.level };
      });
    } else if (operation.type === "slotWrite") {
      setActive([]);
      toneValue = operation.value ?? 1;
      setMetrics((current) => ({ ...current, moves: current.moves + 1 }));
      setAuxiliary((current) => {
        const base: SlotAuxiliary | null = operation.setup
          ? {
              kind: "slots",
              title: operation.setup.title,
              slots: new Array(operation.setup.slotCount).fill(null),
              activeSlot: operation.slot,
            }
          : current?.kind === "slots" ? current : null;
        if (!base) return current;
        const slots = [...base.slots];
        slots[operation.slot] = operation.value;
        return { ...base, slots, activeSlot: operation.slot };
      });
    } else if (operation.type === "chainState") {
      setActive([]);
      toneValue = operation.activeValue;
      setMetrics((current) => ({ ...current, moves: current.moves + 1 }));
      setAuxiliary({
        kind: "chain",
        title: "ヤコブスタール順で主鎖へ挿入",
        values: operation.values,
        activeValue: operation.activeValue,
        phase: operation.phase,
      });
    } else if (operation.type === "mergeStart") {
      setActive([]);
      toneValue = operation.leftValues[0] ?? operation.rightValues[0] ?? 1;
      setAuxiliary({
        kind: "merge",
        title: "左右の一時配列をマージ",
        left: operation.left,
        right: operation.right,
        leftValues: operation.leftValues,
        rightValues: operation.rightValues,
        output: new Array(operation.right - operation.left + 1).fill(null),
        consumedLeft: 0,
        consumedRight: 0,
        activeLeft: null,
        activeRight: null,
      });
    } else if (operation.type === "mergeCompare") {
      setActive([]);
      toneValue = Math.max(operation.leftValue, operation.rightValue);
      setMetrics((current) => ({ ...current, comparisons: current.comparisons + 1 }));
      setAuxiliary((current) => current?.kind === "merge"
        ? { ...current, activeLeft: operation.leftIndex, activeRight: operation.rightIndex }
        : current);
    } else {
      next[operation.index] = operation.value;
      setActive([operation.index]);
      toneValue = operation.value;
      setMetrics((current) => ({ ...current, moves: current.moves + 1 }));
      setAuxiliary((current) => {
        if (current?.kind !== "merge") return current;
        const output = [...current.output];
        output[operation.index - current.left] = operation.value;
        return {
          ...current,
          output,
          consumedLeft: operation.source === "left"
            ? Math.max(current.consumedLeft, operation.sourceIndex + 1)
            : current.consumedLeft,
          consumedRight: operation.source === "right"
            ? Math.max(current.consumedRight, operation.sourceIndex + 1)
            : current.consumedRight,
          activeLeft: operation.source === "left" ? operation.sourceIndex : null,
          activeRight: operation.source === "right" ? operation.sourceIndex : null,
        };
      });
    }
    setActiveType(operation.type);
    valuesRef.current = next;
    setValues(next);
    graphValuesRef.current = graphNext;
    setGraphValues(graphNext);
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
    const graphSource = [...source];
    graphValuesRef.current = graphSource;
    setGraphValues(graphSource);
    operationsRef.current = operations;
    setOperationCount(operations.length);
    cursorRef.current = 0;
    setCursor(0);
    setMetrics(createMetrics());
    setAuxiliary(null);
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
    graphValuesRef.current = next;
    setGraphValues(next);
    operationsRef.current = [];
    setOperationCount(0);
    cursorRef.current = 0;
    setCursor(0);
    setMetrics(createMetrics());
    setAuxiliary(null);
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
    graphValuesRef.current = next;
    setGraphValues(next);
    operationsRef.current = [];
    setOperationCount(0);
    cursorRef.current = 0;
    setCursor(0);
    setMetrics(createMetrics());
    setAuxiliary(null);
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
  const displayValues: GraphValue[] = auxiliary?.kind === "beads"
    ? auxiliary.heights
    : (auxiliary?.kind === "counts" || auxiliary?.kind === "buckets") && auxiliary.phase === "collect"
      ? auxiliary.output
      : auxiliary?.kind === "merge"
        ? graphValues.map((value, index) => (
            index >= auxiliary.left && index <= auxiliary.right
              ? auxiliary.output[index - auxiliary.left]
              : value
          ))
        : graphValues;
  const maxValue = Math.max(count, ...values, 1);
  const metricPair = algorithm.id === "counting"
    ? { firstLabel: "カウント", firstValue: metrics.counts, secondLabel: "回収", secondValue: metrics.collections }
    : algorithm.id === "radix" || algorithm.id === "bucket"
      ? { firstLabel: "振り分け", firstValue: metrics.distributions, secondLabel: "回収", secondValue: metrics.collections }
      : algorithm.id === "bead"
        ? { firstLabel: "ビーズ落下", firstValue: metrics.drops, secondLabel: "段", secondValue: metrics.levels }
        : algorithm.id === "patience"
          ? { firstLabel: "比較", firstValue: metrics.comparisons, secondLabel: "回収", secondValue: metrics.collections }
          : algorithm.id === "flash" || algorithm.id === "americanFlag"
            ? { firstLabel: "カウント", firstValue: metrics.counts, secondLabel: "移動", secondValue: metrics.moves }
            : { firstLabel: "比較", firstValue: metrics.comparisons, secondLabel: "移動", secondValue: metrics.moves };
  const auxiliaryActionLabel = ["counting", "flash", "americanFlag"].includes(algorithm.id) ? "カウント"
    : algorithm.id === "bead" ? "落下"
      : algorithm.id === "mergeInsertion" ? "主鎖" : "振り分け";
  const legendShowsAux = algorithm.category === "linear" || algorithm.id === "patience" || algorithm.id === "mergeInsertion";
  const legendShowsCollect = ["counting", "radix", "bucket", "patience"].includes(algorithm.id);
  const legendShowsCompare = !["counting", "radix", "bucket", "bead", "americanFlag", "sleep"].includes(algorithm.id);
  const legendShowsMove = !["counting", "radix", "bucket", "bead", "patience"].includes(algorithm.id);
  const statusLabel = status === "running" ? "ソート中" : status === "paused" ? "一時停止" : status === "done" ? "完了" : "準備OK";
  const density = graphDensity(count);
  const showBarLabels = count <= 40;
  const activeCategory = activeType ? ACTIVE_LEGEND_CATEGORY[activeType] ?? null : null;
  const allowedCounts = algorithm.allowedN;
  const currentMax = allowedCounts?.at(-1) ?? algorithm.maxN ?? DEFAULT_MAX_N;
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
          35組のソートキャラクターと、並び替えを観察しよう
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
          <div className="algorithm-hero" style={{ "--accent": algorithm.accent } as React.CSSProperties}>
            <div className="hero-character"><CharacterIcon algorithm={algorithm} size="large" /><span className="character-level">No.{String(algorithm.icon + 1).padStart(2, "0")}</span></div>
            <div className="hero-copy" key={algorithm.id}>
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
                <Metric label={metricPair.firstLabel} value={metricPair.firstValue.toLocaleString("ja-JP")} />
                <Metric label={metricPair.secondLabel} value={metricPair.secondValue.toLocaleString("ja-JP")} />
                <Metric label="経過" value={(elapsed / 1000).toFixed(2)} unit="秒" />
              </div>
              <div className="legend" aria-label="色の凡例">
                <span><i className="legend-normal" />未処理</span>
                {legendShowsAux && <span className={activeCategory === "auxiliary" ? "is-active" : ""}><i className="legend-auxiliary" />{auxiliaryActionLabel}</span>}
                {legendShowsCollect && <span className={activeCategory === "collect" ? "is-active" : ""}><i className="legend-collect" />回収</span>}
                {legendShowsCompare && <span className={activeCategory === "compare" ? "is-active" : ""}><i className="legend-compare" />比較</span>}
                {legendShowsMove && <span className={activeCategory === "move" ? "is-active" : ""}><i className="legend-move" />交換・配置</span>}
              </div>
            </div>

            <div
              className={`bar-stage ${status === "done" ? "is-complete" : ""}`}
              style={{
                "--finish-step": `${completionTiming.stepMs}ms`,
                "--finish-pulse": `${completionTiming.pulseMs}ms`,
              } as React.CSSProperties}
            >
              <div className="grid-lines" aria-hidden="true"><i /><i /><i /><i /></div>
              <div
                className={`bars bars--${density.tier}`}
                aria-label={`${count}本の棒グラフ`}
                style={{ gap: `${density.gap}px` }}
              >
                {displayValues.map((value, index) => {
                  const isActive = active.includes(index);
                  const activeClass = isActive ? `is-${activeType}` : "";
                  const displayValue = value ?? 0;
                  return (
                    <div className={`bar-wrap ${activeClass} ${value === null ? "is-empty" : ""}`} key={index} style={{ width: `${100 / count}%` }}>
                      <div
                        className="bar"
                        style={{ height: `${(displayValue / maxValue) * 100}%`, minWidth: `${density.minBar}px`, "--bar-index": index } as React.CSSProperties}
                      >
                        {showBarLabels && value !== null && <span>{value}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="stage-corner stage-corner--top" /><div className="stage-corner stage-corner--bottom" />
            </div>

            <div className="progress-track" aria-label={`進行度 ${Math.round(progress)}%`}><span style={{ width: `${progress}%`, background: algorithm.accent }} /></div>
            {auxiliary && <AuxiliaryPanel state={auxiliary} />}
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

      <footer><span>SORTLAND</span><p>目で見て、耳で聴いて、アルゴリズムを好きになる。</p><small>35 ALGORITHMS · 100% STATIC · GITHUB PAGES</small></footer>
    </main>
  );
}
