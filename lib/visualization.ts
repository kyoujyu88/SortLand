import type { SortOperation } from "./sorts";

export type GraphValue = number | null;

function moveValue(slots: GraphValue[], index: number, value: number) {
  if (slots[index] === value) return;
  const source = slots.findIndex((candidate, candidateIndex) => (
    candidateIndex !== index && candidate === value
  ));
  slots[index] = value;
  if (source >= 0) slots[source] = null;
}

export function projectGraphOperation(
  current: readonly GraphValue[],
  operation: SortOperation,
): GraphValue[] {
  const next = [...current];

  if (operation.type === "swap") {
    const [left, right] = operation.indices;
    [next[left], next[right]] = [next[right], next[left]];
  } else if (operation.type === "write" || operation.type === "collect" || operation.type === "mergeTake") {
    moveValue(next, operation.index, operation.value);
  } else if (operation.type === "shuffle") {
    next.splice(0, next.length, ...operation.values);
  } else if (operation.type === "drop") {
    if (operation.setup) next.fill(0);
    next[operation.row] = operation.value;
  }

  return next;
}

export function projectGraphOperations(
  input: readonly number[],
  operations: readonly SortOperation[],
): GraphValue[] {
  return operations.reduce<GraphValue[]>(
    (values, operation) => projectGraphOperation(values, operation),
    [...input],
  );
}
