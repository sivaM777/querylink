/// <reference types="vite/client" />

declare global {
  interface Window {
    queryLinkerAutoRefresh?: NodeJS.Timeout;
  }
}

export {};
