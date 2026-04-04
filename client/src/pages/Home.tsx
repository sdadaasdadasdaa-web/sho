/*
 * Design: Bazaar Digital — Home estilo Shopee "Achadinhos"
 * Carrossel hero, categorias, flash sale, grid denso de produtos
 */
import { useState, useMemo, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BannerCarousel from "@/components/BannerCarousel";
import CategoryBar from "@/components/CategoryBar";
import ProductCard from "@/components/ProductCard";
import FlashSale from "@/components/FlashSale";
import { products } from "@/lib/data";
import { Flame, ChevronUp } from "lucide-react";

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 600);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F5]">
      <Header onSearch={setSearchQuery} />

      {/* Banner Carousel */}
      <BannerCarousel />

      {/* Categories */}
      <CategoryBar
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Flash Sale Section */}
      <FlashSale />

      {/* Main Product Grid */}
      <section className="container py-4 md:py-6 flex-1">
        {/* Section header */}
        <div className="flex items-center gap-2 mb-4 md:mb-5">
          <div className="w-1 h-6 rounded-full" style={{ background: "#EE4D2D" }} />
          <h2 className="text-lg md:text-xl font-extrabold text-gray-800 flex items-center gap-2">
            <Flame className="w-5 h-5" style={{ color: "#EE4D2D" }} />
            {selectedCategory
              ? selectedCategory
              : searchQuery
              ? `Resultados para "${searchQuery}"`
              : "Ferramentas em Oferta"}
          </h2>
          {(selectedCategory || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategory(null);
                setSearchQuery("");
              }}
              className="ml-auto text-xs font-medium px-3 py-1 rounded-full border border-gray-300 text-gray-500 hover:border-[#EE4D2D] hover:text-[#EE4D2D] transition-colors"
            >
              Limpar filtro
            </button>
          )}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">Nenhum produto encontrado</p>
            <p className="text-gray-300 text-sm mt-1">Tente buscar por outro termo</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <Footer />

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-white transition-all hover:scale-110 z-40"
          style={{ background: "#EE4D2D" }}
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
