import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Hook de escassez: começa em 60 unidades e vai diminuindo aleatoriamente.
 * O estado é compartilhado via sessionStorage para manter consistência
 * entre a página do produto e o checkout.
 */

const STORAGE_KEY = "scarcity_stock";
const STORAGE_TS_KEY = "scarcity_ts";
const INITIAL_STOCK = 60;
const MIN_STOCK = 3; // Nunca chega a zero para manter urgência

function getStoredStock(): number {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    const ts = sessionStorage.getItem(STORAGE_TS_KEY);
    if (stored && ts) {
      const elapsed = Date.now() - Number(ts);
      // Se passou mais de 30 minutos, reseta
      if (elapsed > 30 * 60 * 1000) {
        sessionStorage.setItem(STORAGE_KEY, String(INITIAL_STOCK));
        sessionStorage.setItem(STORAGE_TS_KEY, String(Date.now()));
        return INITIAL_STOCK;
      }
      return Math.max(Number(stored), MIN_STOCK);
    }
  } catch {}
  // Primeira visita
  sessionStorage.setItem(STORAGE_KEY, String(INITIAL_STOCK));
  sessionStorage.setItem(STORAGE_TS_KEY, String(Date.now()));
  return INITIAL_STOCK;
}

function saveStock(stock: number) {
  try {
    sessionStorage.setItem(STORAGE_KEY, String(stock));
  } catch {}
}

export function useScarcity() {
  const [stock, setStock] = useState(() => getStoredStock());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleNextDrop = useCallback(() => {
    // Intervalo aleatório entre 8 e 25 segundos
    const delay = Math.floor(Math.random() * 17000) + 8000;

    timeoutRef.current = setTimeout(() => {
      setStock((prev) => {
        if (prev <= MIN_STOCK) return prev;
        // Diminui 1 ou 2 unidades aleatoriamente
        const drop = Math.random() > 0.6 ? 2 : 1;
        const next = Math.max(prev - drop, MIN_STOCK);
        saveStock(next);
        return next;
      });
    }, delay);
  }, []);

  useEffect(() => {
    // Agenda o primeiro drop
    scheduleNextDrop();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [scheduleNextDrop]);

  // Reagenda após cada mudança de stock
  useEffect(() => {
    if (stock > MIN_STOCK) {
      scheduleNextDrop();
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [stock, scheduleNextDrop]);

  return stock;
}
