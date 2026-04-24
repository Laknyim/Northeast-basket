import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  vendor_name: string;
  image_url?: string;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (product: CartItem) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  total: number;
  count: number;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "longleng_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setItems(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  const persist = (newItems: CartItem[]) => {
    setItems(newItems);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
  };

  const addItem = (product: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      let updated: CartItem[];
      if (existing) {
        updated = prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        updated = [...prev, { ...product, quantity: 1 }];
      }
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const removeItem = (id: number) => {
    const updated = items.filter((i) => i.id !== id);
    persist(updated);
  };

  const updateQuantity = (id: number, quantity: number) => {
    if (quantity <= 0) { removeItem(id); return; }
    const updated = items.map((i) => i.id === id ? { ...i, quantity } : i);
    persist(updated);
  };

  const clearCart = () => persist([]);

  const total = useMemo(
    () => items.reduce((s, i) => s + i.price * i.quantity, 0),
    [items]
  );
  const count = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);

  const value = useMemo(
    () => ({ items, addItem, removeItem, updateQuantity, clearCart, total, count }),
    [items, total, count]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
