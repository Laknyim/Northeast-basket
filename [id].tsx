import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/contexts/cart";
import { useTheme } from "@/contexts/theme";

const CAT_ICONS: Record<string, string> = {
  Vegetables: "leaf",
  Fruits: "nutrition",
  Meat: "flame",
  Groceries: "basket",
  "Local Products": "storefront",
  Others: "grid",
};

const CAT_COLORS: Record<string, string> = {
  Vegetables: "#2E7D32",
  Fruits: "#E65100",
  Meat: "#B71C1C",
  Groceries: "#1565C0",
  "Local Products": "#6A1B9A",
  Others: "#37474F",
};

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  unit: string;
  stock: number;
  category_name: string;
  vendor_name: string;
  is_approved: boolean;
  image_url?: string;
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { addItem, items } = useCart();
  const { colors: C, isDark } = useTheme();
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["/api/products", id],
  });

  const cartItem = items.find((i) => i.id === parseInt(id || "0"));

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.background, paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.background, paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0), gap: 16 }}>
        <Text style={{ fontSize: 18, color: C.textSecondary }}>Product not found</Text>
        <Pressable
          onPress={() => router.back()}
          style={{ backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const catColor = CAT_COLORS[product.category_name] || C.primary;
  const catIcon = CAT_ICONS[product.category_name] || "cube-outline";

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem({ id: product.id, name: product.name, price: product.price, quantity: 1, unit: product.unit, vendor_name: product.vendor_name, image_url: product.image_url });
    }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* Hero */}
      <View style={{ backgroundColor: C.primary, paddingTop: topPad, paddingHorizontal: 20, paddingBottom: 36, overflow: "hidden" }}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: "rgba(255,255,255,0.2)",
            alignItems: "center", justifyContent: "center",
            marginBottom: 16, opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>

        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={{ width: "100%", height: 220, borderRadius: 20 }}
            resizeMode="cover"
          />
        ) : (
          <View style={{
            alignSelf: "center", width: 160, height: 160, borderRadius: 32,
            backgroundColor: catColor + "25",
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name={catIcon as never} size={80} color={catColor} />
          </View>
        )}
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 24, gap: 18, marginTop: -18 }}>
          {/* Category Badge */}
          <View style={{
            alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6,
            backgroundColor: catColor + "18", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
          }}>
            <Ionicons name={catIcon as never} size={13} color={catColor} />
            <Text style={{ fontSize: 12, fontWeight: "700", color: catColor }}>{product.category_name}</Text>
          </View>

          <Text style={{ fontSize: 26, fontWeight: "800", color: C.text, lineHeight: 32, letterSpacing: -0.4 }}>{product.name}</Text>

          {/* Price */}
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
            <Text style={{ fontSize: 34, fontWeight: "900", color: C.primary }}>₹{product.price}</Text>
            <Text style={{ fontSize: 15, color: C.textSecondary }}>per {product.unit}</Text>
          </View>

          {/* Vendor + Stock */}
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 10,
            backgroundColor: C.backgroundSecondary, borderRadius: 14, padding: 14,
          }}>
            <View style={{
              width: 36, height: 36, borderRadius: 10, backgroundColor: C.primaryFade,
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name="storefront-outline" size={16} color={C.primary} />
            </View>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: C.text }}>{product.vendor_name}</Text>
            <View style={{
              backgroundColor: isDark ? "#082A1A" : "#DCFCE7",
              paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
            }}>
              <Text style={{ fontSize: 12, color: "#059669", fontWeight: "700" }}>In Stock: {product.stock}</Text>
            </View>
          </View>

          {/* Description */}
          {product.description ? (
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: C.text }}>Description</Text>
              <Text style={{ fontSize: 14, color: C.textSecondary, lineHeight: 22 }}>{product.description}</Text>
            </View>
          ) : null}

          {/* Quantity */}
          <View style={{
            flexDirection: "row", justifyContent: "space-between", alignItems: "center",
            backgroundColor: C.backgroundCard, borderRadius: 16, padding: 16,
            borderWidth: isDark ? 1 : 0, borderColor: C.border,
          }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: C.text }}>Quantity</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <Pressable
                style={({ pressed }) => ({
                  width: 38, height: 38, borderRadius: 12, borderWidth: 1.5, borderColor: C.border,
                  alignItems: "center", justifyContent: "center", backgroundColor: C.backgroundCard,
                  opacity: pressed ? 0.7 : 1,
                })}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Ionicons name="remove" size={20} color={C.text} />
              </Pressable>
              <Text style={{ fontSize: 22, fontWeight: "800", color: C.text, minWidth: 30, textAlign: "center" }}>{quantity}</Text>
              <Pressable
                style={({ pressed }) => ({
                  width: 38, height: 38, borderRadius: 12,
                  backgroundColor: C.primary,
                  alignItems: "center", justifyContent: "center",
                  opacity: pressed ? 0.8 : 1,
                })}
                onPress={() => setQuantity(quantity + 1)}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </Pressable>
            </View>
          </View>

          {/* Already in cart */}
          {cartItem && (
            <View style={{
              flexDirection: "row", alignItems: "center", gap: 8,
              backgroundColor: isDark ? "#082A1A" : "#DCFCE7",
              borderRadius: 12, padding: 12,
            }}>
              <Ionicons name="cart" size={16} color="#059669" />
              <Text style={{ fontSize: 13, color: "#059669", fontWeight: "600" }}>{cartItem.quantity} already in cart</Text>
            </View>
          )}
        </View>
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={{
        backgroundColor: C.backgroundCard, paddingHorizontal: 20, paddingTop: 16,
        paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16),
        borderTopWidth: 1, borderTopColor: C.border, gap: 14,
      }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 14, color: C.textSecondary, fontWeight: "600" }}>Total for {quantity} {quantity === 1 ? product.unit : product.unit + "s"}</Text>
          <Text style={{ fontSize: 26, fontWeight: "900", color: C.primary }}>₹{product.price * quantity}</Text>
        </View>
        <Pressable
          style={({ pressed }) => ({
            backgroundColor: C.primary, borderRadius: 16, paddingVertical: 16,
            flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
            shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
            opacity: pressed ? 0.88 : 1,
            transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
          })}
          onPress={handleAddToCart}
        >
          <Ionicons name="cart-outline" size={20} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Add to Cart</Text>
        </Pressable>
      </View>
    </View>
  );
}
