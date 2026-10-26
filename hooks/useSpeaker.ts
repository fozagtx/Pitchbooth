// SPDX-License-Identifier: MIT
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function responseError(body: unknown): string {
  if (body && typeof body === "object" && "error" in body) {
    const error = body.error;
    if (typeof error === "string") {
      return error;
    }
    if (Array.isArray(error)) {
      return error.map(String).join(" ");
    }
  }
  return "Could not generate speech.";
}

export function useSpeaker(): {
  speaking: boolean;
  speak(text: string): Promise<void>;
  stop(): void;
  error: string | null;
} {
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const generationRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const resolveRef = useRef<(() => void) | null>(null);
  const rejectRef = useRef<((error: Error) => void) | null>(null);

  const settle = useCallback((failure?: Error) => {
    const audio = audioRef.current;
    audioRef.current = null;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
    }

    const url = urlRef.current;
    urlRef.current = null;
    if (url) {
      URL.revokeObjectURL(url);
    }

    const resolve = resolveRef.current;
    const reject = rejectRef.current;
    resolveRef.current = null;
    rejectRef.current = null;

    if (mountedRef.current) {
      setSpeaking(false);
      setError(failure?.message ?? null);
    }
    if (failure) {
      reject?.(failure);
    } else {
      resolve?.();
    }
  }, []);

  const stop = useCallback(() => {
    generationRef.current += 1;
    settle();
  }, [settle]);

  const speak = useCallback((text: string): Promise<void> => {
    const generation = ++generationRef.current;
    settle();
    if (mountedRef.current) {
      setSpeaking(true);
      setError(null);
    }

    const playback = new Promise<void>((resolve, reject) => {
      resolveRef.current = resolve;
      rejectRef.current = reject;
    });

    void (async () => {
      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!response.ok) {
          const body: unknown = await response.json().catch(() => null);
          throw new Error(responseError(body));
        }
        const blob = await response.blob();
        if (generation !== generationRef.current) {
          return;
        }

        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          if (generation === generationRef.current) {
            settle();
          }
        };
        audio.onerror = () => {
          if (generation === generationRef.current) {
            settle(new Error("Could not play generated speech."));
          }
        };
        void audio.play().catch((reason: unknown) => {
          if (generation === generationRef.current) {
            settle(reason instanceof Error
              ? reason
              : new Error("Could not play generated speech."));
          }
        });
      } catch (reason) {
        if (generation !== generationRef.current) {
          return;
        }
        settle(reason instanceof Error
          ? reason
          : new Error("Could not generate speech."));
      }
    })();

    return playback;
  }, [settle]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      settle();
    };
  }, [settle]);

  return { speaking, speak, stop, error };
}
