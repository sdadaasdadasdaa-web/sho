import { useScarcity } from "@/hooks/useScarcity";
import { Flame, AlertTriangle, Zap } from "lucide-react";

interface ScarcityBadgeProps {
  variant?: "product" | "checkout";
}

export default function ScarcityBadge({ variant = "product" }: ScarcityBadgeProps) {
  const stock = useScarcity();

  const isLow = stock <= 15;
  const isCritical = stock <= 8;

  if (variant === "checkout") {
    return (
      <div className="relative overflow-hidden rounded-lg border-2 border-red-400 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 p-4 shadow-lg">
        {/* Animated background pulse */}
        <div className="absolute inset-0 bg-white/5 animate-pulse" />
        <div className="relative flex items-center gap-3">
          <div className="shrink-0 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center animate-bounce">
            <Flame className="w-7 h-7 text-yellow-300 drop-shadow-lg" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-yellow-300" />
              <span className="text-white font-extrabold text-sm uppercase tracking-wider">
                {isCritical ? "Quase esgotando!" : isLow ? "Estoque acabando!" : "Alta procura!"}
              </span>
            </div>
            <div className="text-white text-sm">
              Restam apenas{" "}
              <span className="inline-flex items-center justify-center bg-white text-red-600 font-black text-lg px-2.5 py-0.5 rounded-md mx-1 shadow-inner min-w-[2.5rem] tabular-nums">
                {stock}
              </span>
              {" "}unidades — finalize sua compra agora!
            </div>
          </div>
        </div>
        {/* Progress bar showing stock depletion */}
        <div className="relative mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-yellow-300 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${(stock / 60) * 100}%` }}
          />
        </div>
        <p className="text-white/70 text-[10px] mt-1.5 text-center">
          {Math.round(((60 - stock) / 60) * 100)}% do estoque já foi vendido hoje
        </p>
      </div>
    );
  }

  // Variant: product page — barra chamativa abaixo do timer
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-red-600 via-red-500 to-orange-500 px-4 py-3">
      {/* Shimmer effect */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
          animation: "shimmer 2s infinite",
        }}
      />
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
      <div className="relative flex items-center justify-center gap-3">
        <Flame className={`w-5 h-5 text-yellow-300 shrink-0 ${isCritical ? "animate-bounce" : ""}`} />
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <span className="uppercase tracking-wide text-xs text-yellow-200">
            {isCritical ? "Quase esgotando!" : isLow ? "Estoque baixo!" : "Alta procura!"}
          </span>
          <span className="text-white/60">|</span>
          <span>
            Restam{" "}
            <span className="inline-flex items-center justify-center bg-white text-red-600 font-black text-base px-2 py-0.5 rounded mx-0.5 shadow-md min-w-[2rem] tabular-nums">
              {stock}
            </span>
            {" "}unidades
          </span>
        </div>
        <Flame className={`w-5 h-5 text-yellow-300 shrink-0 ${isCritical ? "animate-bounce" : ""}`} />
      </div>
    </div>
  );
}
