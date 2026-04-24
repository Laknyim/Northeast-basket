import React from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/contexts/theme";

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  unit: string;
}

interface Order {
  id: number;
  items: OrderItem[];
  total: number;
  status: string;
  delivery_address: string;
  payment_method: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; darkBg: string; icon: string; label: string }> = {
  pending: { color: "#92400E", bg: "#FEF3C7", darkBg: "#2A1F0A", icon: "time-outline", label: "Pending" },
  confirmed: { color: "#1D4ED8", bg: "#DBEAFE", darkBg: "#0D1F3D", icon: "checkmark-circle-outline", label: "Confirmed" },
  out_for_delivery: { color: "#7E22CE", bg: "#F3E8FF", darkBg: "#1E0E3D", icon: "bicycle-outline", label: "Out for Delivery" },
  delivered: { color: "#059669", bg: "#D1FAE5", darkBg: "#082A1A", icon: "checkmark-done-outline", label: "Delivered" },
  cancelled: { color: "#DC2626", bg: "#FEE2E2", darkBg: "#2D0F0F", icon: "close-circle-outline", label: "Cancelled" },
};

// Ordered steps for the progress tracker (excludes cancelled)
const STATUS_STEPS = ["pending", "confirmed", "out_for_delivery", "delivered"] as const;
type StatusStep = typeof STATUS_STEPS[number];

function StatusTracker({ status }: { status: string }) {
  const { colors: C } = useTheme();
  if (status === "cancelled") {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 }}>
        <Ionicons name="close-circle" size={16} color="#DC2626" />
        <Text style={{ fontSize: 13, fontWeight: "700", color: "#DC2626" }}>Order Cancelled</Text>
      </View>
    );
  }
  const currentIdx = STATUS_STEPS.indexOf(status as StatusStep);
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 11, fontWeight: "700", color: C.textSecondary, letterSpacing: 0.5 }}>ORDER PROGRESS</Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {STATUS_STEPS.map((step, idx) => {
          const done = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          const cfg = STATUS_CONFIG[step];
          return (
            <React.Fragment key={step}>
              <View style={{ alignItems: "center", gap: 4 }}>
                <View style={{
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: done ? C.primary : C.backgroundSecondary,
                  alignItems: "center", justifyContent: "center",
                  borderWidth: isCurrent ? 2 : 0,
                  borderColor: isCurrent ? C.primary : "transparent",
                }}>
                  <Ionicons
                    name={done ? (isCurrent ? cfg.icon as never : "checkmark") : "ellipse-outline" as never}
                    size={isCurrent ? 14 : 13}
                    color={done ? "#fff" : C.textSecondary}
                  />
                </View>
                <Text style={{
                  fontSize: 9, fontWeight: isCurrent ? "700" : "500",
                  color: done ? C.primary : C.textSecondary,
                  textAlign: "center", maxWidth: 52,
                }} numberOfLines={2}>
                  {cfg.label}
                </Text>
              </View>
              {idx < STATUS_STEPS.length - 1 && (
                <View style={{
                  flex: 1, height: 2, marginBottom: 16,
                  backgroundColor: idx < currentIdx ? C.primary : C.border,
                }} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

function OrderCard({ order }: { order: Order }) {
  const { colors: C, isDark } = useTheme();
  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const date = new Date(order.created_at).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <View style={{
      backgroundColor: C.backgroundCard, borderRadius: 20, padding: 18, gap: 14,
      shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.35 : 0.07, shadowRadius: 16, elevation: 3,
      borderWidth: isDark ? 1 : 0, borderColor: C.border,
    }}>
      {/* Order header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View>
          <Text style={{ fontSize: 16, fontWeight: "700", color: C.text }}>Order #{order.id}</Text>
          <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>{date}</Text>
        </View>
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 5,
          backgroundColor: isDark ? status.darkBg : status.bg,
          paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
        }}>
          <Ionicons name={status.icon as never} size={13} color={status.color} />
          <Text style={{ fontSize: 12, fontWeight: "700", color: status.color }}>{status.label}</Text>
        </View>
      </View>

      {/* Status tracker */}
      <View style={{
        backgroundColor: isDark ? C.backgroundSecondary : "#F9FAFB",
        borderRadius: 12, padding: 12,
        borderWidth: 1, borderColor: C.borderLight,
      }}>
        <StatusTracker status={order.status} />
      </View>

      {/* Items */}
      <View style={{ gap: 6 }}>
        {order.items.slice(0, 3).map((item, i) => (
          <View key={i} style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 13, color: C.text, flex: 1, fontWeight: "500" }} numberOfLines={1}>
              {item.name} × {item.quantity}
            </Text>
            <Text style={{ fontSize: 13, color: C.text, fontWeight: "600" }}>₹{item.price * item.quantity}</Text>
          </View>
        ))}
        {order.items.length > 3 && (
          <Text style={{ fontSize: 12, color: C.textSecondary, fontStyle: "italic" }}>
            +{order.items.length - 3} more items
          </Text>
        )}
      </View>

      {/* Footer */}
      <View style={{
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Ionicons
            name={order.payment_method === "upi" ? "phone-portrait-outline" : order.payment_method === "scanner" ? "qr-code-outline" : "cash-outline"}
            size={14} color={C.textSecondary}
          />
          <Text style={{ fontSize: 12, color: C.textSecondary }}>
            {order.payment_method === "upi" ? "UPI Payment" : order.payment_method === "scanner" ? "Admin Scanner" : "Cash on Delivery"}
          </Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: "800", color: C.primary }}>₹{order.total}</Text>
      </View>

      {order.delivery_address ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: -6 }}>
          <Ionicons name="location-outline" size={13} color={C.textSecondary} />
          <Text style={{ fontSize: 12, color: C.textSecondary, flex: 1 }} numberOfLines={1}>
            {order.delivery_address}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { colors: C } = useTheme();
  const { data: orders = [], isLoading, refetch } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 20000,
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.background, paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }}>
      <View style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: C.text, letterSpacing: -0.3 }}>My Orders</Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={C.primary} />}
          renderItem={({ item }) => <OrderCard order={item} />}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 80, gap: 14 }}>
              <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: C.backgroundSecondary, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="bag-outline" size={48} color={C.border} />
              </View>
              <Text style={{ fontSize: 20, fontWeight: "700", color: C.text }}>No orders yet</Text>
              <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: "center", paddingHorizontal: 40 }}>
                Your orders will appear here after checkout
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
