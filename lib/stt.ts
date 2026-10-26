// SPDX-License-Identifier: MIT
import type { Word } from "./tracker";

interface AssemblyWord {
  text: string;
  start: number;
  end: number;
  word_is_final?: boolean;
}

interface AssemblyTurn {
  type: string;
  end_of_turn?: boolean;
  words?: AssemblyWord[];
}

export function turnToWords(msg: unknown, runStartOffsetMs: number): Word[] {
  if (!msg || typeof msg !== "object" || !("type" in msg)) {
    return [];
  }

  const turn = msg as AssemblyTurn;
  if (turn.type !== "Turn" || !Array.isArray(turn.words)) {
    return [];
  }

  return turn.words
    .filter((word) => !turn.end_of_turn || word.word_is_final === true)
    .map(({ text, start, end }) => ({
      text,
      start: start + runStartOffsetMs,
      end: end + runStartOffsetMs,
    }));
}

export function floatTo16BitPcm(samples: Float32Array): Int16Array {
  return Int16Array.from(samples, (sample) => {
    if (!Number.isFinite(sample)) {
      return 0;
    }
    const clipped = Math.max(-1, Math.min(1, sample));
    return clipped < 0
      ? Math.round(clipped * 32768)
      : Math.round(clipped * 32767);
  });
}

export function downsample(
  samples: Float32Array,
  fromRate: number,
  targetRate: number,
): Float32Array {
  if (
    !Number.isFinite(fromRate) ||
    !Number.isFinite(targetRate) ||
    fromRate <= 0 ||
    targetRate <= 0 ||
    fromRate < targetRate
  ) {
    throw new Error("Sample rates must be positive and fromRate must be at least targetRate.");
  }

  if (fromRate === targetRate) {
    return new Float32Array(samples);
  }

  const ratio = fromRate / targetRate;
  const output = new Float32Array(Math.floor(samples.length / ratio));
  for (let outputIndex = 0; outputIndex < output.length; outputIndex += 1) {
    const from = outputIndex * ratio;
    const to = from + ratio;
    let total = 0;
    let weight = 0;

    for (let inputIndex = Math.floor(from); inputIndex < to; inputIndex += 1) {
      const overlap = Math.min(to, inputIndex + 1) - Math.max(from, inputIndex);
      total += (samples[inputIndex] ?? 0) * overlap;
      weight += overlap;
    }
    output[outputIndex] = weight === 0 ? 0 : total / weight;
  }

  return output;
}
