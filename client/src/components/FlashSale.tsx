/*
 * Design: Bazaar Digital — Seção Flash Sale com timer de urgência
 * Scroll horizontal de produtos, timer regressivo, estilo Shopee
 */
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Zap, Star, Truck } from "lucide-react";
import { products } from "@/lib/data";

export default function FlashSale() {
  // Produtos em destaque no flash sale: primeiros 7 + produto 29 (Rolo de Pintura Vonder)
  const flashProducts = [
    ...products.slice(0, 7),
    ...products.filter((p) => p.id === 29),
  ];

  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 45, seconds: 30 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) {
          seconds = 59;
          minutes--;
        }
        if (minutes < 0) {
          minutes = 59;
          hours--;
        }
        if (hours < 0) {
          return { hours: 2, minutes: 45, seconds: 30 };
        }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, "0");

  const formatPrice = (price: number) =>
    price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <section className="bg-white border-b border-gray-100">
      <div className="container py-3 md:py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-white fill-white p-0.5 rounded" style={{ background: "#EE4D2D" }} />
            <h2 className="text-base md:text-lg font-extrabold" style={{ color: "#EE4D2D" }}>
              OFERTAS RELÂMPAGO
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {[pad(timeLeft.hours), pad(timeLeft.minutes), pad(timeLeft.seconds)].map(
              (val, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded text-white text-xs md:text-sm font-bold bg-gray-900">
                    {val}
                  </span>
                  {i < 2 && <span className="text-gray-900 font-bold text-xs">:</span>}
                </div>
              )
            )}
          </div>
        </div>

        {/* Horizontal scroll products */}
        <div className="flex gap-2 md:gap-3 overflow-x-auto scrollbar-hide pb-2">
          {flashProducts.map((product) => (
            <Link key={product.id} href={`/produto/${product.id}`}>
              <div className="shrink-0 w-[130px] sm:w-[150px] md:w-[170px] bg-white border border-gray-100 rounded-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative aspect-square bg-gray-50">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-contain p-2"
                    loading="lazy"
                  />
                  {product.discount > 0 && (
                    <div className="absolute top-0 right-0 text-white text-[10px] font-bold px-1.5 py-0.5"
                      style={{ background: "#EE4D2D" }}>
                      -{product.discount}%
                    </div>
                  )}
                  {product.freeShipping && (
                    <div className="absolute bottom-0 left-0 right-0 flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-semibold"
                      style={{ background: "linear-gradient(90deg, #00BFA5 0%, #00897B 100%)", color: "white" }}>
                      <Truck className="w-2.5 h-2.5" />
                      FRETE GRÁTIS
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <span className="text-sm font-extrabold block" style={{ color: "#EE4D2D" }}>
                    {formatPrice(product.price)}
                  </span>
                  {/* Progress bar */}
                  <div className="mt-1.5 relative h-3.5 rounded-full overflow-hidden bg-orange-100">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${Math.min(90, 40 + Math.random() * 50)}%`,
                        background: "linear-gradient(90deg, #EE4D2D, #FF6B35)",
                      }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">
                      VENDENDO RÁPIDO
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
