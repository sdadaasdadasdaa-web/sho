/*
 * Timer de Urgência — Cronômetro regressivo de 30 minutos
 * Usado na página do produto (acima do preço) e no checkout
 * Persiste no sessionStorage para não resetar ao navegar entre páginas
 */
import { useState, useEffect, useRef } from "react";
import { Clock, Flame } from "lucide-react";

interface UrgencyTimerProps {
  /** Variante visual: "product" (inline acima do preço) ou "checkout" (barra fixa) */
  variant?: "product" | "checkout";
  /** Duração em minutos (padrão: 30) */
  durationMinutes?: number;
  /** ID do produto para persistir timer individual */
  productId?: number;
}

function getStorageKey(productId?: number) {
  return productId ? `urgency_timer_${productId}` : "urgency_timer_global";
}

function getEndTime(durationMinutes: number, productId?: number): number {
  const key = getStorageKey(productId);
  const stored = sessionStorage.getItem(key);
  if (stored) {
    const endTime = parseInt(stored, 10);
    if (endTime > Date.now()) return endTime;
  }
  const endTime = Date.now() + durationMinutes * 60 * 1000;
  sessionStorage.setItem(key, endTime.toString());
  return endTime;
}

export default function UrgencyTimer({
  variant = "product",
  durationMinutes = 30,
  productId,
}: UrgencyTimerProps) {
  const endTimeRef = useRef(getEndTime(durationMinutes, productId));
  const [timeLeft, setTimeLeft] = useState(() => {
    const diff = endTimeRef.current - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = endTimeRef.current - Date.now();
      const seconds = Math.max(0, Math.floor(diff / 1000));
      setTimeLeft(seconds);
      if (seconds <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");

  // Calcular porcentagem restante para a barra de progresso
  const totalSeconds = durationMinutes * 60;
  const progressPercent = (timeLeft / totalSeconds) * 100;

  // Cor muda conforme urgência
  const isUrgent = timeLeft < 300; // menos de 5 min
  const isCritical = timeLeft < 60; // menos de 1 min

  if (timeLeft <= 0) {
    return null; // Timer expirou, não mostrar
  }

  if (variant === "checkout") {
    return (
      <div
        className={`rounded-lg border-2 p-3 mb-4 transition-colors ${
          isCritical
            ? "border-red-500 bg-red-50"
            : isUrgent
            ? "border-orange-400 bg-orange-50"
            : "border-[#EE4D2D]/30 bg-[#FFF5F0]"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isCritical ? "bg-red-500" : "bg-[#EE4D2D]"
              }`}
            >
              <Flame className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-700">
                Oferta por tempo limitado!
              </p>
              <p className="text-[10px] text-gray-500">
                Finalize antes que expire
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div
              className={`px-2 py-1 rounded font-mono text-lg font-extrabold ${
                isCritical
                  ? "bg-red-500 text-white"
                  : "bg-[#EE4D2D] text-white"
              }`}
            >
              {pad(minutes)}
            </div>
            <span className="text-lg font-bold text-gray-400">:</span>
            <div
              className={`px-2 py-1 rounded font-mono text-lg font-extrabold ${
                isCritical
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-[#EE4D2D] text-white"
              }`}
            >
              {pad(seconds)}
            </div>
          </div>
        </div>
        {/* Barra de progresso */}
        <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isCritical ? "bg-red-500" : isUrgent ? "bg-orange-400" : "bg-[#EE4D2D]"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    );
  }

  // Variant: "product" — inline compacto acima do preço
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-t-lg transition-colors ${
        isCritical
          ? "bg-red-500"
          : isUrgent
          ? "bg-gradient-to-r from-red-500 to-[#EE4D2D]"
          : "bg-gradient-to-r from-[#EE4D2D] to-[#FF6533]"
      }`}
    >
      <Clock className="w-4 h-4 text-white" />
      <span className="text-xs font-bold text-white tracking-wide">
        OFERTA EXPIRA EM
      </span>
      <div className="flex items-center gap-0.5 ml-auto">
        <span className="bg-white/20 text-white font-mono text-sm font-extrabold px-1.5 py-0.5 rounded">
          {pad(minutes)}
        </span>
        <span className="text-white font-bold text-sm animate-pulse">:</span>
        <span className="bg-white/20 text-white font-mono text-sm font-extrabold px-1.5 py-0.5 rounded">
          {pad(seconds)}
        </span>
      </div>
      <Flame className={`w-4 h-4 text-yellow-300 ${isCritical ? "animate-bounce" : ""}`} />
    </div>
  );
}
