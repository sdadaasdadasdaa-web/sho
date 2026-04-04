/*
 * Design: Bazaar Digital — Card de produto estilo Shopee
 * Card branco com sombra sutil, badge de desconto, frete grátis, preço laranja
 */
import { Link } from "wouter";
import { Star, Truck } from "lucide-react";
import type { Product } from "@/lib/data";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const formatPrice = (price: number) =>
    price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const formatSold = (sold: number) => {
    if (sold >= 1000) return `${(sold / 1000).toFixed(1).replace(".0", "")}mil`;
    return sold.toString();
  };

  return (
    <Link href={`/produto/${product.id}`}>
      <div className="group bg-white rounded-sm border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 h-full flex flex-col">
        {/* Image container */}
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {/* Discount badge */}
          {product.discount > 0 && (
            <div className="absolute top-0 right-0 text-white text-[11px] font-bold px-2 py-1"
              style={{ background: "#EE4D2D" }}>
              -{product.discount}%
            </div>
          )}
          {/* Free shipping badge */}
          {product.freeShipping && (
            <div className="absolute bottom-0 left-0 right-0 flex items-center gap-1 px-2 py-1 text-[10px] font-semibold"
              style={{ background: "linear-gradient(90deg, #00BFA5 0%, #00897B 100%)", color: "white" }}>
              <Truck className="w-3 h-3" />
              FRETE GRÁTIS
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-2.5 flex flex-col flex-1">
          {/* Product name */}
          <h3 className="text-xs sm:text-sm text-gray-800 leading-snug line-clamp-2 mb-auto">
            {product.name}
          </h3>

          {/* Price section */}
          <div className="mt-2">
            {product.originalPrice > product.price && (
              <span className="text-[11px] text-gray-400 line-through block">
                {formatPrice(product.originalPrice)}
              </span>
            )}
            <span className="text-base sm:text-lg font-extrabold" style={{ color: "#EE4D2D" }}>
              {formatPrice(product.price)}
            </span>
          </div>

          {/* Rating and sold */}
          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-gray-400">
            <div className="flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span>{product.rating}</span>
            </div>
            <span className="text-gray-300">|</span>
            <span>{formatSold(product.sold)} vendidos</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
