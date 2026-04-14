/*
 * Design: Bazaar Digital — Landing Page de Produto estilo Shopee
 * Galeria de imagens + vídeo, variações, quantidade, especificações, depoimentos, CTAs sticky no mobile
 * Nicho: Ferramentas
 */
import { useState, useMemo, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { useCart } from "@/contexts/CartContext";
import { products, shippingOptions, productVideos, productReviews } from "@/lib/data";
import type { Review } from "@/lib/data";
import { Star, Truck, ShieldCheck, ChevronLeft, ChevronRight, Minus, Plus, ShoppingCart, Check, RotateCcw, Award, Package, Play, User, BadgeCheck, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import UrgencyTimer from "@/components/UrgencyTimer";
import ScarcityBadge from "@/components/ScarcityBadge";
import ExitIntentPopup from "@/components/ExitIntentPopup";

export default function ProductDetail() {
  const [, params] = useRoute("/produto/:id");
  const [, navigate] = useLocation();
  const { addItem } = useCart();

  const product = useMemo(
    () => products.find((p) => p.id === Number(params?.id)),
    [params?.id]
  );

  const [currentImage, setCurrentImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
  const [addedToCart, setAddedToCart] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  // Vídeo inicia automaticamente se o produto tem vídeo
  const videoUrl = productVideos[product?.id ?? 0];
  const [showVideo, setShowVideo] = useState(!!videoUrl);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoMuted, setVideoMuted] = useState(true);
  const [videoPaused, setVideoPaused] = useState(false);
  const [showSoundPrompt, setShowSoundPrompt] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [reviewVideoUrl, setReviewVideoUrl] = useState<string | null>(null);
  const [variationErrors, setVariationErrors] = useState<Record<string, boolean>>({});
  const variationsRef = useRef<HTMLDivElement>(null);

  // Preço dinâmico baseado na variante selecionada
  const currentPrice = useMemo(() => {
    if (!product) return 0;
    for (const variation of product.variations) {
      if (variation.prices && selectedVariations[variation.label]) {
        const idx = variation.options.indexOf(selectedVariations[variation.label]);
        if (idx >= 0 && variation.prices[idx] !== undefined) {
          return variation.prices[idx];
        }
      }
    }
    return product.price;
  }, [product, selectedVariations]);

  // Dados derivados do produto (calculados após hooks, antes do early return)
  const reviews = useMemo(() => product ? (productReviews[product.id] || []) : [], [product]);
  const avgRating = useMemo(() => {
    if (!product) return "0.0";
    return reviews.length > 0
      ? (reviews.reduce((sum: number, r: Review) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : product.rating.toFixed(1);
  }, [product, reviews]);
  const displayedReviews = useMemo(() => showAllReviews ? reviews : reviews.slice(0, 4), [showAllReviews, reviews]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return products
      .filter((p) => p.category === product.category && p.id !== product.id)
      .slice(0, 5);
  }, [product]);

  const moreProducts = useMemo(() => {
    if (!product) return [];
    return products
      .filter((p) => p.id !== product.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 10);
  }, [product]);

  // Early return AFTER all hooks
  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F5F5F5]">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-400 text-lg">Produto não encontrado</p>
            <button
              onClick={() => navigate("/")}
              className="mt-4 px-6 py-2 rounded text-white font-semibold"
              style={{ background: "#EE4D2D" }}
            >
              Voltar à Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatPrice = (price: number) =>
    price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const formatSold = (sold: number) => {
    if (sold >= 1000) return `${(sold / 1000).toFixed(1).replace(".0", "")}mil`;
    return sold.toString();
  };

  // Verifica se todas as variações obrigatórias foram selecionadas
  const validateVariations = () => {
    if (!product || product.variations.length === 0) return true;
    const errors: Record<string, boolean> = {};
    let hasError = false;
    for (const variation of product.variations) {
      if (!selectedVariations[variation.label]) {
        errors[variation.label] = true;
        hasError = true;
      }
    }
    setVariationErrors(errors);
    if (hasError) {
      // Scroll para a seção de variações
      variationsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.error("Selecione todas as opções antes de continuar", {
        description: "Escolha o tamanho e a cor do produto.",
      });
    }
    return !hasError;
  };

  const handleAddToCart = () => {
    if (!validateVariations()) return;
    addItem(product, quantity, selectedVariations);
    setAddedToCart(true);
    toast.success("Produto adicionado ao carrinho!", {
      description: `${quantity}x ${product.name}`,
    });
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    if (!validateVariations()) return;
    addItem(product, quantity, selectedVariations);
    // O pixel UTMify client-side detecta automaticamente o clique em "COMPRAR AGORA"
    // via icTextMatch. Não enviar IC pelo proxy para evitar duplicação e erro 400 ALREADY_SAVED
    navigate("/checkout");
  };

  const nextImage = () => setCurrentImage((p) => (p + 1) % product.images.length);
  const prevImage = () => setCurrentImage((p) => (p - 1 + product.images.length) % product.images.length);

  const renderStars = (rating: number, size = "w-4 h-4") => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size} ${
            star <= Math.round(rating)
              ? "fill-yellow-400 text-yellow-400"
              : "fill-gray-200 text-gray-200"
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F5]">
      <Header />

      <main className="flex-1 pb-20 md:pb-6">
        {/* Breadcrumb */}
        <div className="container py-2 md:py-3">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <button onClick={() => navigate("/")} className="hover:text-[#EE4D2D] transition-colors">
              Home
            </button>
            <span>/</span>
            <span>{product.category}</span>
            <span>/</span>
            <span className="text-gray-600 truncate max-w-[200px]">{product.name}</span>
          </div>
        </div>

        {/* Mobile urgency top bar — visível imediatamente, antes de qualquer scroll */}
        <div className="md:hidden mx-3 mb-2 rounded-lg overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-3 py-2 text-white text-xs font-bold" style={{ background: "#EE4D2D" }}>
            <span>⚡ OFERTA RELÂMPAGO — HOJE</span>
            <span className="bg-white text-[#EE4D2D] px-2 py-0.5 rounded-full text-[10px] font-extrabold">
              {product.discount}% OFF
            </span>
          </div>
          <div className="bg-white flex items-center justify-between px-3 py-2.5 border border-orange-100">
            <div>
              <p className="text-[10px] text-gray-400 line-through">{formatPrice(product.originalPrice)}</p>
              <p className="text-xl font-extrabold" style={{ color: "#EE4D2D" }}>{formatPrice(currentPrice)}</p>
            </div>
            <button
              onClick={handleBuyNow}
              className="px-5 py-2.5 rounded text-white font-extrabold text-sm shadow-md active:scale-95 transition-transform"
              style={{ background: "#EE4D2D" }}
            >
              Comprar Agora →
            </button>
          </div>
        </div>

        {/* Product main section */}
        <div className="container">
          <div className="bg-white rounded-sm overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-6 p-0 md:p-6">
              {/* Image gallery + Video */}
              <div>
                {showVideo && videoUrl ? (
                  <div className="relative aspect-square bg-black overflow-hidden" onClick={() => {
                    if (showSoundPrompt) {
                      setShowSoundPrompt(false);
                      setVideoMuted(false);
                      if (videoRef.current) {
                        videoRef.current.muted = false;
                        videoRef.current.play().catch(() => {});
                      }
                      return;
                    }
                    if (videoRef.current) {
                      if (videoRef.current.paused) {
                        videoRef.current.play().catch(() => {});
                        setVideoPaused(false);
                      } else {
                        videoRef.current.pause();
                        setVideoPaused(true);
                      }
                    }
                  }}>
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      autoPlay
                      muted={videoMuted}
                      loop
                      playsInline
                      className="w-full h-full object-contain"
                      onLoadedData={() => {
                        videoRef.current?.play().catch(() => {});
                      }}
                    />
                    {/* Overlay: Ativar Som */}
                    {showSoundPrompt && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-black/70 text-white rounded-full px-6 py-4 flex items-center gap-3 animate-pulse shadow-lg">
                          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                          <span className="text-base font-bold">Toque para ativar o som</span>
                        </div>
                      </div>
                    )}
                    {/* Overlay: Pausado */}
                    {videoPaused && !showSoundPrompt && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-black/50 text-white rounded-full p-5">
                          <svg className="w-12 h-12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        </div>
                      </div>
                    )}
                    {/* Controles inferiores */}
                    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-gradient-to-t from-black/70 to-transparent">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (videoRef.current) {
                            const newMuted = !videoMuted;
                            videoRef.current.muted = newMuted;
                            setVideoMuted(newMuted);
                            setShowSoundPrompt(false);
                          }
                        }}
                        className="bg-white/20 hover:bg-white/40 text-white rounded-full p-2.5 transition-colors"
                      >
                        {videoMuted ? (
                          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                        ) : (
                          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowVideo(false);
                        }}
                        className="bg-white/20 hover:bg-white/40 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors"
                      >
                        Ver Fotos
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative aspect-square bg-gray-50 overflow-hidden group">
                    <img
                      src={product.images[currentImage]}
                      alt={product.name}
                      className="w-full h-full object-contain p-4"
                    />
                    {product.images.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {/* Discount badge */}
                    {product.discount > 0 && (
                      <div className="absolute top-3 left-3 text-white text-sm font-bold px-3 py-1 rounded"
                        style={{ background: "#EE4D2D" }}>
                        -{product.discount}% OFF
                      </div>
                    )}
                    {/* Video play button */}
                    {videoUrl && (
                      <button
                        onClick={() => setShowVideo(true)}
                        className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/70 hover:bg-black/90 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors"
                      >
                        <Play className="w-4 h-4 fill-white" /> Ver Vídeo
                      </button>
                    )}
                  </div>
                )}
                {/* Thumbnails + Video thumb */}
                <div className="flex gap-2 p-3 overflow-x-auto scrollbar-hide">
                  {videoUrl && (
                    <button
                      onClick={() => setShowVideo(true)}
                      className={`shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all relative ${
                        showVideo ? "border-[#EE4D2D] opacity-100" : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={product.images[0]} alt="Vídeo" className="w-full h-full object-contain bg-gray-50 p-1" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Play className="w-5 h-5 text-white fill-white" />
                      </div>
                    </button>
                  )}
                  {product.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => { setCurrentImage(i); setShowVideo(false); }}
                      className={`shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all ${
                        !showVideo && i === currentImage ? "border-[#EE4D2D] opacity-100" : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-contain bg-gray-50 p-1" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Product info */}
              <div className="p-4 md:p-0">
                {/* Title */}
                <h1 className="text-base md:text-xl font-bold text-gray-800 leading-snug">
                  {product.freeShipping && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-white px-1.5 py-0.5 rounded mr-2 align-middle"
                      style={{ background: "#00BFA5" }}>
                      <Truck className="w-3 h-3" /> FRETE GRÁTIS
                    </span>
                  )}
                  {product.name}
                </h1>

                {/* Rating & sold */}
                <div className="flex items-center gap-3 mt-2 text-sm">
                  <div className="flex items-center gap-1">
                    {renderStars(product.rating)}
                    <span className="text-gray-500 ml-1">{avgRating}</span>
                  </div>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-500">{formatSold(product.sold)} vendidos</span>
                  {reviews.length > 0 && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-500">{reviews.length} avaliações</span>
                    </>
                  )}
                </div>

                {/* Headline dinâmica de urgência — produtos 24, 29 e 30 */}
                {(product.id === 24 || product.id === 29 || product.id === 30) && (() => {
                  const hoje = new Date();
                  const dia = hoje.getDate().toString().padStart(2, '0');
                  const mes = (hoje.getMonth() + 1).toString().padStart(2, '0');
                  const dataFormatada = `${dia}/${mes}`;
                  return (
                    <div className="mt-4 rounded-lg overflow-hidden border-2 border-red-500 bg-red-600 px-4 py-2.5 flex items-center justify-center gap-2 animate-pulse">
                      <span className="text-white text-sm font-extrabold tracking-wide text-center">
                        🔥 Essa oferta só vai até HOJE {dataFormatada}. Lote limitado!
                      </span>
                    </div>
                  );
                })()}

                {/* Timer de Urgência — acima do preço */}
                <div className="mt-2 rounded overflow-hidden">
                  <UrgencyTimer variant="product" durationMinutes={30} productId={product.id} />
                  {/* Contador de escassez — barra separada */}
                  {(product.id === 22 || product.id === 23 || product.id === 24 || product.id === 29 || product.id === 30) && (
                    <ScarcityBadge variant="product" />
                  )}
                  {/* Price */}
                  <div className="p-4" style={{ background: "#FFF5F0" }}>
                  {product.originalPrice > product.price && (
                    <span className="text-sm text-gray-400 line-through block">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl md:text-3xl font-extrabold" style={{ color: "#EE4D2D" }}>
                      {formatPrice(currentPrice * quantity)}
                    </span>
                    {product.discount > 0 && (
                      <span className="text-xs font-bold text-white px-2 py-0.5 rounded"
                        style={{ background: "#EE4D2D" }}>
                        -{product.discount}% OFF
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-500">
                      ou 3x de {formatPrice((currentPrice * quantity) / 3)} sem juros
                    </p>
                    {quantity > 1 && (
                      <span className="text-xs text-gray-400">
                        ({formatPrice(currentPrice)} cada)
                      </span>
                    )}
                  </div>
                  </div>
                </div>

                {/* Variations */}
                <div ref={variationsRef}>
                {product.variations.map((variation) => (
                  <div key={variation.label} className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-gray-600">
                        {variation.label}:
                      </span>
                      {selectedVariations[variation.label] && (
                        <span className="text-sm text-[#EE4D2D] font-medium">
                          {selectedVariations[variation.label]}
                        </span>
                      )}
                      {variationErrors[variation.label] && !selectedVariations[variation.label] && (
                        <span className="text-xs text-red-500 font-medium animate-pulse">
                          ⚠ Obrigatório
                        </span>
                      )}
                    </div>
                    <div className={`p-2 rounded-lg transition-all ${
                        variationErrors[variation.label] && !selectedVariations[variation.label]
                          ? "border-2 border-red-400 bg-red-50"
                          : "border border-transparent"
                      } ${
                        variation.options.length > 8 ? "max-h-52 overflow-y-auto" : ""
                      }`}>
                      <div className="flex flex-wrap gap-2">
                        {variation.options.map((option) => {
                          const isSelected = selectedVariations[variation.label] === option;
                          return (
                            <button
                              key={option}
                              onClick={() => {
                                setSelectedVariations((prev) => ({
                                  ...prev,
                                  [variation.label]: option,
                                }));
                                setVariationErrors((prev) => ({ ...prev, [variation.label]: false }));
                                if (variation.optionImages?.[option]) {
                                  const imgUrl = variation.optionImages[option];
                                  const idx = product.images.indexOf(imgUrl);
                                  if (idx >= 0) {
                                    setCurrentImage(idx);
                                    setShowVideo(false);
                                  }
                                }
                              }}
                              className={`px-4 py-2 text-sm rounded border transition-all ${
                                isSelected
                                  ? "border-[#EE4D2D] text-[#EE4D2D] bg-orange-50 font-semibold"
                                  : "border-gray-200 text-gray-600 hover:border-gray-400"
                              }`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                </div>

                {/* Size Guide — apenas para categoria Roupas */}
                {product.category === "Roupas" && (
                  <div className="mt-4 p-4 rounded-lg border border-pink-100" style={{ background: "#FFF0F5" }}>
                    <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <span className="text-base">📏</span> Guia de Tamanhos
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-center">
                        <thead>
                          <tr className="text-white" style={{ background: "#EE4D2D" }}>
                            <th className="py-2 px-3 font-bold rounded-tl-md">Tamanho</th>
                            <th className="py-2 px-3 font-bold">Veste</th>
                            <th className="py-2 px-3 font-bold rounded-tr-md">Busto (cm)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { size: "P", veste: "36/38", busto: "86-90" },
                            { size: "M", veste: "38/40", busto: "90-94" },
                            { size: "G", veste: "42/44", busto: "94-100" },
                            { size: "GG", veste: "46/48", busto: "100-108" },
                          ].map((row, i) => (
                            <tr key={row.size} className={i % 2 === 0 ? "bg-pink-50" : "bg-white"}>
                              <td className="py-2 px-3 font-bold text-pink-700">{row.size}</td>
                              <td className="py-2 px-3 text-gray-700">{row.veste}</td>
                              <td className="py-2 px-3 text-gray-700">{row.busto}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">💡 Em caso de dúvida entre dois tamanhos, recomendamos o maior.</p>
                  </div>
                )}

                {/* Quantity */}
                <div className="mt-4">
                  <span className="text-sm font-semibold text-gray-600 block mb-2">
                    Quantidade
                  </span>
                  <div className="flex items-center gap-0">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-9 h-9 border border-gray-200 flex items-center justify-center rounded-l hover:bg-gray-50 transition-colors"
                    >
                      <Minus className="w-4 h-4 text-gray-500" />
                    </button>
                    <span className="w-12 h-9 border-y border-gray-200 flex items-center justify-center text-sm font-semibold">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => q + 1)}
                      className="w-9 h-9 border border-gray-200 flex items-center justify-center rounded-r hover:bg-gray-50 transition-colors"
                    >
                      <Plus className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Shipping options */}
                {shippingOptions[product.id] && (
                  <div className="mt-4 p-4 rounded border border-orange-100" style={{ background: "#FFF5F0" }}>
                    <span className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                      <Truck className="w-4 h-4" style={{ color: "#EE4D2D" }} />
                      Opções de Frete
                    </span>
                    <div className="space-y-2">
                      {shippingOptions[product.id].map((opt, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center justify-between bg-white rounded p-3 border ${
                            opt.price === 0 ? "border-green-200 bg-green-50" : "border-gray-100"
                          }`}
                        >
                          <div>
                            <p className={`text-sm font-bold ${opt.price === 0 ? "text-green-700" : "text-gray-800"}`}>
                              {opt.label}
                              {opt.price === 0 && (
                                <span className="ml-2 text-[10px] font-bold text-white px-1.5 py-0.5 rounded bg-green-500">
                                  GRÁTIS
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">{opt.days}</p>
                          </div>
                          <span className={`text-sm font-extrabold ${opt.price === 0 ? "text-green-600" : ""}`} style={opt.price > 0 ? { color: "#EE4D2D" } : {}}>
                            {opt.price === 0 ? "R$ 0,00" : formatPrice(opt.price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trust badges */}
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded p-2.5">
                    <ShieldCheck className="w-4 h-4 text-[#00BFA5] shrink-0" />
                    <span>Compra 100% Segura</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded p-2.5">
                    <Truck className="w-4 h-4 text-[#00BFA5] shrink-0" />
                    <span>Entrega Garantida</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded p-2.5">
                    <RotateCcw className="w-4 h-4 text-[#00BFA5] shrink-0" />
                    <span>7 Dias para Troca</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded p-2.5">
                    <Award className="w-4 h-4 text-[#00BFA5] shrink-0" />
                    <span>Garantia de Qualidade</span>
                  </div>
                </div>

                {/* Desktop CTAs */}
                <div className="hidden md:flex gap-3 mt-6">
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded border-2 font-bold text-sm transition-all hover:bg-orange-50"
                    style={{ borderColor: "#EE4D2D", color: "#EE4D2D" }}
                  >
                    {addedToCart ? (
                      <>
                        <Check className="w-5 h-5" /> Adicionado!
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-5 h-5" /> Adicionar ao Carrinho
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleBuyNow}
                    className="flex-1 py-3 rounded text-white font-bold text-sm transition-all hover:opacity-90"
                    style={{ background: "#EE4D2D" }}
                  >
                    Comprar Agora
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Specifications */}
          {product.specifications && product.specifications.length > 0 && (
            <div className="bg-white rounded-sm mt-3 p-4 md:p-6">
              <h2 className="text-base md:text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <div className="w-1 h-5 rounded-full" style={{ background: "#EE4D2D" }} />
                Especificações Técnicas
              </h2>
              <div className="border rounded overflow-hidden">
                {product.specifications.map((spec, i) => (
                  <div
                    key={spec.label}
                    className={`grid grid-cols-3 text-sm ${
                      i % 2 === 0 ? "bg-gray-50" : "bg-white"
                    }`}
                  >
                    <div className="p-3 font-semibold text-gray-600 border-r border-gray-100">
                      {spec.label}
                    </div>
                    <div className="p-3 text-gray-700 col-span-2">
                      {spec.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="bg-white rounded-sm mt-3 p-4 md:p-6">
            <h2 className="text-base md:text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <div className="w-1 h-5 rounded-full" style={{ background: "#EE4D2D" }} />
              Descrição do Produto
            </h2>
            <div className="relative">
              <p className={`text-sm text-gray-600 leading-relaxed whitespace-pre-line ${
                !showFullDesc ? "line-clamp-4 md:line-clamp-none" : ""
              }`}>
                {product.description}
              </p>
              {!showFullDesc && (
                <button
                  onClick={() => setShowFullDesc(true)}
                  className="md:hidden mt-2 text-sm font-semibold"
                  style={{ color: "#EE4D2D" }}
                >
                  Ver descrição completa
                </button>
              )}
            </div>

            {/* Shipping info */}
            <div className="mt-6 p-4 bg-gray-50 rounded border border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" style={{ color: "#EE4D2D" }} />
                Informações de Envio
              </h3>
              {shippingOptions[product.id] ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {shippingOptions[product.id].map((opt, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                        <Truck className={`w-4 h-4 shrink-0 mt-0.5 ${opt.price === 0 ? "text-green-500" : "text-[#00BFA5]"}`} />
                        <div>
                          <p className={`font-semibold ${opt.price === 0 ? "text-green-700" : "text-gray-700"}`}>
                            {opt.label} — {opt.price === 0 ? "Grátis" : formatPrice(opt.price)}
                          </p>
                          <p>{opt.days}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <RotateCcw className="w-4 h-4 text-[#00BFA5] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-700">Devolução Grátis</p>
                      <p>7 dias após o recebimento</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-600">
                  <div className="flex items-start gap-2">
                    <Truck className="w-4 h-4 text-[#00BFA5] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-700">Frete Grátis</p>
                      <p>Para compras acima de R$ 49,90</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Package className="w-4 h-4 text-[#00BFA5] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-700">Prazo de Entrega</p>
                      <p>5 a 15 dias úteis</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <RotateCcw className="w-4 h-4 text-[#00BFA5] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-700">Devolução Grátis</p>
                      <p>7 dias após o recebimento</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Customer Reviews / Depoimentos */}
          {reviews.length > 0 && (
            <div className="bg-white rounded-sm mt-3 p-4 md:p-6">
              <h2 className="text-base md:text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <div className="w-1 h-5 rounded-full" style={{ background: "#EE4D2D" }} />
                Avaliações dos Clientes
              </h2>

              {/* Rating summary */}
              <div className="flex items-center gap-6 mb-6 p-4 rounded" style={{ background: "#FFF5F0" }}>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-extrabold" style={{ color: "#EE4D2D" }}>
                    {avgRating}
                  </div>
                  <div className="text-xs text-gray-500">de 5</div>
                  {renderStars(Number(avgRating), "w-4 h-4")}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <ThumbsUp className="w-4 h-4" style={{ color: "#EE4D2D" }} />
                    <span className="font-semibold">{reviews.filter(r => r.rating >= 4).length} de {reviews.length}</span>
                    <span>compradores recomendam este produto</span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = reviews.filter(r => r.rating === star).length;
                      const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 text-xs">
                          <span className="w-3 text-gray-500">{star}</span>
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, background: "#EE4D2D" }}
                            />
                          </div>
                          <span className="w-6 text-right text-gray-400">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Individual reviews */}
              <div className="space-y-4">
                {displayedReviews.map((review: Review) => (
                  <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3 mb-2">
                      {review.profileImage ? (
                        <img
                          src={review.profileImage}
                          alt={review.name}
                          className="w-9 h-9 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-700">{review.name}</span>
                          {review.verified && (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                              <BadgeCheck className="w-3 h-3" /> Compra Verificada
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {renderStars(review.rating, "w-3 h-3")}
                          <span className="text-xs text-gray-400">{review.date}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed ml-12">
                      {review.text}
                    </p>
                    {/* Review images */}
                    {review.images && review.images.length > 0 && (
                      <div className="flex gap-2 mt-2 ml-12 flex-wrap">
                        {review.images.map((img, idx) => (
                          <a key={idx} href={img} target="_blank" rel="noopener noreferrer">
                            <img
                              src={img}
                              alt={`Foto do ${review.name}`}
                              className="w-20 h-20 md:w-24 md:h-24 rounded object-cover border border-gray-200 hover:opacity-80 transition-opacity cursor-pointer"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                    {/* Review video */}
                    {review.videoUrl && (
                      <div className="mt-2 ml-12">
                        <button
                          onClick={() => setReviewVideoUrl(review.videoUrl!)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                          Ver vídeo da avaliação
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Show more reviews */}
              {reviews.length > 4 && !showAllReviews && (
                <button
                  onClick={() => setShowAllReviews(true)}
                  className="mt-4 w-full py-2.5 text-sm font-semibold rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                  style={{ color: "#EE4D2D" }}
                >
                  Ver Todas as {reviews.length} Avaliações
                </button>
              )}
            </div>
          )}

          {/* Related products */}
          {relatedProducts.length > 0 && (
            <div className="mt-3 md:mt-4">
              <div className="bg-white rounded-sm p-4 md:p-6">
                <h2 className="text-base md:text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <div className="w-1 h-5 rounded-full" style={{ background: "#EE4D2D" }} />
                  Produtos Relacionados
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-3">
                  {relatedProducts.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* More products you might like */}
          <div className="mt-3 md:mt-4">
            <div className="bg-white rounded-sm p-4 md:p-6">
              <h2 className="text-base md:text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <div className="w-1 h-5 rounded-full" style={{ background: "#EE4D2D" }} />
                Você Também Pode Gostar
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-3">
                {moreProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 flex gap-2 md:hidden z-40">
        <button
          onClick={handleAddToCart}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded border-2 font-bold text-xs transition-all"
          style={{ borderColor: "#EE4D2D", color: "#EE4D2D" }}
        >
          {addedToCart ? (
            <>
              <Check className="w-4 h-4" /> Adicionado!
            </>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4" /> Carrinho
            </>
          )}
        </button>
        <button
          onClick={handleBuyNow}
          className="flex-1 py-3 rounded text-white font-bold text-xs transition-all"
          style={{ background: "#EE4D2D" }}
        >
          Comprar Agora
        </button>
      </div>

      <Footer />

      {/* Exit Intent Popup */}
      <ExitIntentPopup enabled={true} />

      {/* Video Modal */}
      {reviewVideoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setReviewVideoUrl(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-black rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setReviewVideoUrl(null)}
              className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <video
              src={reviewVideoUrl}
              controls
              autoPlay
              className="w-full max-h-[80vh]"
              playsInline
            />
          </div>
        </div>
      )}
    </div>
  );
}
