const WHITE_KEY_PATTERN = [0, 2, 4, 5, 7, 9, 11] as const;
const MAX_PIANO_KEYS = 29;
const PIANO_BASE_FREQUENCY = 130.81;

export type CompletionSweepNote = {
  barIndex: number;
  delayMs: number;
  frequency: number;
};

export function getCompletionSweepTiming(size: number) {
  const barCount = Math.max(1, Math.floor(size));
  const stepMs = Math.min(72, Math.max(10, 1500 / Math.max(1, barCount - 1)));
  const pulseMs = Math.min(320, Math.max(190, stepMs * 4));
  return {
    stepMs,
    pulseMs,
    durationMs: (barCount - 1) * stepMs + pulseMs,
  };
}

export function buildPianoSweep(size: number): CompletionSweepNote[] {
  const barCount = Math.max(1, Math.floor(size));
  const noteCount = Math.min(barCount, MAX_PIANO_KEYS);
  const { stepMs } = getCompletionSweepTiming(barCount);

  return Array.from({ length: noteCount }, (_, index) => {
    const barIndex = noteCount === 1
      ? 0
      : Math.round((index / (noteCount - 1)) * (barCount - 1));
    const octave = Math.floor(index / WHITE_KEY_PATTERN.length);
    const semitones = octave * 12 + WHITE_KEY_PATTERN[index % WHITE_KEY_PATTERN.length];
    return {
      barIndex,
      delayMs: barIndex * stepMs,
      frequency: PIANO_BASE_FREQUENCY * 2 ** (semitones / 12),
    };
  });
}
