"use client";

import { AlertCircle, Check } from "lucide-react";
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

      <div className="pointer-events-none fixed bottom-20 right-4 z-50 flex flex-col gap-2 lg:bottom-5">
        {toasts.map((toast) => {
          const ok = toast.type === "success";
          return (
            <div
              key={toast.id}
              role="status"
              className={`animate-toast-in pointer-events-auto relative flex max-w-[360px] items-center gap-3 overflow-hidden rounded-[4px_14px_4px_14px] border px-4 py-3 text-sm text-white shadow-[0_18px_40px_-14px_rgba(0,0,0,0.8)] backdrop-blur-xl ${
                ok ? "border-[var(--accent-from)]/40 bg-[var(--glass)]" : "border-[var(--bad)]/50 bg-[#2a0a16]/90"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  ok ? "nex-gradient-bg text-white" : "bg-[var(--bad)] text-white"
                }`}
              >
                {ok ? <Check size={14} strokeWidth={3} /> : <AlertCircle size={14} strokeWidth={3} />}
              </span>
              <span className="min-w-0 break-words">{toast.message}</span>
              <span
                className={`absolute inset-x-0 bottom-0 h-0.5 origin-left ${ok ? "nex-gradient-bg" : "bg-[var(--bad)]"}`}
                style={{ animation: "nex-drain 4s linear forwards" }}
              />
            </div>
          );
        })}
      </div>

      {confirmState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
          <div className="nex-panel w-full max-w-sm p-6 animate-scale-in">
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
