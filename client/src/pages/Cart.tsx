/*
 * Design: Bazaar Digital — Página de Carrinho estilo Shopee
 * Lista de itens, controle de quantidade, resumo e CTA para checkout
 */
import { Link, useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from "lucide-react";
import { getItemPrice } from "@/lib/pricing";

export default function Cart() {
  const { items, removeItem, updateQuantity, totalPrice, totalItems } = useCart();
  const [, navigate] = useLocation();

  const formatPrice = (price: number) =>
    price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const shippingCost = totalPrice >= 99 ? 0 : 14.90;
  const finalTotal = totalPrice + shippingCost;

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F5F5F5]">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <ShoppingBag className="w-20 h-20 mx-auto text-gray-200 mb-4" />
            <h2 className="text-lg font-bold text-gray-600 mb-1">Seu carrinho está vazio</h2>
            <p className="text-sm text-gray-400 mb-6">Que tal explorar nossos achadinhos?</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded text-white font-bold text-sm"
              style={{ background: "#EE4D2D" }}
            >
              <ArrowLeft className="w-4 h-4" /> Continuar Comprando
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F5]">
      <Header />

      <main className="flex-1 pb-24 md:pb-6">
        <div className="container py-4 md:py-6">
          {/* Title */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 rounded-full" style={{ background: "#EE4D2D" }} />
            <h1 className="text-lg md:text-xl font-extrabold text-gray-800">
              Carrinho de Compras ({totalItems} {totalItems === 1 ? "item" : "itens"})
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Items list */}
            <div className="lg:col-span-2 space-y-2">
              {items.map((item) => (
                <div
                  key={`${item.product.id}-${JSON.stringify(item.selectedVariations)}`}
                  className="bg-white rounded-sm p-3 md:p-4 flex gap-3 md:gap-4"
                >
                  {/* Image */}
                  <Link href={`/produto/${item.product.id}`}>
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-20 h-20 md:w-24 md:h-24 rounded object-contain bg-gray-50 p-1 shrink-0"
                    />
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link href={`/produto/${item.product.id}`}>
                      <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 hover:text-[#EE4D2D] transition-colors">
                        {item.product.name}
                      </h3>
                    </Link>

                    {/* Variations */}
                    {Object.entries(item.selectedVariations).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(item.selectedVariations).map(([key, val]) => (
                          <span key={key} className="text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                            {key}: {val}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Price */}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-base font-extrabold" style={{ color: "#EE4D2D" }}>
                        {formatPrice(getItemPrice(item))}
                      </span>
                    </div>

                    {/* Quantity & remove */}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-0">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedVariations)}
                          className="w-8 h-8 border border-gray-200 flex items-center justify-center rounded-l hover:bg-gray-50 transition-colors"
                        >
                          <Minus className="w-3 h-3 text-gray-500" />
                        </button>
                        <span className="w-10 h-8 border-y border-gray-200 flex items-center justify-center text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedVariations)}
                          className="w-8 h-8 border border-gray-200 flex items-center justify-center rounded-r hover:bg-gray-50 transition-colors"
                        >
                          <Plus className="w-3 h-3 text-gray-500" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.product.id, item.selectedVariations)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order summary - desktop */}
            <div className="hidden lg:block">
              <div className="bg-white rounded-sm p-5 sticky top-24">
                <h3 className="text-base font-bold text-gray-800 mb-4">Resumo do Pedido</h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal ({totalItems} itens)</span>
                    <span>{formatPrice(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Frete</span>
                    <span className={shippingCost === 0 ? "text-[#00BFA5] font-semibold" : ""}>
                      {shippingCost === 0 ? "Grátis" : formatPrice(shippingCost)}
                    </span>
                  </div>
                  {shippingCost > 0 && (
                    <p className="text-[11px] text-gray-400">
                      Frete grátis para compras acima de R$ 99,00
                    </p>
                  )}
                  <div className="border-t border-gray-100 pt-3 flex justify-between">
                    <span className="font-bold text-gray-800">Total</span>
                    <span className="text-xl font-extrabold" style={{ color: "#EE4D2D" }}>
                      {formatPrice(finalTotal)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate("/checkout")}
                  className="w-full mt-5 py-3.5 rounded text-white font-bold text-sm transition-all hover:opacity-90"
                  style={{ background: "#EE4D2D" }}
                >
                  Continuar para o Checkout
                </button>

                <Link
                  href="/"
                  className="block text-center mt-3 text-sm text-gray-500 hover:text-[#EE4D2D] transition-colors"
                >
                  Continuar Comprando
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile sticky bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 lg:hidden z-40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Total:</span>
          <span className="text-xl font-extrabold" style={{ color: "#EE4D2D" }}>
            {formatPrice(finalTotal)}
          </span>
        </div>
        <button
          onClick={() => navigate("/checkout")}
          className="w-full py-3 rounded text-white font-bold text-sm"
          style={{ background: "#EE4D2D" }}
        >
          Continuar para o Checkout ({totalItems})
        </button>
      </div>

      <Footer />
    </div>
  );
}
