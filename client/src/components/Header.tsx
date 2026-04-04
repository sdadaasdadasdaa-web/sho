/*
 * Design: Bazaar Digital — Header fixo estilo Shopee
 * Fundo laranja #EE4D2D, barra de pesquisa centralizada, ícone carrinho com badge
 */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, ShoppingCart, Home, Menu, X, ChevronLeft } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

interface HeaderProps {
  onSearch?: (query: string) => void;
}

export default function Header({ onSearch }: HeaderProps) {
  const { totalItems } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const isHome = location === "/";

  return (
    <header className="sticky top-0 z-50 w-full" style={{ background: "linear-gradient(180deg, #EE4D2D 0%, #D73211 100%)" }}>
      {/* Top bar - desktop only */}
      <div className="hidden md:block border-b border-white/10">
        <div className="container flex items-center justify-between py-1.5 text-xs text-white/80">
          <div className="flex items-center gap-4">
            <span className="hover:text-white transition-colors">Central do Vendedor</span>
            <span className="text-white/40">|</span>
            <span className="hover:text-white transition-colors">Baixe o App</span>
            <span className="text-white/40">|</span>
            <span className="hover:text-white transition-colors">Siga-nos</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:text-white transition-colors">Ajuda</span>
            <span className="text-white/40">|</span>
            <span className="hover:text-white transition-colors">Cadastrar</span>
            <span className="text-white/40">|</span>
            <span className="hover:text-white transition-colors font-semibold">Entrar</span>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container flex items-center gap-3 py-2.5 md:py-3">
        {/* Back button on non-home pages (mobile) */}
        {!isHome && (
          <button
            onClick={() => {
              // Se o exit-intent empurrou um estado extra no histórico, precisamos voltar 2 passos
              // para pular o estado extra e ir para a página anterior real.
              // Detectamos isso verificando se o estado atual tem exitIntent.
              const state = window.history.state;
              if (state && state.exitIntent) {
                window.history.go(-2);
              } else {
                window.history.go(-1);
              }
            }}
            className="md:hidden text-white p-1"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0">
          <img
            src="/shopee-logo-white.png"
            alt="Shopee"
            className="h-8 md:h-10 w-auto object-contain"
          />
        </Link>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
          <div className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar ferramentas, kits, parafusadeiras..."
              className="w-full h-10 md:h-11 pl-4 pr-12 rounded-sm bg-white text-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <button
              type="submit"
              className="absolute right-0 top-0 h-full px-4 flex items-center justify-center rounded-r-sm transition-colors"
              style={{ background: "#D73211" }}
            >
              <Search className="w-5 h-5 text-white" />
            </button>
          </div>
        </form>

        {/* Cart icon */}
        <Link href="/carrinho" className="relative p-2 text-white hover:bg-white/10 rounded-lg transition-colors">
          <ShoppingCart className="w-6 h-6" />
          {totalItems > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 flex items-center justify-center rounded-full text-[11px] font-bold px-1 animate-in zoom-in-50 duration-200"
              style={{ background: "#FFD700", color: "#EE4D2D" }}>
              {totalItems > 99 ? "99+" : totalItems}
            </span>
          )}
        </Link>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/10 backdrop-blur-sm border-t border-white/10">
          <div className="container py-3 flex flex-col gap-2 text-white text-sm">
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-2 hover:bg-white/10 rounded px-2">
              <Home className="w-4 h-4" /> Início
            </Link>
            <Link href="/carrinho" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-2 hover:bg-white/10 rounded px-2">
              <ShoppingCart className="w-4 h-4" /> Carrinho ({totalItems})
            </Link>
            <div className="border-t border-white/20 pt-2 mt-1">
              <span className="px-2 py-1 text-white/60 text-xs">Conta</span>
              <div className="flex items-center gap-2 py-2 hover:bg-white/10 rounded px-2 mt-1">Entrar</div>
              <div className="flex items-center gap-2 py-2 hover:bg-white/10 rounded px-2">Cadastrar</div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
