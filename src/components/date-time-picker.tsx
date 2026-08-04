"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parse,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const TIME_PRESETS = ["09:00", "12:00", "15:00", "18:00", "21:00"];

interface Props {
  value: string; // "yyyy-MM-dd'T'HH:mm"
  onChange: (value: string) => void;
}

export function DateTimePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const selectedDate = value ? parse(value.slice(0, 10), "yyyy-MM-dd", new Date()) : null;
  const selectedTime = value ? value.slice(11, 16) : "";
  const [viewMonth, setViewMonth] = useState(() => selectedDate ?? new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { locale: ptBR });
    const end = endOfWeek(endOfMonth(viewMonth), { locale: ptBR });
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  function setDate(day: Date) {
    const time = selectedTime || "12:00";
    onChange(`${format(day, "yyyy-MM-dd")}T${time}`);
  }

  function setTime(time: string) {
    const day = selectedDate ?? new Date();
    onChange(`${format(day, "yyyy-MM-dd")}T${time}`);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left text-white outline-none focus:border-sky-500"
      >
        {selectedDate ? (
          <span className="capitalize">
            {format(selectedDate, "EEE, d 'de' MMM", { locale: ptBR })} às {selectedTime || "--:--"}
          </span>
        ) : (
          <span className="text-[var(--muted)]">Escolher data e hora</span>
        )}
        <ClockIcon className="h-4 w-4 text-[var(--muted)]" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div className="animate-scale-in absolute z-40 mt-2 w-72 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-2xl">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDate(new Date())}
                className="flex-1 rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--surface-hover)]"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setDate(addDays(new Date(), 1))}
                className="flex-1 rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--surface-hover)]"
              >
                Amanhã
              </button>
              <button
                type="button"
                onClick={() => setDate(addDays(new Date(), 3))}
                className="flex-1 rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--surface-hover)]"
              >
                +3 dias
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewMonth((m) => subMonths(m, 1))}
                className="rounded px-2 py-1 text-sm hover:bg-[var(--surface-hover)]"
              >
                ‹
              </button>
              <span className="text-sm font-medium capitalize">
                {format(viewMonth, "MMMM yyyy", { locale: ptBR })}
              </span>
              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
                className="rounded px-2 py-1 text-sm hover:bg-[var(--surface-hover)]"
              >
                ›
              </button>
            </div>

            <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] text-[var(--muted)]">
              {WEEKDAYS.map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {days.map((day) => {
                const selected = selectedDate && isSameDay(day, selectedDate);
                const inMonth = isSameMonth(day, viewMonth);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setDate(day)}
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs transition-colors ${
                      selected
                        ? "nex-gradient-bg text-white"
                        : isToday(day)
                          ? "border border-sky-500 text-sky-400"
                          : inMonth
                            ? "text-neutral-300 hover:bg-[var(--surface-hover)]"
                            : "text-neutral-600 hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 border-t border-[var(--border)] pt-3">
              <div className="flex flex-wrap gap-1.5">
                {TIME_PRESETS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTime(t)}
                    className={`rounded-md border px-2 py-1 text-xs ${
                      selectedTime === t
                        ? "border-sky-500 bg-sky-950/40 text-sky-300"
                        : "border-[var(--border)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setTime(e.target.value)}
                  className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs text-white"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="nex-gradient-bg mt-3 w-full rounded-md py-1.5 text-sm font-medium text-white"
            >
              Pronto
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
