/**
 * ExitIntentPopup — aparece quando o usuário tenta sair da página
 *
 * Desktop: detecta mouse saindo pela parte superior da janela (mouseleave)
 * Mobile:  usa um timer de 20s — evita o history trick que desincronizava o
 *          histórico do router e travava a navegação do carrinho.
 *
 * forceShow: quando true, exibe o popup imediatamente (usado pelo botão Voltar do checkout).
 * onApply:   callback para aplicar o cupom diretamente no estado do pai (sem reload).
 *
 * Só exibe uma vez por sessão (exceto quando forceShow=true).
 */
import { useEffect, useState, useCallback, useRef } from "react";
import { X, Tag, Copy, Check } from "lucide-react";

const COUPON_CODE = "VOLTA5";
const COUPON_DISCOUNT_PCT = 5;
const STORAGE_KEY_SHOWN = "exit_intent_shown";
const STORAGE_KEY_COUPON = "applied_coupon";

export interface AppliedCoupon {
  code: string;
  discountPct: number;
}

export function getAppliedCoupon(): AppliedCoupon | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COUPON);
    if (!raw) return null;
    return JSON.parse(raw) as AppliedCoupon;
  } catch {
    return null;
  }
}

export function clearAppliedCoupon() {
  localStorage.removeItem(STORAGE_KEY_COUPON);
}

interface ExitIntentPopupProps {
  enabled?: boolean;
  /** Se true, exibe o popup imediatamente (usado pelo botão Voltar do checkout) */
  forceShow?: boolean;
  /** Callback quando o cupom é aplicado — aplica no estado do pai sem reload */
  onApply?: (coupon: AppliedCoupon) => void;
  /** Callback quando o popup é fechado */
  onClose?: () => void;
}

export default function ExitIntentPopup({
  enabled = true,
  forceShow = false,
  onApply,
  onClose,
}: ExitIntentPopupProps) {
  const [visible, setVisible] = useState(forceShow);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const historyPushed = useRef(false); // mantido para compatibilidade com forceShow

  // Sincroniza quando forceShow muda para true
  useEffect(() => {
    if (forceShow) setVisible(true);
  }, [forceShow]);

  const showPopup = useCallback(() => {
    const alreadyShown = sessionStorage.getItem(STORAGE_KEY_SHOWN);
    if (!alreadyShown) {
      setVisible(true);
      sessionStorage.setItem(STORAGE_KEY_SHOWN, "1");
    }
  }, []);

  // ── Desktop: mouse sai pela parte superior ──────────────────────────────────
  const handleMouseLeave = useCallback(
    (e: MouseEvent) => {
      if (e.clientY <= 5) showPopup();
    },
    [showPopup]
  );

  useEffect(() => {
    if (!enabled) return;
    const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isMobile) return;

    const timer = setTimeout(() => {
      document.addEventListener("mouseleave", handleMouseLeave);
    }, 3000);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [enabled, handleMouseLeave]);

  // ── Mobile: timer 20s (sem history trick para não quebrar navegação) ──────────
  useEffect(() => {
    if (!enabled) return;
    const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!isMobile) return;

    const alreadyShown = sessionStorage.getItem(STORAGE_KEY_SHOWN);
    if (alreadyShown) return;

    const timer = setTimeout(() => {
      showPopup();
    }, 20000);

    return () => {
      clearTimeout(timer);
    };
  }, [enabled, showPopup]);

  // ── Fechar popup ─────────────────────────────────────────────────────────────
  const closePopup = useCallback(
    (navigateBack = false) => {
      setVisible(false);
      onClose?.();
      if (navigateBack && forceShow) {
        // Popup aberto pelo botão Voltar do checkout — navega de volta
        window.history.back();
      }
    },
    [onClose, forceShow]
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(COUPON_CODE).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    const coupon: AppliedCoupon = { code: COUPON_CODE, discountPct: COUPON_DISCOUNT_PCT };
    localStorage.setItem(STORAGE_KEY_COUPON, JSON.stringify(coupon));
    setApplied(true);
    if (onApply) {
      // Modo checkout: aplica diretamente no estado do pai (sem reload)
      setTimeout(() => {
        onApply(coupon);
        closePopup(false);
      }, 900);
    } else {
      // Modo produto: fecha e o checkout lê do localStorage
      setTimeout(() => closePopup(false), 1200);
    }
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", zIndex: 9000 }}
      onClick={() => closePopup(false)}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff" }}
      >
        {/* Header laranja */}
        <div
          className="px-6 pt-6 pb-4 text-center"
          style={{ background: "linear-gradient(135deg, #EE4D2D 0%, #FF7337 100%)" }}
        >
          <button
            onClick={() => closePopup(false)}
            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex justify-center mb-2">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
              <Tag className="w-7 h-7 text-white" />
            </div>
          </div>
          <h2 className="text-white text-xl font-extrabold leading-tight">
            Espera! Não vá embora ainda
          </h2>
          <p className="text-white/90 text-sm mt-1">
            Temos um presente especial para você
          </p>
        </div>

        {/* Corpo */}
        <div className="px-6 py-5 text-center">
          <p className="text-gray-600 text-sm mb-4">
            Use o cupom abaixo e ganhe{" "}
            <span className="font-bold text-[#EE4D2D]">{COUPON_DISCOUNT_PCT}% de desconto</span>{" "}
            na sua compra agora mesmo:
          </p>

          {/* Cupom */}
          <div
            className="flex items-center justify-between gap-2 rounded-xl border-2 border-dashed px-4 py-3 mb-4"
            style={{ borderColor: "#EE4D2D", background: "#FFF5F3" }}
          >
            <span
              className="text-2xl font-extrabold tracking-widest"
              style={{ color: "#EE4D2D" }}
            >
              {COUPON_CODE}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: copied ? "#00BFA5" : "#EE4D2D",
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
            className="w-full py-3 rounded-xl font-extrabold text-white text-base transition-all active:scale-95"
            style={{
              background: applied
                ? "#00BFA5"
                : "linear-gradient(135deg, #EE4D2D 0%, #FF7337 100%)",
            }}
          >
            {applied ? "✓ Cupom aplicado!" : `Aplicar ${COUPON_DISCOUNT_PCT}% de desconto`}
          </button>

          <button
            onClick={() => closePopup(true)}
            className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors underline"
          >
            Não, obrigado. Prefiro pagar o valor cheio.
          </button>
        </div>
      </div>
    </div>
  );
}
