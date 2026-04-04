/**
 * WelcomeDiscountPopup — aparece automaticamente ao entrar no checkout
 * Informa ao cliente que ele ganhou 5% de desconto como presente de boas-vindas.
 * Ao clicar em "Aplicar desconto", o cupom é aplicado diretamente no estado do pai.
 */
import { useState } from "react";
import { X, Gift, Check, Copy } from "lucide-react";
import type { AppliedCoupon } from "./ExitIntentPopup";

const COUPON_CODE = "VOLTA5";
const COUPON_DISCOUNT_PCT = 5;
const STORAGE_KEY_SHOWN = "exit_intent_shown";
const STORAGE_KEY_COUPON = "applied_coupon";

interface WelcomeDiscountPopupProps {
  onApply: (coupon: AppliedCoupon) => void;
  onClose: () => void;
}

export default function WelcomeDiscountPopup({ onApply, onClose }: WelcomeDiscountPopupProps) {
  const [applied, setApplied] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleApply = () => {
    const coupon: AppliedCoupon = { code: COUPON_CODE, discountPct: COUPON_DISCOUNT_PCT };
    localStorage.setItem(STORAGE_KEY_COUPON, JSON.stringify(coupon));
    sessionStorage.setItem(STORAGE_KEY_SHOWN, "1");
    setApplied(true);
    setTimeout(() => {
      onApply(coupon);
    }, 900);
  };

  const handleClose = () => {
    sessionStorage.setItem(STORAGE_KEY_SHOWN, "1");
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(COUPON_CODE).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", zIndex: 9000 }}
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff" }}
      >
        {/* Header verde (boas-vindas) */}
        <div
          className="px-6 pt-6 pb-4 text-center relative"
          style={{ background: "linear-gradient(135deg, #00BFA5 0%, #00897B 100%)" }}
        >
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Ícone presente animado */}
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <Gift className="w-8 h-8 text-white" />
            </div>
          </div>

          <p className="text-white/90 text-sm font-medium mb-1">🎉 Parabéns! Você ganhou</p>
          <h2 className="text-white text-3xl font-extrabold leading-tight">
            {COUPON_DISCOUNT_PCT}% OFF
          </h2>
          <p className="text-white/90 text-sm mt-1">
            na sua compra de hoje!
          </p>
        </div>

        {/* Corpo */}
        <div className="px-6 py-5 text-center">
          <p className="text-gray-600 text-sm mb-4">
            Como cliente especial, preparamos um cupom exclusivo para você. Aplique agora e economize na sua compra:
          </p>

          {/* Cupom */}
          <div
            className="flex items-center justify-between gap-2 rounded-xl border-2 border-dashed px-4 py-3 mb-4"
            style={{ borderColor: "#00BFA5", background: "#F0FDF9" }}
          >
            <span
              className="text-2xl font-extrabold tracking-widest"
              style={{ color: "#00897B" }}
            >
              {COUPON_CODE}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: copied ? "#EE4D2D" : "#00BFA5",
                color: "#fff",
              }}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>

          {/* Botão aplicar */}
          <button
            onClick={handleApply}
            className="w-full py-3.5 rounded-xl font-extrabold text-white text-base transition-all active:scale-95"
            style={{
              background: applied
                ? "#00BFA5"
                : "linear-gradient(135deg, #00BFA5 0%, #00897B 100%)",
            }}
          >
            {applied ? "✓ Desconto aplicado!" : `Aplicar ${COUPON_DISCOUNT_PCT}% de desconto agora`}
          </button>

          <button
            onClick={handleClose}
            className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors underline"
          >
            Fechar e continuar sem desconto
          </button>
        </div>
      </div>
    </div>
  );
}
