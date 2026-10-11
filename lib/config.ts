export const config = {
  agentUrl: "http://127.0.0.1:2000",
  assemblyTokenUrl: "https://streaming.assemblyai.com/v3/token",
  assemblyWsUrl: "wss://streaming.assemblyai.com/v3/ws",
  speechModel: "universal-streaming-english",
  sampleRate: 16000,
  ttsUrl: "https://preview.tts.speechmatics.com/generate",
  ttsVoice: "megan",
  listenMaxSec: 900,
  tokenTtlSec: 60,
} as const;
