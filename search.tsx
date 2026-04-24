import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
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
import { getApiUrl, getAuthToken } from "@/lib/query-client";
import { fetch } from "expo/fetch";

interface Product {
  id: number;
  name: string;
  price: number;
  unit: string;
  category_name: string;
  vendor_name: string;
  stock: number;
  description: string;
  image_url?: string;
}

interface Category {
  id: number;
  name: string;
}

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

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ categoryId?: string; categoryName?: string }>();
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<number | null>(
    params.categoryId ? parseInt(params.categoryId) : null
  );
  const { addItem } = useCart();
  const { colors: C, isDark } = useTheme();

  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products", selectedCat, search],
    queryFn: async () => {
      const base = getApiUrl();
      const url = new URL("/api/products", base);
      if (selectedCat) url.searchParams.set("category_id", String(selectedCat));
      if (search.trim()) url.searchParams.set("search", search.trim());
      const headers: Record<string, string> = {};
      const token = getAuthToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(url.toString(), { headers });
      return res.json();
    },
  });

  const isActive = (id: number) => (selectedCat === null && id === 0) || selectedCat === id;

  return (
    <View style={{ flex: 1, backgroundColor: C.background, paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }}>
      {/* Search Bar */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 14 }}>
        <View style={{
          flexDirection: "row", alignItems: "center",
          backgroundColor: C.backgroundCard, borderRadius: 16,
          borderWidth: 1.5, borderColor: C.border,
          shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.06, shadowRadius: 8, elevation: 2,
        }}>
          <Ionicons name="search-outline" size={18} color={C.textSecondary} style={{ paddingLeft: 14 }} />
          <TextInput
            style={{ flex: 1, fontSize: 15, color: C.text, paddingHorizontal: 10, paddingVertical: 13 }}
            placeholder="Search products..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={C.textTertiary}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} style={{ padding: 12 }}>
              <Ionicons name="close-circle" size={18} color={C.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Category Filter */}
      <FlatList
        horizontal
        data={[{ id: 0, name: "All" }, ...categories] as (Category & { id: number })[]}
        keyExtractor={(item) => String(item.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 14 }}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => ({
              flexDirection: "row", alignItems: "center", gap: 5,
              paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
              backgroundColor: isActive(item.id) ? C.primary : C.backgroundCard,
              borderWidth: 1.5,
              borderColor: isActive(item.id) ? C.primary : C.border,
              opacity: pressed ? 0.8 : 1,
            })}
            onPress={() => setSelectedCat(item.id === 0 ? null : item.id)}
          >
            {item.id !== 0 && (
              <Ionicons
                name={(CAT_ICONS[item.name] || "grid") as never}
                size={13}
                color={isActive(item.id) ? "#fff" : C.textSecondary}
              />
            )}
            <Text style={{ fontSize: 13, fontWeight: "600", color: isActive(item.id) ? "#fff" : C.textSecondary }}>
              {item.name}
            </Text>
          </Pressable>
        )}
      />

      {/* Results */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          columnWrapperStyle={{ gap: 12, marginBottom: 12 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => ({
                flex: 1, backgroundColor: C.backgroundCard, borderRadius: 20, overflow: "hidden",
                shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.35 : 0.07, shadowRadius: 16, elevation: 3,
                borderWidth: isDark ? 1 : 0, borderColor: C.border,
                transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }],
                opacity: pressed ? 0.9 : 1,
              })}
              onPress={() => router.push({ pathname: "/product/[id]", params: { id: String(item.id) } })}
            >
              <View style={{ height: 130, alignItems: "center", justifyContent: "center", backgroundColor: C.backgroundSecondary, overflow: "hidden" }}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={{ width: "100%", height: 130 }} resizeMode="cover" />
                ) : (
                  <Ionicons
                    name={(CAT_ICONS[item.category_name] || "cube-outline") as never}
                    size={40}
                    color={CAT_COLORS[item.category_name] || C.primary}
                  />
                )}
              </View>
              <View style={{ padding: 12, gap: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: C.text, lineHeight: 18 }} numberOfLines={2}>{item.name}</Text>
                <Text style={{ fontSize: 11, color: C.textSecondary }} numberOfLines={1}>{item.vendor_name}</Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: C.primary }}>
                    ₹{item.price}<Text style={{ fontSize: 11, fontWeight: "400", color: C.textSecondary }}>/{item.unit}</Text>
                  </Text>
                  <Pressable
                    style={({ pressed }) => ({
                      width: 32, height: 32, borderRadius: 10, backgroundColor: C.primary,
                      alignItems: "center", justifyContent: "center", opacity: pressed ? 0.8 : 1,
                    })}
                    onPress={(e) => {
                      e.stopPropagation();
                      addItem({ id: item.id, name: item.name, price: item.price, quantity: 1, unit: item.unit, vendor_name: item.vendor_name, image_url: item.image_url });
                    }}
                  >
                    <Ionicons name="add" size={20} color="#fff" />
                  </Pressable>
                </View>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 80, gap: 12 }}>
              <Ionicons name="search-outline" size={56} color={C.border} />
              <Text style={{ fontSize: 18, fontWeight: "700", color: C.text }}>No products found</Text>
              <Text style={{ fontSize: 14, color: C.textSecondary }}>Try a different search or category</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
