class PitchboothPcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.chunkLength = Math.max(1, Math.round(sampleRate * 0.05));
    this.buffer = new Float32Array(this.chunkLength);
    this.offset = 0;
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) {
      return true;
    }

    let inputOffset = 0;
    while (inputOffset < input.length) {
      const count = Math.min(
        input.length - inputOffset,
        this.chunkLength - this.offset,
      );
      this.buffer.set(
        input.subarray(inputOffset, inputOffset + count),
        this.offset,
      );
      inputOffset += count;
      this.offset += count;

      if (this.offset === this.chunkLength) {
        const samples = this.buffer;
        let sumSquares = 0;
        for (const sample of samples) {
          sumSquares += sample * sample;
        }
        const rms = Math.sqrt(sumSquares / samples.length);
        this.port.postMessage({ samples, rms }, [samples.buffer]);
        this.buffer = new Float32Array(this.chunkLength);
        this.offset = 0;
      }
    }

    return true;
  }
}

registerProcessor("pitchbooth-pcm", PitchboothPcmProcessor);
