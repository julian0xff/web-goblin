"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { WebsiteAnalysis } from "@/lib/site-analysis";

type AnalysisState = {
  url: string;
  setUrl: (url: string) => void;
  analysis: WebsiteAnalysis | null;
  isLoading: boolean;
  error: string | null;
  statusMessage: string | null;
  handleSubmit: (nextUrl?: string) => void;
  copyText: (value: string, successMessage: string) => Promise<void>;
};

const AnalysisContext = createContext<AnalysisState | null>(null);

const EXAMPLE_URLS = [
  "https://linear.app",
  "https://www.apple.com",
  "https://pitch.com",
];

function getInitialUrl(): string {
  if (typeof window !== "undefined") {
    const param = new URLSearchParams(window.location.search).get("url");
    if (param) return param;
  }
  return EXAMPLE_URLS[0];
}

export { EXAMPLE_URLS };

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [url, setUrl] = useState(getInitialUrl);
  const [analysis, setAnalysis] = useState<WebsiteAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const didAutoRun = useRef(false);

  const runAnalysis = useCallback(async (nextUrl: string) => {
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: nextUrl }),
      });

      const payload = (await response.json()) as
        | WebsiteAnalysis
        | { error?: string };

      if (!response.ok || ("error" in payload && payload.error)) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "The goblin hit a wall while reading that site."
        );
      }

      setAnalysis(payload as WebsiteAnalysis);
      setError(null);
      setStatusMessage("Fresh report ready.");
      window.history.replaceState(
        null,
        "",
        `?url=${encodeURIComponent(nextUrl)}`
      );
    } catch (caughtError) {
      setStatusMessage(null);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The goblin hit a wall while reading that site."
      );
    }
  }, []);

  const handleSubmit = useCallback(
    (nextUrl?: string) => {
      const target = nextUrl ?? url;
      setStatusMessage(null);
      setError(null);
      setIsLoading(true);

      const minDelay = new Promise((resolve) => setTimeout(resolve, 700));

      void Promise.all([runAnalysis(target), minDelay]).finally(() => {
        setIsLoading(false);
      });
    },
    [url, runAnalysis]
  );

  useEffect(() => {
    if (didAutoRun.current) return;
    const param = new URLSearchParams(window.location.search).get("url");
    if (param) {
      didAutoRun.current = true;
      handleSubmit(param);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyText = useCallback(
    async (value: string, successMessage: string) => {
      try {
        await navigator.clipboard.writeText(value);
        setStatusMessage(successMessage);
      } catch {
        setStatusMessage("Clipboard access failed.");
      }
    },
    []
  );

  return (
    <AnalysisContext.Provider
      value={{
        url,
        setUrl,
        analysis,
        isLoading,
        error,
        statusMessage,
        handleSubmit,
        copyText,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis(): AnalysisState {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error("useAnalysis must be used within an AnalysisProvider");
  }
  return context;
}
