import type { CartItem } from "./data";

/**
 * Resolve o preço correto de um item do carrinho baseado na variante selecionada.
 * Se a variante tem preços específicos (prices[]), usa o preço da variante.
 * Caso contrário, usa o preço base do produto.
 */
export function getItemPrice(item: CartItem): number {
  for (const variation of item.product.variations) {
    if (variation.prices && item.selectedVariations[variation.label]) {
      const idx = variation.options.indexOf(item.selectedVariations[variation.label]);
      if (idx >= 0 && variation.prices[idx] !== undefined) {
        return variation.prices[idx];
      }
    }
  }
  return item.product.price;
}
