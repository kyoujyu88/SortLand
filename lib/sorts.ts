type DistributionSetup = {
  title: string;
  labels: string[];
  outputSize: number;
};

type BeadSetup = {
  title: string;
  rowCount: number;
  maxLevel: number;
};

type SlotSetup = {
  title: string;
  slotCount: number;
};

type ChainPhase = "main" | "insert";

export type SortOperation =
  | { type: "compare"; indices: [number, number] }
  | { type: "swap"; indices: [number, number] }
  | { type: "write"; index: number; value: number }
  | { type: "shuffle"; values: number[]; comparisons: number }
  | { type: "count"; index: number; value: number; bucket: number; setup?: DistributionSetup }
  | { type: "distribute"; index: number; value: number; bucket: number; setup?: DistributionSetup }
  | { type: "collect"; index: number; value: number; bucket: number }
  | { type: "drop"; row: number; value: number; level: number; setup?: BeadSetup }
  | { type: "slotWrite"; slot: number; value: number | null; setup?: SlotSetup }
  | { type: "chainState"; values: number[]; activeValue: number; phase: ChainPhase }
  | { type: "mergeStart"; left: number; mid: number; right: number; leftValues: number[]; rightValues: number[] }
  | { type: "mergeCompare"; leftIndex: number; rightIndex: number; leftValue: number; rightValue: number }
  | { type: "mergeTake"; index: number; value: number; source: "left" | "right"; sourceIndex: number };

type SortRecorder = {
  array: number[];
  operations: SortOperation[];
  compare: (a: number, b: number) => void;
  swap: (a: number, b: number) => void;
  write: (index: number, value: number) => void;
  shuffle: (values: number[], comparisons: number) => void;
  count: (index: number, value: number, bucket: number, setup?: DistributionSetup) => void;
  distribute: (index: number, value: number, bucket: number, setup?: DistributionSetup) => void;
  collect: (index: number, value: number, bucket: number) => void;
  drop: (row: number, value: number, level: number, setup?: BeadSetup) => void;
  slotWrite: (slot: number, value: number | null, setup?: SlotSetup) => void;
  chainState: (values: number[], activeValue: number, phase: ChainPhase) => void;
  mergeStart: (left: number, mid: number, right: number, leftValues: number[], rightValues: number[]) => void;
  mergeCompare: (leftIndex: number, rightIndex: number, leftValue: number, rightValue: number) => void;
  mergeTake: (index: number, value: number, source: "left" | "right", sourceIndex: number) => void;
};

function createRecorder(input: number[]): SortRecorder {
  const array = [...input];
  const operations: SortOperation[] = [];

  return {
    array,
    operations,
    compare(a, b) {
      operations.push({ type: "compare", indices: [a, b] });
    },
    swap(a, b) {
      if (a === b) return;
      [array[a], array[b]] = [array[b], array[a]];
      operations.push({ type: "swap", indices: [a, b] });
    },
    write(index, value) {
      array[index] = value;
      operations.push({ type: "write", index, value });
    },
    shuffle(values, comparisons) {
      array.splice(0, array.length, ...values);
      operations.push({ type: "shuffle", values: [...values], comparisons });
    },
    count(index, value, bucket, setup) {
      operations.push({ type: "count", index, value, bucket, setup });
    },
    distribute(index, value, bucket, setup) {
      operations.push({ type: "distribute", index, value, bucket, setup });
    },
    collect(index, value, bucket) {
      array[index] = value;
      operations.push({ type: "collect", index, value, bucket });
    },
    drop(row, value, level, setup) {
      array[row] = value;
      operations.push({ type: "drop", row, value, level, setup });
    },
    slotWrite(slot, value, setup) {
      operations.push({ type: "slotWrite", slot, value, setup });
    },
    chainState(values, activeValue, phase) {
      operations.push({ type: "chainState", values: [...values], activeValue, phase });
    },
    mergeStart(left, mid, right, leftValues, rightValues) {
      operations.push({
        type: "mergeStart",
        left,
        mid,
        right,
        leftValues: [...leftValues],
        rightValues: [...rightValues],
      });
    },
    mergeCompare(leftIndex, rightIndex, leftValue, rightValue) {
      operations.push({ type: "mergeCompare", leftIndex, rightIndex, leftValue, rightValue });
    },
    mergeTake(index, value, source, sourceIndex) {
      array[index] = value;
      operations.push({ type: "mergeTake", index, value, source, sourceIndex });
    },
  };
}

function bubbleSort(r: SortRecorder) {
  const { array: a } = r;
  for (let end = a.length - 1; end > 0; end--) {
    let moved = false;
    for (let i = 0; i < end; i++) {
      r.compare(i, i + 1);
      if (a[i] > a[i + 1]) {
        r.swap(i, i + 1);
        moved = true;
      }
    }
    if (!moved) break;
  }
}

function selectionSort(r: SortRecorder) {
  const { array: a } = r;
  for (let i = 0; i < a.length - 1; i++) {
    let min = i;
    for (let j = i + 1; j < a.length; j++) {
      r.compare(min, j);
      if (a[j] < a[min]) min = j;
    }
    r.swap(i, min);
  }
}

function insertionRange(r: SortRecorder, start: number, end: number) {
  const { array: a } = r;
  for (let i = start + 1; i <= end; i++) {
    const value = a[i];
    let j = i - 1;
    while (j >= start) {
      r.compare(j, j + 1);
      if (a[j] <= value) break;
      r.write(j + 1, a[j]);
      j--;
    }
    if (j + 1 !== i) r.write(j + 1, value);
  }
}

function insertionSort(r: SortRecorder) {
  insertionRange(r, 0, r.array.length - 1);
}

function mergeRange(r: SortRecorder, left: number, mid: number, right: number) {
  const leftValues = r.array.slice(left, mid + 1);
  const rightValues = r.array.slice(mid + 1, right + 1);
  let i = 0;
  let j = 0;
  let target = left;
  r.mergeStart(left, mid, right, leftValues, rightValues);

  while (i < leftValues.length && j < rightValues.length) {
    r.mergeCompare(i, j, leftValues[i], rightValues[j]);
    if (leftValues[i] <= rightValues[j]) {
      r.mergeTake(target++, leftValues[i], "left", i++);
    } else {
      r.mergeTake(target++, rightValues[j], "right", j++);
    }
  }
  while (i < leftValues.length) r.mergeTake(target++, leftValues[i], "left", i++);
  while (j < rightValues.length) r.mergeTake(target++, rightValues[j], "right", j++);
}

function mergeSort(r: SortRecorder) {
  function split(left: number, right: number) {
    if (left >= right) return;
    const mid = Math.floor((left + right) / 2);
    split(left, mid);
    split(mid + 1, right);
    mergeRange(r, left, mid, right);
  }
  split(0, r.array.length - 1);
}

function quickSort(r: SortRecorder) {
  const { array: a } = r;
  function partition(low: number, high: number) {
    const pivot = a[high];
    let boundary = low;
    for (let i = low; i < high; i++) {
      r.compare(i, high);
      if (a[i] < pivot) r.swap(i, boundary++);
    }
    r.swap(boundary, high);
    return boundary;
  }
  function sort(low: number, high: number) {
    if (low >= high) return;
    const pivot = partition(low, high);
    sort(low, pivot - 1);
    sort(pivot + 1, high);
  }
  sort(0, a.length - 1);
}

function heapSort(r: SortRecorder) {
  const { array: a } = r;
  function heapify(size: number, root: number) {
    let largest = root;
    const left = root * 2 + 1;
    const right = left + 1;
    if (left < size) {
      r.compare(largest, left);
      if (a[left] > a[largest]) largest = left;
    }
    if (right < size) {
      r.compare(largest, right);
      if (a[right] > a[largest]) largest = right;
    }
    if (largest !== root) {
      r.swap(root, largest);
      heapify(size, largest);
    }
  }
  for (let i = Math.floor(a.length / 2) - 1; i >= 0; i--) heapify(a.length, i);
  for (let end = a.length - 1; end > 0; end--) {
    r.swap(0, end);
    heapify(end, 0);
  }
}

function shellSort(r: SortRecorder) {
  const { array: a } = r;
  for (let gap = Math.floor(a.length / 2); gap > 0; gap = Math.floor(gap / 2)) {
    for (let i = gap; i < a.length; i++) {
      const value = a[i];
      let j = i;
      while (j >= gap) {
        r.compare(j - gap, j);
        if (a[j - gap] <= value) break;
        r.write(j, a[j - gap]);
        j -= gap;
      }
      if (j !== i) r.write(j, value);
    }
  }
}

function countingSort(r: SortRecorder) {
  const { array: a } = r;
  if (!a.length) return;
  const source = [...a];
  const min = Math.min(...a);
  const max = Math.max(...a);
  const counts = new Array(max - min + 1).fill(0);
  const labels = Array.from({ length: counts.length }, (_, index) => String(min + index));
  source.forEach((value, index) => {
    const bucket = value - min;
    counts[bucket]++;
    r.count(index, value, bucket, index === 0 ? {
      title: "値ごとのカウント表",
      labels,
      outputSize: source.length,
    } : undefined);
  });
  let index = 0;
  for (let value = min; value <= max; value++) {
    while (counts[value - min]-- > 0) r.collect(index++, value, value - min);
  }
}

function radixSort(r: SortRecorder) {
  const { array: a } = r;
  if (!a.length) return;
  const max = Math.max(...a);
  for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
    const source = [...a];
    const buckets: number[][] = Array.from({ length: 10 }, () => []);
    const placeLabel = exp === 1 ? "1の位" : `${exp}の位`;
    source.forEach((value, index) => {
      const bucket = Math.floor(value / exp) % 10;
      buckets[bucket].push(value);
      r.distribute(index, value, bucket, index === 0 ? {
        title: `${placeLabel}で振り分け`,
        labels: Array.from({ length: 10 }, (_, digit) => String(digit)),
        outputSize: source.length,
      } : undefined);
    });
    let outputIndex = 0;
    buckets.forEach((bucket, bucketIndex) => {
      bucket.forEach((value) => r.collect(outputIndex++, value, bucketIndex));
    });
  }
}

function cocktailSort(r: SortRecorder) {
  const { array: a } = r;
  let start = 0;
  let end = a.length - 1;
  let moved = true;
  while (moved) {
    moved = false;
    for (let i = start; i < end; i++) {
      r.compare(i, i + 1);
      if (a[i] > a[i + 1]) {
        r.swap(i, i + 1);
        moved = true;
      }
    }
    if (!moved) break;
    moved = false;
    end--;
    for (let i = end; i > start; i--) {
      r.compare(i - 1, i);
      if (a[i - 1] > a[i]) {
        r.swap(i - 1, i);
        moved = true;
      }
    }
    start++;
  }
}

function combSort(r: SortRecorder) {
  const { array: a } = r;
  let gap = a.length;
  let swapped = true;
  while (gap > 1 || swapped) {
    gap = Math.max(1, Math.floor(gap / 1.3));
    swapped = false;
    for (let i = 0; i + gap < a.length; i++) {
      r.compare(i, i + gap);
      if (a[i] > a[i + gap]) {
        r.swap(i, i + gap);
        swapped = true;
      }
    }
  }
}

function gnomeSort(r: SortRecorder) {
  const { array: a } = r;
  let i = 1;
  while (i < a.length) {
    r.compare(i - 1, i);
    if (a[i - 1] <= a[i]) i++;
    else {
      r.swap(i - 1, i);
      i = Math.max(1, i - 1);
    }
  }
}

function oddEvenSort(r: SortRecorder) {
  const { array: a } = r;
  let sorted = false;
  while (!sorted) {
    sorted = true;
    for (let phase = 1; phase >= 0; phase--) {
      for (let i = phase; i + 1 < a.length; i += 2) {
        r.compare(i, i + 1);
        if (a[i] > a[i + 1]) {
          r.swap(i, i + 1);
          sorted = false;
        }
      }
    }
  }
}

function cycleSort(r: SortRecorder) {
  const { array: a } = r;
  for (let start = 0; start < a.length - 1; start++) {
    let item = a[start];
    let position = start;
    for (let i = start + 1; i < a.length; i++) {
      r.compare(start, i);
      if (a[i] < item) position++;
    }
    if (position === start) continue;
    while (item === a[position]) position++;
    let displaced = a[position];
    r.write(position, item);
    item = displaced;

    while (position !== start) {
      position = start;
      for (let i = start + 1; i < a.length; i++) {
        r.compare(start, i);
        if (a[i] < item) position++;
      }
      while (item === a[position]) position++;
      displaced = a[position];
      r.write(position, item);
      item = displaced;
    }
  }
}

function pancakeSort(r: SortRecorder) {
  const { array: a } = r;
  const flip = (end: number) => {
    for (let left = 0, right = end; left < right; left++, right--) r.swap(left, right);
  };
  for (let size = a.length; size > 1; size--) {
    let max = 0;
    for (let i = 1; i < size; i++) {
      r.compare(max, i);
      if (a[i] > a[max]) max = i;
    }
    if (max === size - 1) continue;
    if (max > 0) flip(max);
    flip(size - 1);
  }
}

function bucketSort(r: SortRecorder) {
  const { array: a } = r;
  if (a.length < 2) return;
  const source = [...a];
  const bucketCount = Math.max(2, Math.floor(Math.sqrt(a.length)));
  const min = Math.min(...a);
  const max = Math.max(...a);
  const span = (max - min + 1) / bucketCount;
  const buckets: number[][] = Array.from({ length: bucketCount }, () => []);
  const ranges = Array.from({ length: bucketCount }, (_, bucket) => {
    const lower = Math.ceil(min + bucket * span);
    const upper = bucket === bucketCount - 1 ? max : Math.ceil(min + (bucket + 1) * span) - 1;
    return { lower, upper };
  });
  source.forEach((value, index) => {
    const bucket = Math.min(bucketCount - 1, Math.floor((value - min) / span));
    buckets[bucket].push(value);
    r.distribute(index, value, bucket, index === 0 ? {
      title: "値の範囲でバケット分け",
      labels: ranges.map(({ lower, upper }) => `${lower}–${upper}`),
      outputSize: source.length,
    } : undefined);
  });

  let outputIndex = 0;
  buckets.forEach((bucket, bucketIndex) => {
    const frequencies = new Map<number, number>();
    bucket.forEach((value) => frequencies.set(value, (frequencies.get(value) ?? 0) + 1));
    const { lower, upper } = ranges[bucketIndex];
    for (let value = lower; value <= upper; value++) {
      const amount = frequencies.get(value) ?? 0;
      for (let copy = 0; copy < amount; copy++) r.collect(outputIndex++, value, bucketIndex);
    }
  });
}

function timSort(r: SortRecorder) {
  const n = r.array.length;
  const run = 16;
  for (let start = 0; start < n; start += run) insertionRange(r, start, Math.min(start + run - 1, n - 1));
  for (let size = run; size < n; size *= 2) {
    for (let left = 0; left < n; left += size * 2) {
      const mid = Math.min(left + size - 1, n - 1);
      const right = Math.min(left + size * 2 - 1, n - 1);
      if (mid < right) mergeRange(r, left, mid, right);
    }
  }
}

function strandSort(r: SortRecorder) {
  const remaining = [...r.array];
  let result: number[] = [];
  while (remaining.length) {
    const strand = [remaining.shift()!];
    for (let i = 0; i < remaining.length; ) {
      if (remaining[i] >= strand[strand.length - 1]) strand.push(...remaining.splice(i, 1));
      else i++;
    }
    const merged: number[] = [];
    let i = 0;
    let j = 0;
    while (i < result.length && j < strand.length) {
      r.compare(Math.min(i, r.array.length - 1), Math.min(result.length + j, r.array.length - 1));
      merged.push(result[i] <= strand[j] ? result[i++] : strand[j++]);
    }
    result = merged.concat(result.slice(i), strand.slice(j));
    const preview = result.concat(remaining);
    preview.forEach((value, index) => r.write(index, value));
  }
}

function stoogeSort(r: SortRecorder) {
  const { array: a } = r;
  function sort(left: number, right: number) {
    if (left >= right) return;
    r.compare(left, right);
    if (a[left] > a[right]) r.swap(left, right);
    if (right - left + 1 > 2) {
      const third = Math.floor((right - left + 1) / 3);
      sort(left, right - third);
      sort(left + third, right);
      sort(left, right - third);
    }
  }
  sort(0, a.length - 1);
}

function introSort(r: SortRecorder) {
  const { array: a } = r;

  function heapRange(low: number, high: number) {
    const length = high - low + 1;
    const heapify = (size: number, root: number) => {
      let largest = root;
      const left = root * 2 + 1;
      const right = left + 1;
      if (left < size) {
        r.compare(low + largest, low + left);
        if (a[low + left] > a[low + largest]) largest = left;
      }
      if (right < size) {
        r.compare(low + largest, low + right);
        if (a[low + right] > a[low + largest]) largest = right;
      }
      if (largest !== root) {
        r.swap(low + root, low + largest);
        heapify(size, largest);
      }
    };
    for (let i = Math.floor(length / 2) - 1; i >= 0; i--) heapify(length, i);
    for (let end = length - 1; end > 0; end--) {
      r.swap(low, low + end);
      heapify(end, 0);
    }
  }

  function partition(low: number, high: number) {
    const pivot = a[high];
    let boundary = low;
    for (let i = low; i < high; i++) {
      r.compare(i, high);
      if (a[i] < pivot) r.swap(i, boundary++);
    }
    r.swap(boundary, high);
    return boundary;
  }

  function sort(low: number, high: number, depth: number) {
    if (low >= high) return;
    if (high - low < 12) {
      insertionRange(r, low, high);
      return;
    }
    if (depth === 0) {
      heapRange(low, high);
      return;
    }
    const pivot = partition(low, high);
    sort(low, pivot - 1, depth - 1);
    sort(pivot + 1, high, depth - 1);
  }

  sort(0, a.length - 1, Math.max(1, Math.floor(Math.log2(a.length)) * 2));
}

function bogoSort(r: SortRecorder) {
  const { array: a } = r;
  let seed = a.reduce((value, item, index) => (
    Math.imul(value ^ (item + index * 97), 1664525) + 1013904223
  ) >>> 0, 0x9e3779b9);
  const random = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const inspect = (values: number[]) => {
    let comparisons = 0;
    for (let i = 1; i < values.length; i++) {
      comparisons++;
      if (values[i - 1] > values[i]) return { sorted: false, comparisons };
    }
    return { sorted: true, comparisons };
  };
  let factorial = 1;
  for (let value = 2; value <= a.length; value++) factorial *= value;
  const maxAttempts = Math.min(12_000, Math.max(400, factorial * 8));
  let result = inspect(a);

  for (let attempt = 0; !result.sorted && attempt < maxAttempts; attempt++) {
    const next = [...a];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    result = inspect(next);
    r.shuffle(next, result.comparisons);
  }

  if (!result.sorted) insertionSort(r);
}

function bitonicSort(r: SortRecorder) {
  const { array: a } = r;
  for (let size = 2; size <= a.length; size *= 2) {
    for (let stride = size / 2; stride > 0; stride /= 2) {
      for (let i = 0; i < a.length; i++) {
        const partner = i ^ stride;
        if (partner <= i) continue;
        const ascending = (i & size) === 0;
        r.compare(i, partner);
        if ((ascending && a[i] > a[partner]) || (!ascending && a[i] < a[partner])) {
          r.swap(i, partner);
        }
      }
    }
  }
}

function circleSort(r: SortRecorder) {
  const { array: a } = r;
  const pass = (low: number, high: number): boolean => {
    if (low >= high) return false;
    const originalLow = low;
    const originalHigh = high;
    let moved = false;

    while (low < high) {
      r.compare(low, high);
      if (a[low] > a[high]) {
        r.swap(low, high);
        moved = true;
      }
      low++;
      high--;
    }
    if (low === high && high + 1 <= originalHigh) {
      r.compare(low, high + 1);
      if (a[low] > a[high + 1]) {
        r.swap(low, high + 1);
        moved = true;
      }
    }

    const middle = Math.floor((originalHigh - originalLow) / 2);
    const leftMoved = pass(originalLow, originalLow + middle);
    const rightMoved = pass(originalLow + middle + 1, originalHigh);
    return moved || leftMoved || rightMoved;
  };

  while (pass(0, a.length - 1)) {
    // Repeat the recursive outside-in comparisons until a pass makes no swaps.
  }
}

function beadSort(r: SortRecorder) {
  const original = [...r.array];
  const heights = new Array(original.length).fill(0);
  const max = Math.max(...original, 0);
  r.array.fill(0);
  let isFirstDrop = true;

  for (let level = 1; level <= max; level++) {
    let beadCount = 0;
    for (const value of original) if (value >= level) beadCount++;
    for (let row = original.length - beadCount; row < original.length; row++) {
      heights[row]++;
      r.drop(row, heights[row], level, isFirstDrop ? {
        title: "ビーズの重力ラック",
        rowCount: original.length,
        maxLevel: max,
      } : undefined);
      isFirstDrop = false;
    }
  }
}

function tournamentSort(r: SortRecorder) {
  const values = [...r.array];
  let leafCount = 1;
  while (leafCount < values.length) leafCount *= 2;
  const tree = new Array(leafCount * 2).fill(-1);
  for (let i = 0; i < values.length; i++) tree[leafCount + i] = i;

  const winner = (left: number, right: number) => {
    if (left < 0) return right;
    if (right < 0) return left;
    r.compare(left, right);
    return values[left] <= values[right] ? left : right;
  };
  for (let node = leafCount - 1; node > 0; node--) {
    tree[node] = winner(tree[node * 2], tree[node * 2 + 1]);
  }

  for (let output = 0; output < values.length; output++) {
    const selected = tree[1];
    r.write(output, values[selected]);
    values[selected] = Number.POSITIVE_INFINITY;
    let node = leafCount + selected;
    while (node > 1) {
      node = Math.floor(node / 2);
      tree[node] = winner(tree[node * 2], tree[node * 2 + 1]);
    }
  }
}

type TreeNode = {
  value: number;
  sourceIndex: number;
  left: TreeNode | null;
  right: TreeNode | null;
};

function treeSort(r: SortRecorder) {
  const input = [...r.array];
  let root: TreeNode | null = null;

  input.forEach((value, sourceIndex) => {
    const node: TreeNode = { value, sourceIndex, left: null, right: null };
    if (!root) {
      root = node;
      return;
    }
    let current = root;
    while (true) {
      r.compare(sourceIndex, current.sourceIndex);
      if (value < current.value) {
        if (!current.left) {
          current.left = node;
          break;
        }
        current = current.left;
      } else {
        if (!current.right) {
          current.right = node;
          break;
        }
        current = current.right;
      }
    }
  });

  let output = 0;
  const traverse = (node: TreeNode | null) => {
    if (!node) return;
    traverse(node.left);
    r.write(output++, node.value);
    traverse(node.right);
  };
  traverse(root);
}

type TrackedItem = { value: number; src: number };

function librarySort(r: SortRecorder) {
  const source: TrackedItem[] = r.array.map((value, src) => ({ value, src }));
  const n = source.length;
  if (n < 2) return;
  const slotCount = n * 2;
  let isFirstSlot = true;
  const emitSlot = (slot: number, value: number | null) => {
    r.slotWrite(slot, value, isFirstSlot ? { title: "すき間つきの本棚", slotCount } : undefined);
    isFirstSlot = false;
  };

  const shelf: Array<TrackedItem & { slot: number }> = [];

  const rebalance = () => {
    shelf.forEach((item) => {
      if (item.slot >= 0) emitSlot(item.slot, null);
    });
    shelf.forEach((item, index) => {
      item.slot = Math.floor(((index + 1) * slotCount) / (shelf.length + 1));
      emitSlot(item.slot, item.value);
    });
  };

  source.forEach((current) => {
    let low = 0;
    let high = shelf.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      r.compare(shelf[mid].src, current.src);
      if (shelf[mid].value <= current.value) low = mid + 1;
      else high = mid;
    }
    const leftSlot = low > 0 ? shelf[low - 1].slot : -1;
    const rightSlot = low < shelf.length ? shelf[low].slot : slotCount;
    if (rightSlot - leftSlot > 1) {
      const slot = leftSlot + Math.max(1, (rightSlot - leftSlot) >> 1);
      shelf.splice(low, 0, { ...current, slot });
      emitSlot(slot, current.value);
    } else {
      shelf.splice(low, 0, { ...current, slot: -1 });
      rebalance();
    }
  });

  shelf.forEach((item, index) => {
    r.write(index, item.value);
    emitSlot(item.slot, null);
  });
}

function patienceSort(r: SortRecorder) {
  const source: TrackedItem[] = r.array.map((value, src) => ({ value, src }));
  const n = source.length;
  if (!n) return;

  const simulatedTops: number[] = [];
  for (const { value } of source) {
    let low = 0;
    let high = simulatedTops.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (simulatedTops[mid] >= value) high = mid;
      else low = mid + 1;
    }
    simulatedTops[low] = value;
  }
  const pileCount = simulatedTops.length;

  const piles: TrackedItem[][] = Array.from({ length: pileCount }, () => []);
  let activePiles = 0;
  source.forEach((item, index) => {
    let low = 0;
    let high = activePiles;
    while (low < high) {
      const mid = (low + high) >> 1;
      const top = piles[mid][piles[mid].length - 1];
      r.compare(top.src, item.src);
      if (top.value >= item.value) high = mid;
      else low = mid + 1;
    }
    piles[low].push(item);
    if (low === activePiles) activePiles++;
    r.distribute(index, item.value, low, index === 0 ? {
      title: "トランプの山札に配る",
      labels: Array.from({ length: pileCount }, (_, pile) => `山${pile + 1}`),
      outputSize: n,
    } : undefined);
  });

  for (let output = 0; output < n; output++) {
    let best = -1;
    for (let pile = 0; pile < pileCount; pile++) {
      if (!piles[pile].length) continue;
      if (best < 0) {
        best = pile;
        continue;
      }
      const bestTop = piles[best][piles[best].length - 1];
      const candidate = piles[pile][piles[pile].length - 1];
      r.compare(bestTop.src, candidate.src);
      if (candidate.value < bestTop.value) best = pile;
    }
    const item = piles[best].pop()!;
    r.collect(output, item.value, best);
  }
}

function dualPivotQuickSort(r: SortRecorder) {
  const { array: a } = r;
  function sort(low: number, high: number) {
    if (low >= high) return;
    r.compare(low, high);
    if (a[low] > a[high]) r.swap(low, high);
    const small = a[low];
    const large = a[high];
    let lt = low + 1;
    let gt = high - 1;
    let i = low + 1;
    while (i <= gt) {
      r.compare(i, low);
      if (a[i] < small) {
        r.swap(i, lt++);
      } else {
        r.compare(i, high);
        if (a[i] > large) {
          while (i < gt) {
            r.compare(gt, high);
            if (a[gt] > large) gt--;
            else break;
          }
          r.swap(i, gt--);
          r.compare(i, low);
          if (a[i] < small) r.swap(i, lt++);
        }
      }
      i++;
    }
    r.swap(low, --lt);
    r.swap(high, ++gt);
    sort(low, lt - 1);
    sort(lt + 1, gt - 1);
    sort(gt + 1, high);
  }
  sort(0, a.length - 1);
}

function smoothSort(r: SortRecorder) {
  const { array: a } = r;
  const n = a.length;
  if (n < 2) return;
  const leonardo = [1, 1];
  while (leonardo[leonardo.length - 1] < n) {
    leonardo.push(leonardo[leonardo.length - 1] + leonardo[leonardo.length - 2] + 1);
  }

  type Heap = { root: number; order: number };
  const heaps: Heap[] = [];

  const sift = (startRoot: number, startOrder: number) => {
    let root = startRoot;
    let order = startOrder;
    while (order >= 2) {
      const rightChild = root - 1;
      const leftChild = root - 1 - leonardo[order - 2];
      let next = root;
      let nextOrder = order;
      r.compare(next, leftChild);
      if (a[leftChild] > a[next]) {
        next = leftChild;
        nextOrder = order - 1;
      }
      r.compare(next, rightChild);
      if (a[rightChild] > a[next]) {
        next = rightChild;
        nextOrder = order - 2;
      }
      if (next === root) return;
      r.swap(root, next);
      root = next;
      order = nextOrder;
    }
  };

  const rectify = (startIndex: number) => {
    let index = startIndex;
    while (index > 0) {
      const current = heaps[index];
      const previous = heaps[index - 1];
      r.compare(previous.root, current.root);
      if (a[previous.root] <= a[current.root]) break;
      if (current.order >= 2) {
        const rightChild = current.root - 1;
        const leftChild = current.root - 1 - leonardo[current.order - 2];
        r.compare(previous.root, leftChild);
        const beatsLeft = a[previous.root] > a[leftChild];
        r.compare(previous.root, rightChild);
        const beatsRight = a[previous.root] > a[rightChild];
        if (!beatsLeft || !beatsRight) break;
      }
      r.swap(previous.root, current.root);
      index--;
    }
    sift(heaps[index].root, heaps[index].order);
  };

  for (let i = 0; i < n; i++) {
    const size = heaps.length;
    if (size >= 2 && heaps[size - 2].order === heaps[size - 1].order + 1) {
      const merged = { root: i, order: heaps[size - 2].order + 1 };
      heaps.splice(size - 2, 2, merged);
    } else if (size >= 1 && heaps[size - 1].order === 1) {
      heaps.push({ root: i, order: 0 });
    } else {
      heaps.push({ root: i, order: 1 });
    }
    rectify(heaps.length - 1);
  }

  for (let i = n - 1; i >= 0; i--) {
    const last = heaps.pop()!;
    if (last.order >= 2) {
      const leftRoot = last.root - 1 - leonardo[last.order - 2];
      const rightRoot = last.root - 1;
      heaps.push({ root: leftRoot, order: last.order - 1 });
      rectify(heaps.length - 1);
      heaps.push({ root: rightRoot, order: last.order - 2 });
      rectify(heaps.length - 1);
    }
  }
}

function sleepSort(r: SortRecorder) {
  const source = [...r.array];
  if (!source.length) return;
  const max = Math.max(...source);
  let output = 0;
  for (let tick = 1; tick <= max; tick++) {
    source.forEach((value) => {
      if (value === tick) r.write(output++, value);
    });
  }
}

function flashSort(r: SortRecorder) {
  const { array: a } = r;
  const n = a.length;
  if (n < 2) return;
  let min = a[0];
  let maxIndex = 0;
  for (let i = 1; i < n; i++) {
    if (a[i] < min) min = a[i];
    if (a[i] > a[maxIndex]) maxIndex = i;
  }
  if (a[maxIndex] === min) return;
  const classCount = Math.max(2, Math.floor(0.43 * n));
  const scale = (classCount - 1) / (a[maxIndex] - min);
  const classOf = (value: number) => Math.floor(scale * (value - min));

  const bounds = new Array(classCount).fill(0);
  for (let i = 0; i < n; i++) {
    const bucket = classOf(a[i]);
    bounds[bucket]++;
    r.count(i, a[i], bucket, i === 0 ? {
      title: "クラス分けの度数表",
      labels: Array.from({ length: classCount }, (_, index) => `C${index + 1}`),
      outputSize: 0,
    } : undefined);
  }
  for (let bucket = 1; bucket < classCount; bucket++) bounds[bucket] += bounds[bucket - 1];

  r.swap(0, maxIndex);
  let moved = 1;
  let j = 0;
  let bucket = classCount - 1;
  while (moved < n) {
    while (j > bounds[bucket] - 1) {
      j++;
      bucket = classOf(a[j]);
    }
    let flash = a[j];
    while (j !== bounds[bucket]) {
      bucket = classOf(flash);
      const dest = bounds[bucket] - 1;
      const hold = a[dest];
      r.write(dest, flash);
      flash = hold;
      bounds[bucket]--;
      moved++;
    }
  }
  insertionRange(r, 0, n - 1);
}

function americanFlagSort(r: SortRecorder) {
  const { array: a } = r;
  if (a.length < 2) return;
  const max = Math.max(...a);
  let topExp = 1;
  while (Math.floor(max / (topExp * 10)) > 0) topExp *= 10;

  function sortRange(start: number, end: number, exp: number) {
    if (end - start < 2 || exp < 1) return;
    const digits = new Array(10).fill(0);
    const placeLabel = exp === 1 ? "1の位" : `${exp}の位`;
    for (let i = start; i < end; i++) {
      const digit = Math.floor(a[i] / exp) % 10;
      digits[digit]++;
      r.count(i, a[i], digit, i === start ? {
        title: `${placeLabel}で区分け`,
        labels: Array.from({ length: 10 }, (_, index) => String(index)),
        outputSize: 0,
      } : undefined);
    }
    const offsets = new Array(10).fill(start);
    for (let digit = 1; digit < 10; digit++) {
      offsets[digit] = offsets[digit - 1] + digits[digit - 1];
    }
    const nextFree = [...offsets];
    for (let digit = 0; digit < 10; digit++) {
      const blockEnd = offsets[digit] + digits[digit];
      while (nextFree[digit] < blockEnd) {
        const i = nextFree[digit];
        const actual = Math.floor(a[i] / exp) % 10;
        if (actual === digit) nextFree[digit]++;
        else {
          r.swap(i, nextFree[actual]);
          nextFree[actual]++;
        }
      }
    }
    for (let digit = 0; digit < 10; digit++) {
      sortRange(offsets[digit], offsets[digit] + digits[digit], exp / 10);
    }
  }
  sortRange(0, a.length, topExp);
}

function mergeInsertionSort(r: SortRecorder) {
  const items: TrackedItem[] = r.array.map((value, src) => ({ value, src }));
  const less = (x: TrackedItem, y: TrackedItem) => {
    r.compare(x.src, y.src);
    return x.value < y.value;
  };

  function sortRec(list: TrackedItem[]): TrackedItem[] {
    if (list.length <= 1) return [...list];
    const pairs: Array<{ hi: TrackedItem; lo: TrackedItem }> = [];
    let leftover: TrackedItem | null = null;
    for (let i = 0; i + 1 < list.length; i += 2) {
      const left = list[i];
      const right = list[i + 1];
      pairs.push(less(left, right) ? { hi: right, lo: left } : { hi: left, lo: right });
    }
    if (list.length % 2) leftover = list[list.length - 1];

    const sortedHighs = sortRec(pairs.map((pair) => pair.hi));
    const partnerOf = new Map<TrackedItem, TrackedItem>();
    pairs.forEach((pair) => partnerOf.set(pair.hi, pair.lo));

    const chain: TrackedItem[] = [partnerOf.get(sortedHighs[0])!, ...sortedHighs];
    r.chainState(chain.map((item) => item.value), chain[0].value, "main");
    const pending: Array<{ lo: TrackedItem; hi: TrackedItem | null }> = sortedHighs
      .slice(1)
      .map((hi) => ({ lo: partnerOf.get(hi)!, hi }));
    if (leftover) pending.push({ lo: leftover, hi: null });

    const insertionOrder: number[] = [];
    let previousJacobsthal = 1;
    let currentJacobsthal = 1;
    let consumed = 0;
    while (insertionOrder.length < pending.length) {
      const next = currentJacobsthal + 2 * previousJacobsthal;
      previousJacobsthal = currentJacobsthal;
      currentJacobsthal = next;
      const upper = Math.min(pending.length, next - 1);
      for (let i = upper - 1; i >= consumed; i--) insertionOrder.push(i);
      consumed = upper;
    }

    for (const pendingIndex of insertionOrder) {
      const { lo, hi } = pending[pendingIndex];
      const bound = hi ? chain.indexOf(hi) : chain.length;
      let low = 0;
      let high = bound;
      while (low < high) {
        const mid = (low + high) >> 1;
        if (less(lo, chain[mid])) high = mid;
        else low = mid + 1;
      }
      chain.splice(low, 0, lo);
      r.chainState(chain.map((item) => item.value), lo.value, "insert");
    }
    return chain;
  }

  sortRec(items).forEach((item, index) => r.write(index, item.value));
}

function slowSort(r: SortRecorder) {
  const { array: a } = r;
  function sort(left: number, right: number) {
    if (left >= right) return;
    const mid = Math.floor((left + right) / 2);
    sort(left, mid);
    sort(mid + 1, right);
    r.compare(mid, right);
    if (a[right] < a[mid]) r.swap(mid, right);
    sort(left, right - 1);
  }
  sort(0, a.length - 1);
}

export function buildSortOperations(id: string, input: number[]): SortOperation[] {
  const recorder = createRecorder(input);
  const algorithms: Record<string, (r: SortRecorder) => void> = {
    bubble: bubbleSort,
    selection: selectionSort,
    insertion: insertionSort,
    merge: mergeSort,
    quick: quickSort,
    heap: heapSort,
    shell: shellSort,
    counting: countingSort,
    radix: radixSort,
    cocktail: cocktailSort,
    comb: combSort,
    gnome: gnomeSort,
    oddEven: oddEvenSort,
    cycle: cycleSort,
    pancake: pancakeSort,
    bucket: bucketSort,
    tim: timSort,
    strand: strandSort,
    stooge: stoogeSort,
    intro: introSort,
    bogo: bogoSort,
    bitonic: bitonicSort,
    circle: circleSort,
    bead: beadSort,
    tournament: tournamentSort,
    tree: treeSort,
    library: librarySort,
    patience: patienceSort,
    dualPivot: dualPivotQuickSort,
    smooth: smoothSort,
    sleep: sleepSort,
    flash: flashSort,
    americanFlag: americanFlagSort,
    mergeInsertion: mergeInsertionSort,
    slow: slowSort,
  };
  (algorithms[id] ?? bubbleSort)(recorder);
  return recorder.operations;
}
