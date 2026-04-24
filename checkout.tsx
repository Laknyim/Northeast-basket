import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/contexts/cart";
import { useTheme } from "@/contexts/theme";
import { apiRequest, queryClient } from "@/lib/query-client";

type PaymentMethod = "cod" | "upi" | "scanner";

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; sub: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "cod", label: "Cash on Delivery", sub: "Pay when your order arrives", icon: "cash-outline" },
  { id: "upi", label: "UPI Payment", sub: "Pay via any UPI app (GPay, PhonePe, etc.)", icon: "phone-portrait-outline" },
  { id: "scanner", label: "Admin Scanner", sub: "Scan admin's QR code to pay manually", icon: "qr-code-outline" },
];

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { items, total, clearCart } = useCart();
  const { colors: C, isDark } = useTheme();
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { data: chargeData } = useQuery<{ charge: number }>({
    queryKey: ["/api/settings/delivery-charge"],
    staleTime: 60_000,
  });
  const deliveryFee = items.length > 0 ? (chargeData?.charge ?? 20) : 0;
  const grandTotal = total + deliveryFee;

  const handlePlaceOrder = async () => {
    if (!address.trim()) { setError("Please enter your delivery address"); return; }
    if (items.length === 0) { setError("Your cart is empty"); return; }
    setError("");
    setLoading(true);
    try {
      await apiRequest("POST", "/api/orders", {
        items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, unit: i.unit, vendor_name: i.vendor_name })),
        total: grandTotal,
        deliveryAddress: address.trim(),
        deliveryNotes: notes.trim(),
        paymentMethod,
      });
      clearCart();
      await queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      if (Platform.OS === "web") {
        alert("Order placed! We'll confirm soon.");
        router.replace("/(shop)/orders");
      } else {
        Alert.alert("Order Placed!", "Your order has been placed successfully. We'll confirm and deliver soon.", [
          { text: "View Orders", onPress: () => router.replace("/(shop)/orders") },
        ]);
      }
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : "Failed to place order").replace(/^\d+:\s*/, ""));
    } finally {
      setLoading(false);
    }
  };

  const SectionTitle = ({ title }: { title: string }) => (
    <Text style={{ fontSize: 12, fontWeight: "700", color: C.textTertiary, textTransform: "uppercase", letterSpacing: 0.8, paddingLeft: 2 }}>{title}</Text>
  );

  const Card = ({ children }: { children: React.ReactNode }) => (
    <View style={{
      backgroundColor: C.backgroundCard, borderRadius: 20, padding: 18, gap: 14,
      shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.35 : 0.06, shadowRadius: 16, elevation: 3,
      borderWidth: isDark ? 1 : 0, borderColor: C.border,
    }}>
      {children}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16), gap: 16, paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              width: 40, height: 40, alignItems: "center", justifyContent: "center",
              backgroundColor: C.backgroundCard, borderRadius: 12,
              borderWidth: isDark ? 1 : 0, borderColor: C.border, opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </Pressable>
          <Text style={{ fontSize: 20, fontWeight: "800", color: C.text }}>Checkout</Text>
          <View style={{ width: 40 }} />
        </View>

        <SectionTitle title="Order Summary" />
        <Card>
          {items.map((item, i) => (
            <View key={item.id} style={{
              flexDirection: "row", justifyContent: "space-between", alignItems: "center",
              paddingVertical: i < items.length - 1 ? 4 : 0,
              borderBottomWidth: i < items.length - 1 ? 1 : 0, borderBottomColor: C.borderLight,
              paddingBottom: i < items.length - 1 ? 12 : 0, marginBottom: i < items.length - 1 ? 4 : 0,
            }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: C.text }} numberOfLines={1}>{item.name}</Text>
                <Text style={{ fontSize: 12, color: C.textSecondary }}>{item.vendor_name}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 2 }}>
                <Text style={{ fontSize: 12, color: C.textSecondary }}>{item.quantity} {item.unit}</Text>
                <Text style={{ fontSize: 14, fontWeight: "700", color: C.text }}>₹{item.price * item.quantity}</Text>
              </View>
            </View>
          ))}
        </Card>

        <SectionTitle title="Delivery Details" />
        <Card>
          <View style={{ gap: 7 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: C.text }}>Delivery Address *</Text>
            <View style={{ flexDirection: "row", alignItems: "flex-start", borderWidth: 1.5, borderColor: C.border, borderRadius: 14, backgroundColor: C.backgroundSecondary }}>
              <Ionicons name="location-outline" size={17} color={C.textSecondary} style={{ paddingLeft: 14, paddingTop: 14 }} />
              <TextInput
                style={{ flex: 1, fontSize: 14, color: C.text, paddingHorizontal: 12, paddingVertical: 13, height: 84 }}
                value={address}
                onChangeText={setAddress}
                placeholder="House no., Street, Landmark, Longleng..."
                multiline
                textAlignVertical="top"
                placeholderTextColor={C.textTertiary}
              />
            </View>
          </View>
          <View style={{ gap: 7 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: C.text }}>Delivery Notes (optional)</Text>
            <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: C.border, borderRadius: 14, backgroundColor: C.backgroundSecondary }}>
              <Ionicons name="chatbubble-outline" size={17} color={C.textSecondary} style={{ paddingLeft: 14 }} />
              <TextInput
                style={{ flex: 1, fontSize: 14, color: C.text, paddingHorizontal: 12, paddingVertical: 13 }}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any special instructions..."
                placeholderTextColor={C.textTertiary}
              />
            </View>
          </View>
        </Card>

        <SectionTitle title="Payment Method" />
        <Card>
          {PAYMENT_OPTIONS.map((option) => {
            const isSelected = paymentMethod === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => setPaymentMethod(option.id)}
                style={({ pressed }) => ({
                  flexDirection: "row", alignItems: "center", gap: 14,
                  padding: 12, borderRadius: 14, borderWidth: 2,
                  borderColor: isSelected ? C.primary : C.borderLight,
                  backgroundColor: isSelected ? (isDark ? "#0A2519" : "#F0FDF4") : C.backgroundSecondary,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <View style={{
                  width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center",
                  backgroundColor: isSelected ? C.primary : C.backgroundCard,
                }}>
                  <Ionicons name={option.icon} size={20} color={isSelected ? "#fff" : C.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: C.text }}>{option.label}</Text>
                  <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>{option.sub}</Text>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={22} color={C.primary} />}
              </Pressable>
            );
          })}
        </Card>

        <SectionTitle title="Price Breakdown" />
        <Card>
          {[
            { label: `Subtotal (${items.length} items)`, value: `₹${total}` },
            { label: "Delivery Fee", value: `₹${deliveryFee}` },
          ].map(({ label, value }) => (
            <View key={label} style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, color: C.textSecondary }}>{label}</Text>
              <Text style={{ fontSize: 14, color: C.text, fontWeight: "600" }}>{value}</Text>
            </View>
          ))}
          <View style={{ height: 1, backgroundColor: C.border }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: C.text }}>Total Payable</Text>
            <Text style={{ fontSize: 20, fontWeight: "800", color: C.primary }}>₹{grandTotal}</Text>
          </View>
        </Card>

        {error ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: isDark ? "#2D1515" : "#FEF2F2", borderRadius: 12, padding: 12 }}>
            <Ionicons name="alert-circle" size={16} color={C.danger} />
            <Text style={{ flex: 1, color: C.danger, fontSize: 13 }}>{error}</Text>
          </View>
        ) : null}

        <View style={{ height: 16 }} />
      </ScrollView>

      <View style={{
        backgroundColor: C.backgroundCard, paddingHorizontal: 20, paddingTop: 16,
        paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16),
        borderTopWidth: 1, borderTopColor: C.border, gap: 14,
      }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 14, color: C.textSecondary, fontWeight: "600" }}>Total</Text>
          <Text style={{ fontSize: 24, fontWeight: "900", color: C.primary }}>₹{grandTotal}</Text>
        </View>
        <Pressable
          style={({ pressed }) => ({
            backgroundColor: C.primary, borderRadius: 16, paddingVertical: 16,
            flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
            shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
            opacity: loading ? 0.7 : pressed ? 0.88 : 1,
            transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
          })}
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="bag-check-outline" size={20} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                Place Order · {PAYMENT_OPTIONS.find(p => p.id === paymentMethod)?.label}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}
