import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Product, CartItem } from "@/lib/data";
import { getItemPrice } from "@/lib/pricing";

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity: number, variations: Record<string, string>) => void;
  removeItem: (productId: number, variations?: Record<string, string>) => void;
  updateQuantity: (productId: number, quantity: number, variations?: Record<string, string>) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((product: Product, quantity: number, variations: Record<string, string>) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          JSON.stringify(item.selectedVariations) === JSON.stringify(variations)
      );
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      }
      return [...prev, { product, quantity, selectedVariations: variations }];
    });
  }, []);

  const removeItem = useCallback((productId: number, variations?: Record<string, string>) => {
    setItems((prev) => prev.filter((item) => {
      if (item.product.id !== productId) return true;
      if (variations !== undefined) {
        return JSON.stringify(item.selectedVariations) !== JSON.stringify(variations);
      }
      return false;
    }));
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number, variations?: Record<string, string>) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => {
        if (item.product.id !== productId) return true;
        if (variations !== undefined) {
          return JSON.stringify(item.selectedVariations) !== JSON.stringify(variations);
        }
        return false;
      }));
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId) return item;
        if (variations !== undefined && JSON.stringify(item.selectedVariations) !== JSON.stringify(variations)) return item;
        return { ...item, quantity };
      })
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + getItemPrice(item) * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
