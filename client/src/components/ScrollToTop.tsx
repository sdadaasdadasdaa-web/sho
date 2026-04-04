import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Rola a janela para o topo sempre que a rota muda.
 * Necessário porque o wouter (SPA router) não faz isso automaticamente.
 */
export default function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location]);

  return null;
}
