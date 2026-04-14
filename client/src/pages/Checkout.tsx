/*
 * Design: Bazaar Digital — Checkout simples com Order Bump dinâmico + Pagamento Sigilo Pay PIX
 * Formulário de dados, order bumps contextuais, opções de frete, resumo do pedido
 * Nicho: Ferramentas
 */
import { useState, useMemo, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { trpc } from "@/lib/trpc";
import { ShoppingCart, Lock, ChevronLeft, Check, Zap, Gift, Flame, Truck, Loader2, ShieldCheck, Star, Minus, Plus } from "lucide-react";
import { checkoutSuccessImage, getOrderBumpsForCart, shippingOptions, type ShippingOption } from "@/lib/data";
import UrgencyTimer from "@/components/UrgencyTimer";
import ScarcityBadge from "@/components/ScarcityBadge";
import { getUtmifyTrackingParams } from "@/components/UtmifyTracker";
import { getItemPrice } from "@/lib/pricing";
import ExitIntentPopup, { getAppliedCoupon, clearAppliedCoupon, type AppliedCoupon } from "@/components/ExitIntentPopup";
import WelcomeDiscountPopup from "@/components/WelcomeDiscountPopup";

export default function Checkout() {
  const { items, totalPrice, totalItems, clearCart, updateQuantity } = useCart();
  const [, navigate] = useLocation();
  const [selectedBumps, setSelectedBumps] = useState<Set<number>>(new Set());
  const [bumpSizes, setBumpSizes] = useState<Record<number, string>>({}); // Tamanho selecionado por bump
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [cpf, setCpf] = useState("");

  // Determine which shipping options are available based on cart items
  const productIds = useMemo(() => items.map((i) => i.product.id), [items]);
  const currentBumps = useMemo(() => getOrderBumpsForCart(productIds), [productIds]);

  // Shipping: check if any product has custom shipping
  const hasCustomShipping = useMemo(() => {
    return productIds.some((id) => shippingOptions[id]);
  }, [productIds]);

  const customShippingOpts: ShippingOption[] = useMemo(() => {
    for (const id of productIds) {
      if (shippingOptions[id]) return shippingOptions[id];
    }
    return [];
  }, [productIds]);

  const [selectedShippingIdx, setSelectedShippingIdx] = useState(0);

  // Frete padrão (Correios/Sedex/Jadlog) para produtos sem frete customizado
  const defaultShippingOpts = useMemo(() => [
    {
      label: "Correios",
      price: 0,
      days: "7 a 12 dias úteis",
      logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663285681492/T9MpEVnAhq2PrGidiTemVi/correios_614e42c9.png",
    },
    {
      label: "Sedex",
      price: 16.87,
      days: "4 a 7 dias úteis",
      logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663285681492/T9MpEVnAhq2PrGidiTemVi/sedex_3525a775.png",
    },
    {
      label: "Jadlog",
      price: 19.76,
      days: "3 a 6 dias úteis",
      logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663285681492/T9MpEVnAhq2PrGidiTemVi/jadlog_735e706a.png",
    },
  ], []);

  // Popup de boas-vindas: aparece automaticamente ao entrar no checkout (1x por sessão)
  // Também serve como exit-intent quando o usuário clica em Voltar
  const [showWelcomePopup, setShowWelcomePopup] = useState(() => {
    // Mostra imediatamente se o cupom ainda não foi aplicado nesta sessão
    const alreadyShown = sessionStorage.getItem("exit_intent_shown");
    const alreadyApplied = localStorage.getItem("applied_coupon");
    return !alreadyShown && !alreadyApplied;
  });
  // Mostra popup exit-intent ao clicar em Voltar
  const [showExitPopup, setShowExitPopup] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  });

  const bumpTotal = currentBumps
    .filter((b) => selectedBumps.has(b.id))
    .reduce((sum, b) => sum + b.price, 0);

  // Shipping cost logic
  const activeShippingOpts = hasCustomShipping ? customShippingOpts : defaultShippingOpts;
  const shippingCost = activeShippingOpts[selectedShippingIdx]?.price ?? 0;

  // Cupom de desconto aplicado via exit-intent popup
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(() => getAppliedCoupon());
  const couponDiscount = appliedCoupon
    ? Math.round(((totalPrice + bumpTotal) * appliedCoupon.discountPct) / 100 * 100) / 100
    : 0;

  // Callback quando o usuário aplica o cupom no popup
  const handleCouponApply = useCallback((coupon: AppliedCoupon) => {
    setAppliedCoupon(coupon);
  }, []);

  const finalTotal = totalPrice + bumpTotal + shippingCost - couponDiscount;

  const formatPrice = (price: number) =>
    price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Máscaras de formatação automática
  const maskCpf = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const maskPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : "";
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const maskCep = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let maskedValue = value;
    if (name === "phone") maskedValue = maskPhone(value);
    else if (name === "cep") maskedValue = maskCep(value);
    setForm((prev) => ({ ...prev, [name]: maskedValue }));
    // Clear error on change
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleCepBlur = async () => {
    const cleanCep = form.cep.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setForm((prev) => ({
            ...prev,
            street: data.logradouro || prev.street,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city,
            state: data.uf || prev.state,
          }));
        }
      } catch {
        // Silently fail
      }
    }
  };

  const toggleBump = (id: number) => {
    setSelectedBumps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // tRPC mutation for creating PIX payment
  const createPixMutation = trpc.payment.createPix.useMutation({
    onSuccess: (data, variables) => {
      // Save PIX data to sessionStorage for the payment page
      // sessionStorage is cleared when the tab closes (safer than localStorage)
      if (data.pix) {
        sessionStorage.setItem(
          `pix_${data.transactionId}`,
          JSON.stringify({
            qrCode: data.pix.qrCode,
            qrCodeImageUrl: data.pix.qrCodeImageUrl,
            expirationDate: data.pix.expirationDate,
          })
        );
        // Salvar dados completos do pedido para envio do UTMify "paid" sem depender do DB
        const cleanPhone = variables.customer.phone.replace(/\D/g, "");
        const cleanCpf = variables.customer.cpf.replace(/\D/g, "");
        const utmifyProducts = variables.items.map((item, idx) => ({
          id: (item as any).externalRef || `item-${idx + 1}`,
          name: item.title,
          quantity: item.quantity,
          priceInCents: item.unitPrice * item.quantity,
        }));
        sessionStorage.setItem(
          `order_${data.transactionId}`,
          JSON.stringify({
            externalRef: data.externalRef,
            createdAt: new Date().toISOString().replace("T", " ").substring(0, 19),
            totalInCents: data.amount,
            customer: {
              name: variables.customer.name,
              email: variables.customer.email,
              phone: cleanPhone,
              cpf: cleanCpf,
            },
            products: utmifyProducts,
            trackingParams: variables.trackingParams || null,
          })
        );
      }
      clearCart();
      clearAppliedCoupon(); // Limpar cupom após uso
      // Navigate to payment page with transaction ID
      navigate(`/pagamento/${data.transactionId}`);
    },
    onError: (error) => {
      const msg = error.message;
      console.error("[Checkout] Erro ao criar PIX:", msg);
      if (msg.includes("CPF")) {
        setFormErrors((prev) => ({ ...prev, cpf: "CPF inválido. Verifique e tente novamente." }));
        // Scroll para o campo de CPF
        const cpfEl = document.querySelector('[name="cpf"]') as HTMLElement;
        if (cpfEl) {
          cpfEl.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => cpfEl.focus(), 400);
        }
      } else if (msg.includes("Credenciais") || msg.includes("gateway")) {
        alert("Sistema de pagamento temporariamente indisponível. Tente novamente em alguns minutos.");
      } else if (msg.includes("indisponível") || msg.includes("Servidor")) {
        alert("Servidor de pagamento temporariamente indisponível. Tente novamente em alguns minutos.");
      } else {
        alert("Ocorreu um erro ao gerar o PIX. Por favor, verifique seus dados e tente novamente.");
      }
    },
  });

  // Validação de CPF com dígitos verificadores
  const isValidCpf = (raw: string): boolean => {
    const digits = raw.replace(/\D/g, "");
    if (digits.length !== 11) return false;
    // Rejeitar sequências iguais (000.000.000-00, 111... etc)
    if (/^(\d)\1{10}$/.test(digits)) return false;
    // Calcular dígitos verificadores
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
    let rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    if (rest !== parseInt(digits[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    return rest === parseInt(digits[10]);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Nome é obrigatório";
    if (!form.email.trim() || !form.email.includes("@")) errors.email = "E-mail inválido";
    if (!form.phone.trim() || form.phone.replace(/\D/g, "").length < 10) errors.phone = "Telefone inválido";
    if (!cpf.trim() || !isValidCpf(cpf)) errors.cpf = "CPF inválido";
    if (!form.cep.trim() || form.cep.replace(/\D/g, "").length < 8) errors.cep = "CEP inválido";
    if (!form.street.trim()) errors.street = "Rua é obrigatória";
    if (!form.number.trim()) errors.number = "Número é obrigatório";
    if (!form.neighborhood.trim()) errors.neighborhood = "Bairro é obrigatório";
    if (!form.city.trim()) errors.city = "Cidade é obrigatória";
    if (!form.state.trim()) errors.state = "Estado é obrigatório";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      // Scroll para o primeiro campo com erro
      const fieldOrder = ["name", "email", "phone", "cpf", "cep", "street", "number", "neighborhood", "city", "state"];
      const firstError = fieldOrder.find((f) => {
        const errs: Record<string, string> = {};
        if (!form.name.trim()) errs.name = "x";
        if (!form.email.trim() || !form.email.includes("@")) errs.email = "x";
        if (!form.phone.trim() || form.phone.replace(/\D/g, "").length < 10) errs.phone = "x";
        if (!cpf.trim() || !isValidCpf(cpf)) errs.cpf = "x";
        if (!form.cep.trim() || form.cep.replace(/\D/g, "").length < 8) errs.cep = "x";
        if (!form.street.trim()) errs.street = "x";
        if (!form.number.trim()) errs.number = "x";
        if (!form.neighborhood.trim()) errs.neighborhood = "x";
        if (!form.city.trim()) errs.city = "x";
        if (!form.state.trim()) errs.state = "x";
        return errs[f];
      });
      if (firstError) {
        const el = document.querySelector(`[name="${firstError}"]`) as HTMLElement;
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => el.focus(), 400);
        }
      }
      return;
    }

    // Build items array (cart items + selected bumps)
    const paymentItems = [
      ...items.map((item) => ({
        title: item.product.name,
        unitPrice: Math.round(getItemPrice(item) * 100), // centavos
        quantity: item.quantity,
        tangible: true,
        externalRef: `product-${item.product.id}`,
      })),
      ...currentBumps
        .filter((b) => selectedBumps.has(b.id))
        .map((bump) => ({
          title: bump.name,
          unitPrice: Math.round(bump.price * 100),
          quantity: 1,
          tangible: true,
          externalRef: `bump-${bump.id}`,
        })),
    ];

    // Aplicar desconto do cupom como item negativo
    if (couponDiscount > 0 && appliedCoupon) {
      paymentItems.push({
        title: `Cupom ${appliedCoupon.code} (-${appliedCoupon.discountPct}%)`,
        unitPrice: -Math.round(couponDiscount * 100), // valor negativo em centavos
        quantity: 1,
        tangible: false,
        externalRef: `coupon-${appliedCoupon.code}`,
      });
    }

    // Capturar UTM parameters (URL + localStorage + cookies) para enviar à UTMify
    const trackingParams = getUtmifyTrackingParams();

    createPixMutation.mutate({
      customer: {
        name: form.name,
        email: form.email,
        cpf: cpf,
        phone: form.phone,
        address: {
          street: form.street,
          streetNumber: form.number,
          complement: form.complement,
          zipCode: form.cep,
          neighborhood: form.neighborhood,
          city: form.city,
          state: form.state,
          country: "br",
        },
      },
      items: paymentItems,
      shippingFee: Math.round(shippingCost * 100),
      trackingParams,
    });
  };

  if (items.length === 0 && !createPixMutation.isSuccess) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      {/* Simplified header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const alreadyShown = sessionStorage.getItem("exit_intent_shown");
                if (!alreadyShown) {
                  setShowExitPopup(true);
                  sessionStorage.setItem("exit_intent_shown", "1");
                } else {
                  window.history.back();
                }
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <Link href="/" className="flex items-center">
              <img
                src="/shopee-logo-color.png"
                alt="Shopee"
                className="h-8 w-auto object-contain"
              />
            </Link>
            <span className="text-gray-300">|</span>
            <span className="text-base font-semibold text-gray-700">Checkout</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Lock className="w-3.5 h-3.5" />
            Ambiente Seguro
          </div>
        </div>
      </header>

      <main className="flex-1">
        <form onSubmit={handleSubmit}>
          <div className="container py-4 md:py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Form */}
              <div className="lg:col-span-2 space-y-4">
                {/* Headline de urgência — Finca Pino */}
                {productIds.includes(30) && (() => {
                  const hoje = new Date();
                  const dia = hoje.getDate().toString().padStart(2, '0');
                  const mes = (hoje.getMonth() + 1).toString().padStart(2, '0');
                  return (
                    <div className="rounded-lg overflow-hidden border-2 border-red-500 bg-red-600 px-4 py-2.5 flex items-center justify-center gap-2 animate-pulse">
                      <span className="text-white text-sm font-extrabold tracking-wide text-center">
                        🔥 Essa oferta só vai até HOJE {dia}/{mes}. Lote limitado!
                      </span>
                    </div>
                  );
                })()}
                {/* Timer de Urgência */}
                <UrgencyTimer variant="checkout" durationMinutes={30} />
                {/* Contador de escassez */}
                {(productIds.includes(22) || productIds.includes(23) || productIds.includes(30)) && (
                  <ScarcityBadge variant="checkout" />
                )}
                {/* Banner de entrega */}
                <div className="rounded-lg overflow-hidden shadow-sm" style={{ background: "#EE4D2D" }}>
                  <div className="flex items-center justify-between px-5 py-4 relative">
                    <div className="relative z-10">
                      <p className="text-white font-extrabold text-xl md:text-2xl leading-tight uppercase tracking-wide drop-shadow">
                        ENTREGO TUDO<br />RAPIDINHO<br />NA SUA CASA
                      </p>
                    </div>
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <div className="absolute top-0 bottom-0 right-1/3 w-16 bg-white/20 skew-x-[-12deg]" />
                    </div>
                    <div className="text-right relative z-10 text-5xl md:text-6xl">
                      🚐
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className="bg-white rounded-sm p-4 md:p-6">
                  <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ background: "#EE4D2D" }}>1</span>
                    Informações de Contato
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Nome Completo *</label>
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        maxLength={80}
                        className={`w-full h-11 px-3 border rounded text-sm focus:outline-none focus:border-[#EE4D2D] focus:ring-1 focus:ring-[#EE4D2D]/30 transition-all ${formErrors.name ? "border-red-400" : "border-gray-200"}`}
                        placeholder="Seu nome completo"
                      />
                      {formErrors.name && <p className="text-red-500 text-[10px] mt-1">{formErrors.name}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">E-mail *</label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                        maxLength={60}
                        className={`w-full h-11 px-3 border rounded text-sm focus:outline-none focus:border-[#EE4D2D] focus:ring-1 focus:ring-[#EE4D2D]/30 transition-all ${formErrors.email ? "border-red-400" : "border-gray-200"}`}
                        placeholder="seu@email.com"
                      />
                      {formErrors.email && <p className="text-red-500 text-[10px] mt-1">{formErrors.email}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">CPF *</label>
                      <input
                        type="text"
                        name="cpf"
                        value={cpf}
                        onChange={(e) => {
                          setCpf(maskCpf(e.target.value));
                          if (formErrors.cpf) {
                            setFormErrors((prev) => {
                              const next = { ...prev };
                              delete next.cpf;
                              return next;
                            });
                          }
                        }}
                        required
                        maxLength={14}
                        className={`w-full h-11 px-3 border rounded text-sm focus:outline-none focus:border-[#EE4D2D] focus:ring-1 focus:ring-[#EE4D2D]/30 transition-all ${formErrors.cpf ? "border-red-400" : "border-gray-200"}`}
                        placeholder="000.000.000-00"
                      />
                      {formErrors.cpf && <p className="text-red-500 text-[10px] mt-1">{formErrors.cpf}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Telefone / WhatsApp *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        required
                        maxLength={15}
                        className={`w-full h-11 px-3 border rounded text-sm focus:outline-none focus:border-[#EE4D2D] focus:ring-1 focus:ring-[#EE4D2D]/30 transition-all ${formErrors.phone ? "border-red-400" : "border-gray-200"}`}
                        placeholder="(11) 99999-9999"
                      />
                      {formErrors.phone && <p className="text-red-500 text-[10px] mt-1">{formErrors.phone}</p>}
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="bg-white rounded-sm p-4 md:p-6">
                  <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ background: "#EE4D2D" }}>2</span>
                    Endereço de Entrega
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">CEP *</label>
                      <input
                        type="text"
                        name="cep"
                        value={form.cep}
                        onChange={handleChange}
                        onBlur={handleCepBlur}
                        required
                        maxLength={9}
                        className={`w-full h-11 px-3 border rounded text-sm focus:outline-none focus:border-[#EE4D2D] focus:ring-1 focus:ring-[#EE4D2D]/30 transition-all ${formErrors.cep ? "border-red-400" : "border-gray-200"}`}
                        placeholder="00000-000"
                      />
                      {formErrors.cep && <p className="text-red-500 text-[10px] mt-1">{formErrors.cep}</p>}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Rua *</label>
                      <input
                        type="text"
                        name="street"
                        value={form.street}
                        onChange={handleChange}
                        required
                        maxLength={100}
                        className={`w-full h-11 px-3 border rounded text-sm focus:outline-none focus:border-[#EE4D2D] focus:ring-1 focus:ring-[#EE4D2D]/30 transition-all ${formErrors.street ? "border-red-400" : "border-gray-200"}`}
                        placeholder="Nome da rua"
                      />
                      {formErrors.street && <p className="text-red-500 text-[10px] mt-1">{formErrors.street}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Número *</label>
                      <input
                        type="text"
                        name="number"
                        value={form.number}
                        onChange={handleChange}
                        required
                        maxLength={10}
                        className={`w-full h-11 px-3 border rounded text-sm focus:outline-none focus:border-[#EE4D2D] focus:ring-1 focus:ring-[#EE4D2D]/30 transition-all ${formErrors.number ? "border-red-400" : "border-gray-200"}`}
                        placeholder="Nº"
                      />
                      {formErrors.number && <p className="text-red-500 text-[10px] mt-1">{formErrors.number}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Complemento</label>
                      <input
                        type="text"
                        name="complement"
                        value={form.complement}
                        onChange={handleChange}
                        maxLength={50}
                        className="w-full h-11 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#EE4D2D] focus:ring-1 focus:ring-[#EE4D2D]/30 transition-all"
                        placeholder="Apto, bloco..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Bairro *</label>
                      <input
                        type="text"
                        name="neighborhood"
                        value={form.neighborhood}
                        onChange={handleChange}
                        required
                        maxLength={50}
                        className={`w-full h-11 px-3 border rounded text-sm focus:outline-none focus:border-[#EE4D2D] focus:ring-1 focus:ring-[#EE4D2D]/30 transition-all ${formErrors.neighborhood ? "border-red-400" : "border-gray-200"}`}
                        placeholder="Bairro"
                      />
                      {formErrors.neighborhood && <p className="text-red-500 text-[10px] mt-1">{formErrors.neighborhood}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Cidade *</label>
                      <input
                        type="text"
                        name="city"
                        value={form.city}
                        onChange={handleChange}
                        required
                        maxLength={40}
                        className={`w-full h-11 px-3 border rounded text-sm focus:outline-none focus:border-[#EE4D2D] focus:ring-1 focus:ring-[#EE4D2D]/30 transition-all ${formErrors.city ? "border-red-400" : "border-gray-200"}`}
                        placeholder="Cidade"
                      />
                      {formErrors.city && <p className="text-red-500 text-[10px] mt-1">{formErrors.city}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Estado *</label>
                      <input
                        type="text"
                        name="state"
                        value={form.state}
                        onChange={handleChange}
                        required
                        maxLength={2}
                        className={`w-full h-11 px-3 border rounded text-sm focus:outline-none focus:border-[#EE4D2D] focus:ring-1 focus:ring-[#EE4D2D]/30 transition-all uppercase ${formErrors.state ? "border-red-400" : "border-gray-200"}`}
                        placeholder="UF"
                      />
                      {formErrors.state && <p className="text-red-500 text-[10px] mt-1">{formErrors.state}</p>}
                    </div>
                  </div>
                </div>

                {/* SHIPPING OPTIONS — sempre visível */}
                <div className="bg-white rounded-sm p-4 md:p-6">
                  <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Truck className="w-5 h-5" style={{ color: "#EE4D2D" }} />
                    Opções de Frete
                  </h2>
                  <div className="space-y-2">
                    {activeShippingOpts.map((opt, idx) => {
                      const isFree = opt.price === 0;
                      const isSelected = selectedShippingIdx === idx;
                      const logo = opt.logo;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedShippingIdx(idx)}
                          className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all text-left ${
                            isSelected
                              ? isFree ? "border-green-500 bg-green-50" : "border-[#EE4D2D] bg-orange-50"
                              : "border-gray-200 hover:border-orange-200"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected ? (isFree ? "border-green-500" : "border-[#EE4D2D]") : "border-gray-300"
                            }`}>
                              {isSelected && (
                                <div className="w-2 h-2 rounded-full" style={{ background: isFree ? "#22c55e" : "#EE4D2D" }} />
                              )}
                            </div>
                            {/* Logo da transportadora */}
                            {logo && (
                              <img src={logo} alt={opt.label} className="h-10 w-auto object-contain shrink-0" style={{ maxWidth: "80px" }} />
                            )}
                            <div>
                              <p className={`text-sm font-bold ${isFree ? "text-green-700" : "text-gray-800"}`}>
                                {opt.label}
                                {isFree && (
                                  <span className="ml-2 text-[10px] font-bold text-white px-1.5 py-0.5 rounded bg-green-500">
                                    GRÁTIS
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-500">{opt.days}</p>
                            </div>
                          </div>
                          <span className={`text-sm font-extrabold ${isFree ? "text-green-600" : ""}`} style={!isFree ? { color: "#EE4D2D" } : {}}>
                            {isFree ? "Grátis" : formatPrice(opt.price)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ORDER BUMP */}
                <div className="bg-white rounded-sm overflow-hidden border-2 border-dashed" style={{ borderColor: "#EE4D2D" }}>
                  <div className="px-4 py-3 flex items-center gap-2" style={{ background: "linear-gradient(135deg, #EE4D2D 0%, #FF6633 100%)" }}>
                    <Flame className="w-5 h-5 text-white" />
                    <h2 className="text-sm font-extrabold text-white tracking-wide">
                      APROVEITE! ADICIONE AO SEU PEDIDO
                    </h2>
                    <Gift className="w-5 h-5 text-yellow-300" />
                  </div>
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-gray-500 mb-2">
                      {productIds.includes(24) || productIds.some(id => [25,26,27,28].includes(id))
                        ? "Clientes que compraram roupas também levaram estes itens com desconto exclusivo:"
                        : productIds.includes(23)
                        ? "Quem comprou o Cooktop também levou estes itens essenciais com desconto exclusivo:"
                        : productIds.includes(21)
                        ? "Quem comprou a Roçadeira Nakasaki também levou estes itens essenciais com desconto exclusivo:"
                        : "Clientes também levaram estes itens com desconto exclusivo:"}
                    </p>
                    {currentBumps.map((bump) => {
                      const isSelected = selectedBumps.has(bump.id);
                      const hasSizes = bump.sizes && bump.sizes.length > 0;
                      const selectedSize = bumpSizes[bump.id];
                      return (
                        <div key={bump.id} className="space-y-1">
                          <button
                            type="button"
                            onClick={() => toggleBump(bump.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                              isSelected
                                ? "border-[#EE4D2D] bg-orange-50"
                                : "border-gray-200 hover:border-orange-200 hover:bg-orange-50/30"
                            }`}
                          >
                            {/* Checkbox */}
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                              isSelected
                                ? "border-[#EE4D2D] bg-[#EE4D2D]"
                                : "border-gray-300"
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>

                            {/* Image */}
                            <img
                              src={bump.image}
                              alt={bump.name}
                              className="w-14 h-14 rounded object-contain bg-gray-50 shrink-0 p-1"
                            />

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-800 line-clamp-1">{bump.name}</p>
                              <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{bump.shortDescription}</p>
                              <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-xs text-gray-400 line-through">
                                  {formatPrice(bump.originalPrice)}
                                </span>
                                <span className="text-sm font-extrabold" style={{ color: "#EE4D2D" }}>
                                  {formatPrice(bump.price)}
                                </span>
                                <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded" style={{ background: "#EE4D2D" }}>
                                  -{bump.discount}%
                                </span>
                                {hasSizes && (
                                  <span className="text-[10px] text-gray-400 ml-1">
                                    {selectedSize ? `Tamanho: ${selectedSize}` : "Escolha o tamanho"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>

                          {/* Seletor de tamanho — aparece quando o bump é selecionado e tem tamanhos */}
                          {isSelected && hasSizes && (
                            <div className="flex items-center gap-1.5 px-3 pb-2">
                              <span className="text-[10px] text-gray-600 font-semibold shrink-0">Tamanho:</span>
                              <div className="flex gap-1 flex-wrap">
                                {bump.sizes!.map((size) => (
                                  <button
                                    key={size}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setBumpSizes(prev => ({ ...prev, [bump.id]: size }));
                                    }}
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all ${
                                      selectedSize === size
                                        ? "border-[#EE4D2D] bg-[#EE4D2D] text-white"
                                        : "border-gray-300 text-gray-600 hover:border-[#EE4D2D] hover:text-[#EE4D2D]"
                                    }`}
                                  >
                                    {size}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Selo de Compra Segura */}
                <div className="bg-white rounded-sm p-4 border border-green-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-green-700">Compra 100% Segura</p>
                      <p className="text-[10px] text-green-600">Seus dados estão protegidos</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-green-50 rounded">
                      <Lock className="w-4 h-4 text-green-600 mx-auto mb-1" />
                      <p className="text-[9px] text-green-700 font-semibold">Dados Criptografados</p>
                    </div>
                    <div className="p-2 bg-green-50 rounded">
                      <ShieldCheck className="w-4 h-4 text-green-600 mx-auto mb-1" />
                      <p className="text-[9px] text-green-700 font-semibold">Pagamento Seguro</p>
                    </div>
                    <div className="p-2 bg-green-50 rounded">
                      <Truck className="w-4 h-4 text-green-600 mx-auto mb-1" />
                      <p className="text-[9px] text-green-700 font-semibold">Entrega Garantida</p>
                    </div>
                  </div>
                </div>

                {/* Depoimentos no Checkout (só foto perfil, sem foto de depoimento) */}
                {(productIds.includes(22) || productIds.includes(23)) && (
                  <div className="bg-white rounded-sm p-4">
                    <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      O que nossos clientes dizem
                    </h2>
                    <div className="space-y-3">
                      {productIds.includes(23) ? (
                        <>
                          <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                            <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663285681492/T9MpEVnAhq2PrGidiTemVi/perfil1_784b8050.png" alt="Carla" className="w-10 h-10 rounded-full object-cover shrink-0" />
                            <div>
                              <div className="flex items-center gap-1 mb-0.5">
                                <p className="text-xs font-bold text-gray-800">Carla S.</p>
                                <div className="flex">{[...Array(5)].map((_,i) => <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}</div>
                              </div>
                              <p className="text-[11px] text-gray-600">"Chegou rápido e muito bem embalado! Potente demais, aqueceu super rápido. Super recomendo!"</p>
                            </div>
                          </div>
                          <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                            <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663285681492/T9MpEVnAhq2PrGidiTemVi/perfil3_f1b2d2eb.png" alt="Roberto" className="w-10 h-10 rounded-full object-cover shrink-0" />
                            <div>
                              <div className="flex items-center gap-1 mb-0.5">
                                <p className="text-xs font-bold text-gray-800">Roberto M.</p>
                                <div className="flex">{[...Array(5)].map((_,i) => <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}</div>
                              </div>
                              <p className="text-[11px] text-gray-600">"Melhor compra do ano! Ferve água em menos de 2 min. Funciona com qualquer panela. Produto top!"</p>
                            </div>
                          </div>
                          <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                            <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663285681492/T9MpEVnAhq2PrGidiTemVi/perfil4_c80044cb.png" alt="Fernanda" className="w-10 h-10 rounded-full object-cover shrink-0" />
                            <div>
                              <div className="flex items-center gap-1 mb-0.5">
                                <p className="text-xs font-bold text-gray-800">Fernanda L.</p>
                                <div className="flex">{[...Array(5)].map((_,i) => <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}</div>
                              </div>
                              <p className="text-[11px] text-gray-600">"Compacto, leve e potente. Desliga sozinho, trava de segurança ótima. Funciona com qualquer panela!"</p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                            <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663285681492/T9MpEVnAhq2PrGidiTemVi/pasted_file_USzOU6_image_97ea78dd.png" alt="Fabio" className="w-10 h-10 rounded-full object-cover shrink-0" />
                            <div>
                              <div className="flex items-center gap-1 mb-0.5">
                                <p className="text-xs font-bold text-gray-800">Fabio O.</p>
                                <div className="flex">{[...Array(5)].map((_,i) => <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}</div>
                              </div>
                              <p className="text-[11px] text-gray-600">"Qualidade da solda excelente, arco estável. Modo MIG sem gás é perfeito. Kit completo!"</p>
                            </div>
                          </div>
                          <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                            <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663285681492/T9MpEVnAhq2PrGidiTemVi/pasted_file_Cj83si_image_8a4d29e7.png" alt="Marcos" className="w-10 h-10 rounded-full object-cover shrink-0" />
                            <div>
                              <div className="flex items-center gap-1 mb-0.5">
                                <p className="text-xs font-bold text-gray-800">Marcos A.</p>
                                <div className="flex">{[...Array(5)].map((_,i) => <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}</div>
                              </div>
                              <p className="text-[11px] text-gray-600">"Melhor custo-benefício! Bivolt automática, display digital. Dá conta de tudo!"</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Order summary */}
              <div>
                <div className="bg-white rounded-sm p-5 sticky top-20">
                  <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ background: "#EE4D2D" }}>3</span>
                    Resumo do Pedido
                  </h3>

                  {/* Items */}
                  <div className="space-y-3 max-h-[200px] overflow-y-auto mb-4">
                    {items.map((item, idx) => (
                      <div key={`${item.product.id}-${idx}-${JSON.stringify(item.selectedVariations)}`} className="flex gap-3">
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-14 h-14 rounded object-contain bg-gray-50 shrink-0 p-1"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-700 line-clamp-2">{item.product.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-gray-400">Qtd:</span>
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); if (item.quantity > 1) updateQuantity(item.product.id, item.quantity - 1, item.selectedVariations); else updateQuantity(item.product.id, 0, item.selectedVariations); }}
                              className="w-5 h-5 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                            >
                              <Minus className="w-3 h-3 text-gray-500" />
                            </button>
                            <span className="text-xs font-bold text-gray-700 w-4 text-center">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); updateQuantity(item.product.id, item.quantity + 1, item.selectedVariations); }}
                              className="w-5 h-5 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                            >
                              <Plus className="w-3 h-3 text-gray-500" />
                            </button>
                          </div>
                          <p className="text-sm font-bold mt-0.5" style={{ color: "#EE4D2D" }}>
                            {formatPrice(getItemPrice(item) * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bump items in summary */}
                  {selectedBumps.size > 0 && (
                    <div className="border-t border-gray-100 pt-3 mb-3">
                      <p className="text-[10px] font-bold text-[#EE4D2D] uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Itens adicionais
                      </p>
                      <div className="space-y-2">
                        {currentBumps
                          .filter((b) => selectedBumps.has(b.id))
                          .map((bump) => (
                            <div key={bump.id} className="flex justify-between text-xs">
                              <span className="text-gray-600 truncate mr-2">{bump.name}</span>
                              <span className="font-semibold text-gray-700 shrink-0">{formatPrice(bump.price)}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal ({totalItems} {totalItems === 1 ? "item" : "itens"})</span>
                      <span>{formatPrice(totalPrice)}</span>
                    </div>
                    {bumpTotal > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Itens adicionais</span>
                        <span>{formatPrice(bumpTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-600">
                      <span>
                        Frete
                        {activeShippingOpts[selectedShippingIdx] && (
                          <span className="text-[10px] text-gray-400 ml-1">
                            ({activeShippingOpts[selectedShippingIdx].label})
                          </span>
                        )}
                      </span>
                      <span className={shippingCost === 0 ? "text-[#00BFA5] font-semibold" : ""}>
                        {shippingCost === 0 ? "Grátis" : formatPrice(shippingCost)}
                      </span>
                    </div>
                    {activeShippingOpts[selectedShippingIdx] && (
                      <p className="text-[10px] text-gray-400">
                        Entrega em {activeShippingOpts[selectedShippingIdx].days}
                      </p>
                    )}
                    {couponDiscount > 0 && appliedCoupon && (
                      <div className="flex justify-between text-[#00BFA5] font-semibold">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                          Cupom {appliedCoupon.code} (-{appliedCoupon.discountPct}%)
                        </span>
                        <span>-{formatPrice(couponDiscount)}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-100 pt-2 flex justify-between">
                      <span className="font-bold text-gray-800">Total</span>
                      <span className="text-xl font-extrabold" style={{ color: "#EE4D2D" }}>
                        {formatPrice(finalTotal)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      ou 3x de {formatPrice(finalTotal / 3)} sem juros
                    </p>
                  </div>

                  {/* Payment method indicator */}
                  <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center gap-2 mb-1">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-green-600" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                      <span className="text-sm font-bold text-green-700">Pagamento via PIX</span>
                    </div>
                    <p className="text-[10px] text-green-600">
                      Após finalizar, você receberá o QR Code PIX para pagamento instantâneo.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={createPixMutation.isPending}
                    className="w-full mt-5 py-3.5 rounded text-white font-bold text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ background: "#EE4D2D" }}
                  >
                    {createPixMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Pagar com PIX — {formatPrice(finalTotal)}
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-gray-400 text-center mt-3 flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3" />
                    Pagamento 100% seguro e criptografado
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>

      {/* Popup de boas-vindas: aparece automaticamente ao entrar no checkout */}
      {showWelcomePopup && (
        <WelcomeDiscountPopup
          onApply={(coupon: AppliedCoupon) => {
            handleCouponApply(coupon);
            setShowWelcomePopup(false);
          }}
          onClose={() => setShowWelcomePopup(false)}
        />
      )}

      {/* Exit-intent popup: aparece ao clicar em Voltar, via mouseleave (desktop) ou popstate (mobile) */}
      {!showWelcomePopup && (
        <ExitIntentPopup
          enabled={true}
          forceShow={showExitPopup}
          onApply={handleCouponApply}
          onClose={() => setShowExitPopup(false)}
        />
      )}
    </div>
  );
}
