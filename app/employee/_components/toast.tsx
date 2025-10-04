"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ToastItem = { id: number; message: string; href?: string };
type ToastCtx = { show: (msg: string, href?: string) => void };

const Ctx = createContext<ToastCtx | null>(null);

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider/>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(1);

  const show = useCallback((message: string, href?: string) => {
    const id = idRef.current++;
    setItems((prev) => [...prev, { id, message, href }]);
    // auto-dismiss après 3500 ms
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {/* Host */}
      <div className="pointer-events-none fixed inset-0 z-[60] flex items-end justify-end p-4">
        <div className="flex w-full max-w-sm flex-col gap-2">
          {items.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto rounded-2xl border border-black/10 bg-white/95 p-3 shadow-lg backdrop-blur"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-block h-2 w-2 flex-none rounded-full bg-emerald-500" />
                <div className="flex-1 text-sm text-neutral-900">
                  {t.message}
                  {t.href ? (
                    <>
                      {" "}
                      <a
                        href={t.href}
                        className="font-semibold underline underline-offset-2 hover:opacity-80"
                      >
                        Voir mes certificats
                      </a>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Ctx.Provider>
  );
}
