export type SortOperation =
  | { type: "compare"; indices: [number, number] }
  | { type: "swap"; indices: [number, number] }
  | { type: "write"; index: number; value: number }
  | { type: "shuffle"; values: number[]; comparisons: number };

type SortRecorder = {
  array: number[];
  operations: SortOperation[];
  compare: (a: number, b: number) => void;
  swap: (a: number, b: number) => void;
  write: (index: number, value: number) => void;
  shuffle: (values: number[], comparisons: number) => void;
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

  while (i < leftValues.length && j < rightValues.length) {
    r.compare(left + i, mid + 1 + j);
    if (leftValues[i] <= rightValues[j]) {
      r.write(target++, leftValues[i++]);
    } else {
      r.write(target++, rightValues[j++]);
    }
  }
  while (i < leftValues.length) r.write(target++, leftValues[i++]);
  while (j < rightValues.length) r.write(target++, rightValues[j++]);
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
  const min = Math.min(...a);
  const max = Math.max(...a);
  const counts = new Array(max - min + 1).fill(0);
  for (const value of a) counts[value - min]++;
  let index = 0;
  for (let value = min; value <= max; value++) {
    while (counts[value - min]-- > 0) r.write(index++, value);
  }
}

function radixSort(r: SortRecorder) {
  const { array: a } = r;
  const max = Math.max(...a);
  for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
    const output = new Array(a.length).fill(0);
    const count = new Array(10).fill(0);
    for (const value of a) count[Math.floor(value / exp) % 10]++;
    for (let i = 1; i < 10; i++) count[i] += count[i - 1];
    for (let i = a.length - 1; i >= 0; i--) {
      const digit = Math.floor(a[i] / exp) % 10;
      output[--count[digit]] = a[i];
    }
    output.forEach((value, index) => r.write(index, value));
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
  const bucketCount = Math.max(2, Math.floor(Math.sqrt(a.length)));
  const min = Math.min(...a);
  const max = Math.max(...a);
  const span = (max - min + 1) / bucketCount;
  const buckets: number[][] = Array.from({ length: bucketCount }, () => []);
  a.forEach((value) => buckets[Math.min(bucketCount - 1, Math.floor((value - min) / span))].push(value));
  const output: number[] = [];
  for (const bucket of buckets) {
    for (let i = 1; i < bucket.length; i++) {
      const value = bucket[i];
      let j = i - 1;
      while (j >= 0 && bucket[j] > value) {
        bucket[j + 1] = bucket[j];
        j--;
      }
      bucket[j + 1] = value;
    }
    output.push(...bucket);
    output.forEach((value, index) => r.write(index, value));
  }
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

  for (let level = 1; level <= max; level++) {
    let beadCount = 0;
    for (const value of original) if (value >= level) beadCount++;
    for (let row = original.length - beadCount; row < original.length; row++) {
      heights[row]++;
      r.write(row, heights[row]);
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
  };
  (algorithms[id] ?? bubbleSort)(recorder);
  return recorder.operations;
}
