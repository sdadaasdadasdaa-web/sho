/*
 * Design: Bazaar Digital — Página de Pagamento PIX
 * Exibe QR Code gerado a partir do código PIX, código copia-e-cola, timer de expiração
 * e verificação automática de status via polling
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { QRCodeSVG } from "qrcode.react";
import { ShoppingCart, Copy, Check, Clock, Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function PaymentPix() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const [copied, setCopied] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  // Get PIX data from sessionStorage (saved during checkout)
  const pixData = useMemo(() => getPixDataFromStorage(transactionId || ""), [transactionId]);

  // Calculate time left from expiration date
  const [timeLeft, setTimeLeft] = useState(() => {
    if (pixData?.expirationDate) {
      const diff = Math.floor((new Date(pixData.expirationDate).getTime() - Date.now()) / 1000);
      return Math.max(0, diff);
    }
    return 30 * 60; // Default 30 minutos
  });

  // Fetch transaction status periodically
  const statusQuery = trpc.payment.checkStatus.useQuery(
    { transactionId: transactionId || "" },
    {
      enabled: !!transactionId,
      refetchInterval: paymentConfirmed ? false : 5000, // Poll every 5 seconds
    }
  );

  // Check if payment was confirmed
  useEffect(() => {
    if (statusQuery.data?.status === "paid" || statusQuery.data?.status === "PAID" || statusQuery.data?.status === "APPROVED" || statusQuery.data?.status === "COMPLETED") {
      setPaymentConfirmed(true);
    }
  }, [statusQuery.data?.status]);

  // Countdown timer
  useEffect(() => {
    if (paymentConfirmed) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [paymentConfirmed]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatPrice = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  }, []);

  // Payment confirmed screen
  if (paymentConfirmed) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
        <header className="bg-white border-b border-gray-100">
          <div className="container flex items-center gap-3 py-3">
            <Link href="/" className="flex items-center">
              <img
                src="/shopee-logo-color.png"
                alt="Shopee"
                className="h-8 w-auto object-contain"
              />
            </Link>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-8 md:p-12 text-center max-w-md w-full shadow-sm">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-800 mb-2">Pagamento Confirmado!</h1>
            <p className="text-gray-500 mb-2">
              Seu pagamento via PIX foi recebido com sucesso.
            </p>
            <p className="text-gray-500 mb-6">
              Em breve você receberá um e-mail com os detalhes do pedido e o código de rastreamento.
            </p>
            {statusQuery.data?.amount && (
              <p className="text-lg font-bold mb-6" style={{ color: "#EE4D2D" }}>
                {formatPrice(statusQuery.data.amount)}
              </p>
            )}
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3 rounded text-white font-bold text-sm"
              style={{ background: "#EE4D2D" }}
            >
              Continuar Comprando
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (statusQuery.isLoading && !statusQuery.data && !pixData) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: "#EE4D2D" }} />
          <p className="text-gray-500">Carregando dados do pagamento...</p>
        </div>
      </div>
    );
  }

  // Error state - no PIX data and status query also failed
  if (!pixData?.qrCode && statusQuery.isError) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 text-center max-w-md w-full shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Erro ao carregar pagamento</h1>
          <p className="text-gray-500 mb-6">Não foi possível carregar os dados da transação. Tente novamente.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded text-white font-bold text-sm"
            style={{ background: "#EE4D2D" }}
          >
            Voltar à Loja
          </Link>
        </div>
      </div>
    );
  }

  // No PIX data in sessionStorage but transaction exists (e.g. direct URL access or page refresh)
  if (!pixData?.qrCode && statusQuery.data && statusQuery.data.status === "pending") {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 text-center max-w-md w-full shadow-sm">
          <Clock className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Pagamento Pendente</h1>
          <p className="text-gray-500 mb-2">Seu PIX foi gerado mas os dados do QR Code não estão mais disponíveis neste navegador.</p>
          <p className="text-gray-500 mb-4">Se você já copiou o código PIX, finalize o pagamento no app do seu banco.</p>
          {statusQuery.data.amount && (
            <p className="text-lg font-bold mb-4" style={{ color: "#EE4D2D" }}>
              {formatPrice(statusQuery.data.amount)}
            </p>
          )}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-6">
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#EE4D2D" }} />
            Aguardando confirmação do pagamento...
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded text-white font-bold text-sm"
            style={{ background: "#EE4D2D" }}
          >
            Voltar à Loja
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="container flex items-center gap-3 py-3">
          <Link href="/" className="flex items-center">
            <img
              src="/shopee-logo-color.png"
              alt="Shopee"
              className="h-8 w-auto object-contain"
            />
          </Link>
          <span className="text-gray-300">|</span>
          <span className="text-base font-semibold text-gray-700">Pagamento PIX</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 md:p-8 max-w-lg w-full shadow-sm">
          {/* Timer */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-semibold text-gray-600">Expira em</span>
            </div>
            <p className="text-3xl font-extrabold font-mono" style={{ color: timeLeft < 300 ? "#EF4444" : "#EE4D2D" }}>
              {formatTime(timeLeft)}
            </p>
          </div>

          {/* Amount */}
          {statusQuery.data?.amount && (
            <div className="text-center mb-6 p-4 rounded-lg bg-orange-50 border border-orange-200">
              <p className="text-sm text-gray-600 mb-1">Valor a pagar:</p>
              <p className="text-2xl font-extrabold" style={{ color: "#EE4D2D" }}>
                {formatPrice(statusQuery.data.amount)}
              </p>
            </div>
          )}

          {/* QR Code - Generated from PIX code using qrcode.react */}
          {pixData?.qrCode && (
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                <QRCodeSVG
                  value={pixData.qrCode}
                  size={220}
                  level="M"
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                />
              </div>
            </div>
          )}

          {/* Copy-paste code */}
          {pixData?.qrCode && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-500 mb-2 text-center">
                Ou copie o código PIX Copia e Cola:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={pixData.qrCode}
                  className="flex-1 h-11 px-3 border border-gray-200 rounded text-xs bg-gray-50 text-gray-600 truncate"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(pixData.qrCode)}
                  className="h-11 px-4 rounded text-white font-bold text-sm flex items-center gap-2 transition-all hover:opacity-90 shrink-0"
                  style={{ background: copied ? "#22c55e" : "#EE4D2D" }}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copiar
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Como pagar:</h3>
            <ol className="space-y-2 text-xs text-gray-600">
              <li className="flex gap-2">
                <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0" style={{ background: "#EE4D2D" }}>1</span>
                Abra o app do seu banco ou carteira digital
              </li>
              <li className="flex gap-2">
                <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0" style={{ background: "#EE4D2D" }}>2</span>
                Escolha pagar via PIX com QR Code ou código
              </li>
              <li className="flex gap-2">
                <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0" style={{ background: "#EE4D2D" }}>3</span>
                Escaneie o QR Code ou cole o código copiado
              </li>
              <li className="flex gap-2">
                <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0" style={{ background: "#EE4D2D" }}>4</span>
                Confirme o pagamento — a confirmação é automática!
              </li>
            </ol>
          </div>

          {/* Status indicator */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#EE4D2D" }} />
            Aguardando pagamento...
          </div>
        </div>
      </main>
    </div>
  );
}

// Helper to get PIX data from sessionStorage
function getPixDataFromStorage(transactionId: string): { qrCode: string; qrCodeImageUrl: string | null; expirationDate: string | null } | null {
  try {
    const stored = sessionStorage.getItem(`pix_${transactionId}`);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return null;
}
