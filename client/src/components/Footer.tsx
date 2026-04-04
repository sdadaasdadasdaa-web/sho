/*
 * Design: Bazaar Digital — Footer simples e informativo
 */

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-300 mt-auto">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center mb-3">
              <img
                src="/shopee-logo-white.png"
                alt="Shopee"
                className="h-8 w-auto object-contain"
              />
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              As melhores ferramentas com preços imbatíveis. Kits profissionais, parafusadeiras, serras e muito mais. Compre com segurança e receba em casa.
            </p>
          </div>

          {/* Atendimento */}
          <div>
            <h4 className="text-white font-bold text-sm mb-3">Atendimento</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="hover:text-white transition-colors cursor-pointer">Central de Ajuda</li>
              <li className="hover:text-white transition-colors cursor-pointer">Como Comprar</li>
              <li className="hover:text-white transition-colors cursor-pointer">Formas de Pagamento</li>
              <li className="hover:text-white transition-colors cursor-pointer">Prazo de Entrega</li>
            </ul>
          </div>

          {/* Sobre */}
          <div>
            <h4 className="text-white font-bold text-sm mb-3">Sobre Nós</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="hover:text-white transition-colors cursor-pointer">Quem Somos</li>
              <li className="hover:text-white transition-colors cursor-pointer">Políticas de Privacidade</li>
              <li className="hover:text-white transition-colors cursor-pointer">Termos de Uso</li>
              <li className="hover:text-white transition-colors cursor-pointer">Trabalhe Conosco</li>
            </ul>
          </div>

          {/* Pagamento */}
          <div>
            <h4 className="text-white font-bold text-sm mb-3">Formas de Pagamento</h4>
            <div className="flex flex-wrap gap-2">
              {["Visa", "Master", "Elo", "PIX", "Boleto"].map((m) => (
                <span key={m} className="px-2.5 py-1 bg-gray-700 rounded text-xs text-gray-300">
                  {m}
                </span>
              ))}
            </div>
            <h4 className="text-white font-bold text-sm mt-4 mb-2">Segurança</h4>
            <div className="flex gap-2">
              <span className="px-2.5 py-1 bg-gray-700 rounded text-xs text-gray-300">SSL</span>
              <span className="px-2.5 py-1 bg-gray-700 rounded text-xs text-gray-300">Compra Segura</span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-xs text-gray-500">
          <p>&copy; 2026 Shopee. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
