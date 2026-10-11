"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { config } from "../lib/config";
import { downsample, floatTo16BitPcm, turnToWords } from "../lib/stt";
import type { Word } from "../lib/tracker";

export type ListenStatus = "idle" | "connecting" | "listening" | "error";

interface TokenResponse {
  token: string;
  wsUrl: string;
}

interface TurnMessage {
  type: string;
  end_of_turn?: boolean;
  transcript?: string;
}

function responseError(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object" || !("error" in body)) {
    return fallback;
  }
  const error = body.error;
  return typeof error === "string" ? error : fallback;
}

async function getToken(): Promise<TokenResponse> {
  const response = await fetch("/api/stt-token");
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(responseError(body, "Could not create a listening token."));
  }
  if (
    !body ||
    typeof body !== "object" ||
    !("token" in body) ||
    typeof body.token !== "string" ||
    !("wsUrl" in body) ||
    typeof body.wsUrl !== "string"
  ) {
    throw new Error("Could not create a listening token.");
  }
  return body as TokenResponse;
}

export function useListener(opts: {
  onWords?: (words: Word[], final: boolean) => void;
  onTurn?: (transcript: string) => void;
  onSpeechStart?: () => void;
}): {
  status: ListenStatus;
  error: string | null;
  level: number;
  start(): Promise<void>;
  stop(): void;
  elapsedMs(): number;
} {
  const [status, setStatusState] = useState<ListenStatus>("idle");
  const [error, setErrorState] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const statusRef = useRef<ListenStatus>("idle");
  const mountedRef = useRef(true);
  const generationRef = useRef(0);
  const callbacksRef = useRef(opts);
  const socketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const silenceRef = useRef<GainNode | null>(null);
  const startAtRef = useRef<number | null>(null);
  const finalElapsedRef = useRef(0);
  const streamOffsetRef = useRef(0);
  const speechMsRef = useRef(0);
  const speechSignaledRef = useRef(false);

  callbacksRef.current = opts;

  const setStatus = useCallback((value: ListenStatus) => {
    statusRef.current = value;
    if (mountedRef.current) {
      setStatusState(value);
    }
  }, []);

  const setError = useCallback((value: string | null) => {
    if (mountedRef.current) {
      setErrorState(value);
    }
  }, []);

  const releaseResources = useCallback((terminate: boolean) => {
    const startAt = startAtRef.current;
    if (startAt !== null) {
      finalElapsedRef.current = Math.max(0, performance.now() - startAt);
      startAtRef.current = null;
    }

    const socket = socketRef.current;
    socketRef.current = null;
    if (socket) {
      if (terminate && socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(JSON.stringify({ type: "Terminate" }));
        } catch {
          socket.close();
        }
      }
      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close();
      }
    }

    if (workletRef.current) {
      workletRef.current.port.onmessage = null;
      workletRef.current.disconnect();
      workletRef.current = null;
    }
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    silenceRef.current?.disconnect();
    silenceRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    const context = contextRef.current;
    contextRef.current = null;
    if (context && context.state !== "closed") {
      void context.close().catch(() => {});
    }

    streamOffsetRef.current = 0;
    speechMsRef.current = 0;
    speechSignaledRef.current = false;
  }, []);

  const fail = useCallback((message: string) => {
    releaseResources(false);
    setStatus("error");
    setError(message);
    if (mountedRef.current) {
      setLevel(0);
    }
  }, [releaseResources, setError, setStatus]);

  const stop = useCallback(() => {
    generationRef.current += 1;
    releaseResources(true);
    setStatus("idle");
    setError(null);
    if (mountedRef.current) {
      setLevel(0);
    }
  }, [releaseResources, setError, setStatus]);

  const start = useCallback(async () => {
    if (statusRef.current === "connecting" || statusRef.current === "listening") {
      return;
    }

    const generation = ++generationRef.current;
    const startAt = performance.now();
    startAtRef.current = startAt;
    finalElapsedRef.current = 0;
    setStatus("connecting");
    setError(null);

    try {
      const token = await getToken();
      if (generation !== generationRef.current) {
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (generation !== generationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;

      const context = new AudioContext();
      contextRef.current = context;
      await context.audioWorklet.addModule("/pcm-worklet.js");
      if (generation !== generationRef.current) {
        return;
      }
      await context.resume();
      if (generation !== generationRef.current) {
        return;
      }

      const socket = new WebSocket(token.wsUrl);
      socketRef.current = socket;
      socket.binaryType = "arraybuffer";
      let opened = false;
      const connected = new Promise<void>((resolve, reject) => {
        socket.onopen = () => {
          if (generation !== generationRef.current) {
            socket.close();
            resolve();
            return;
          }
          opened = true;
          streamOffsetRef.current = performance.now() - startAt;
          resolve();
        };
        socket.onmessage = (event: MessageEvent<string>) => {
          if (
            generation !== generationRef.current ||
            socketRef.current !== socket ||
            typeof event.data !== "string"
          ) {
            return;
          }

          let message: unknown;
          try {
            message = JSON.parse(event.data);
          } catch {
            return;
          }
          if (!message || typeof message !== "object" || !("type" in message)) {
            return;
          }
          const turn = message as TurnMessage;
          if (turn.type === "Error") {
            const detail = "error" in message && typeof message.error === "string"
              ? message.error
              : "The speech service returned an error.";
            fail(detail);
            return;
          }
          if (turn.type !== "Turn") {
            return;
          }

          const final = turn.end_of_turn === true;
          const words = turnToWords(message, streamOffsetRef.current);
          callbacksRef.current.onWords?.(words, final);
          if (final && turn.transcript?.trim()) {
            callbacksRef.current.onTurn?.(turn.transcript);
          }
        };
        socket.onerror = () => {
          if (generation !== generationRef.current) {
            resolve();
          } else if (opened && socketRef.current === socket) {
            fail("Could not connect to the speech service.");
          } else if (!opened && socketRef.current === socket) {
            reject(new Error("Could not connect to the speech service."));
          } else {
            resolve();
          }
        };
        socket.onclose = () => {
          if (generation !== generationRef.current) {
            resolve();
          } else if (opened && socketRef.current === socket) {
            fail("The speech connection closed.");
          } else if (!opened && socketRef.current === socket) {
            reject(new Error("The speech connection closed before it was ready."));
          } else {
            resolve();
          }
        };
      });
      await connected;
      if (
        generation !== generationRef.current ||
        socketRef.current !== socket
      ) {
        return;
      }

      const source = context.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(context, "pitchbooth-pcm");
      const silence = context.createGain();
      silence.gain.value = 0;
      sourceRef.current = source;
      workletRef.current = worklet;
      silenceRef.current = silence;
      worklet.port.onmessage = (event: MessageEvent<{
        samples: Float32Array;
        rms: number;
      }>) => {
        if (
          generation !== generationRef.current ||
          socketRef.current !== socket ||
          socket.readyState !== WebSocket.OPEN
        ) {
          return;
        }
        const { samples, rms } = event.data;
        if (!(samples instanceof Float32Array) || !Number.isFinite(rms)) {
          return;
        }

        if (mountedRef.current) {
          setLevel(Math.max(0, Math.min(1, rms)));
        }
        const chunkMs = (samples.length / context.sampleRate) * 1000;
        if (rms > 0.04) {
          speechMsRef.current += chunkMs;
          if (speechMsRef.current >= 150 && !speechSignaledRef.current) {
            speechSignaledRef.current = true;
            callbacksRef.current.onSpeechStart?.();
          }
        } else {
          speechMsRef.current = 0;
          speechSignaledRef.current = false;
        }

        try {
          const reduced = downsample(samples, context.sampleRate, config.sampleRate);
          const pcm = floatTo16BitPcm(reduced);
          socket.send(new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength));
        } catch (error) {
          fail(error instanceof Error ? error.message : "Could not process microphone audio.");
        }
      };
      source.connect(worklet);
      worklet.connect(silence);
      silence.connect(context.destination);
      setStatus("listening");
    } catch (reason) {
      if (generation !== generationRef.current) {
        return;
      }
      releaseResources(false);
      setStatus("error");
      const message = reason instanceof Error
        ? reason.message
        : "Could not start listening.";
      setError(message);
      throw new Error(message);
    }
  }, [fail, releaseResources, setError, setStatus]);

  const elapsedMs = useCallback(() => {
    const startAt = startAtRef.current;
    return startAt === null
      ? finalElapsedRef.current
      : Math.max(0, performance.now() - startAt);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      releaseResources(true);
    };
  }, [releaseResources]);

  return { status, error, level, start, stop, elapsedMs };
}
