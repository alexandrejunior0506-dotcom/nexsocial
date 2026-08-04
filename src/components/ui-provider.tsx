"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

interface ConfirmState {
  message: string;
  resolve: (value: boolean) => void;
}

interface UiContextValue {
  showToast: (message: string, type?: Toast["type"]) => void;
  confirm: (message: string) => Promise<boolean>;
}

const UiContext = createContext<UiContextValue | null>(null);

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const confirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ message, resolve });
    });
  }, []);

  return (
    <UiContext.Provider value={{ showToast, confirm }}>
      {children}

      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-toast-in pointer-events-auto flex items-center gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur ${
              toast.type === "success"
                ? "border-sky-900/60 bg-[var(--surface)]/95 text-white"
                : "border-red-900/60 bg-red-950/90 text-red-200"
            }`}
          >
            {toast.type === "success" ? (
              <span className="nex-gradient-bg flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white">
                ✓
              </span>
            ) : (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
                !
              </span>
            )}
            {toast.message}
          </div>
        ))}
      </div>

      {confirmState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 animate-scale-in">
            <p className="text-white">{confirmState.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  confirmState.resolve(false);
                  setConfirmState(null);
                }}
                className="rounded-md border border-[var(--border)] px-4 py-2 text-sm transition-colors hover:bg-[var(--surface-hover)]"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  confirmState.resolve(true);
                  setConfirmState(null);
                }}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </UiContext.Provider>
  );
}

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error("useUi must be used within UiProvider");
  return ctx;
}
