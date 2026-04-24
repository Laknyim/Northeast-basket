import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/auth";
import { apiRequest } from "@/lib/query-client";
import { useTheme } from "@/contexts/theme";

const C = Colors.light;

interface Product {
  id: number;
  name: string;
  price: number;
  unit: string;
  stock: number;
  category_name: string;
  is_approved: boolean;
  is_active: boolean;
  rejection_reason: string | null;
}

interface VendorProfile {
  shop_name: string;
  phone: string;
  product_type: string;
  slot_number: number | null;
  is_approved: boolean;
  registration_year: number;
  registration_paid: boolean;
}

interface FeeRecord {
  id: number;
  fee_type: string;
  amount: number;
  fee_date: string;
  paid: boolean;
}

function VendorNotificationBell() {
  const { colors: TC, isDark } = useTheme();
  const { data } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30000,
  });
  const unread = data?.count ?? 0;
  return (
    <Pressable
      onPress={() => router.push("/notifications" as never)}
      style={({ pressed }) => ({
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: TC.backgroundSecondary,
        alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: TC.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name="notifications-outline" size={20} color={TC.textSecondary} />
      {unread > 0 && (
        <View style={{
          position: "absolute", top: 4, right: 4,
          minWidth: 14, height: 14, borderRadius: 7, paddingHorizontal: 2,
          backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ fontSize: 8, color: "#fff", fontWeight: "800" }}>{unread > 99 ? "99+" : unread}</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function VendorDashboard() {
  const insets = useSafeAreaInsets();
  const { colors: TC } = useTheme();
  const { user, logout } = useAuth();
  const qc = useQueryClient();

  const { data: profile } = useQuery<VendorProfile>({
    queryKey: ["/api/vendor/profile"],
  });

  const { data: products = [], isLoading, refetch } = useQuery<Product[]>({
    queryKey: ["/api/vendor/products"],
  });

  const { data: fees = [] } = useQuery<FeeRecord[]>({
    queryKey: ["/api/vendor/fees"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/vendor/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/vendor/products"] }),
    onError: (e: Error) => {
      Alert.alert("Cannot Delete", e.message.replace(/^\d+:\s*/, ""));
    },
  });

  const handleDelete = (id: number, name: string, isApproved: boolean) => {
    if (isApproved) {
      Alert.alert("Live Product", "This product is live and cannot be deleted. Contact admin to remove it.");
      return;
    }
    if (Platform.OS === "web") {
      if (confirm(`Delete "${name}"?`)) deleteMutation.mutate(id);
    } else {
      Alert.alert("Delete Product", `Delete "${name}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(id) },
      ]);
    }
  };

  const approved = products.filter((p) => p.is_approved).length;
  const pending = products.filter((p) => !p.is_approved && !p.rejection_reason).length;
  const rejected = products.filter((p) => !p.is_approved && !!p.rejection_reason).length;
  const pendingFees = fees.filter((f) => !f.paid).reduce((s, f) => s + Number(f.amount), 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0), backgroundColor: TC.background }]}>
      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={C.primary} />}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>Vendor Panel</Text>
                <Text style={styles.shopName}>{profile?.shop_name || user?.name}</Text>
                {profile?.slot_number && (
                  <Text style={styles.slotText}>Slot #{profile.slot_number}</Text>
                )}
              </View>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <VendorNotificationBell />
                <Pressable onPress={logout} style={styles.logoutBtn}>
                  <Ionicons name="log-out-outline" size={20} color={C.textSecondary} />
                </Pressable>
              </View>
            </View>

            {/* Approval status */}
            {profile && !profile.is_approved && (
              <View style={styles.pendingBanner}>
                <Ionicons name="time-outline" size={18} color="#92400E" />
                <Text style={styles.pendingBannerText}>
                  Your vendor account is pending admin approval. Products will go live after approval.
                </Text>
              </View>
            )}

            {/* Stats */}
            <View style={styles.statsRow}>
              {[
                { label: "Live", value: approved, icon: "checkmark-circle", color: C.success },
                { label: "Pending", value: pending, icon: "time-outline", color: "#F59E0B" },
                { label: "Rejected", value: rejected, icon: "close-circle-outline", color: "#DC2626" },
                { label: "Fees Due", value: `₹${pendingFees}`, icon: "cash-outline", color: C.danger },
              ].map((stat) => (
                <View key={stat.label} style={styles.statCard}>
                  <Ionicons name={stat.icon as never} size={20} color={stat.color} />
                  <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>

            {/* Quick Actions */}
            <View style={styles.actionsRow}>
              <Pressable style={styles.primaryAction} onPress={() => router.push("/(vendor)/add-product")}>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.primaryActionText}>Add Product</Text>
              </Pressable>
              <Pressable style={styles.secondaryAction} onPress={() => router.push("/(shop)")}>
                <Ionicons name="storefront-outline" size={20} color={C.primary} />
                <Text style={styles.secondaryActionText}>View Shop</Text>
              </Pressable>
            </View>

            {/* Fee Summary */}
            {fees.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Fees</Text>
                <View style={styles.feesCard}>
                  {fees.slice(0, 3).map((fee) => (
                    <View key={fee.id} style={styles.feeRow}>
                      <View>
                        <Text style={styles.feeType}>
                          {fee.fee_type === "platform" ? "Platform Fee" : "Registration Fee"}
                        </Text>
                        <Text style={styles.feeDate}>
                          {new Date(fee.fee_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </Text>
                      </View>
                      <View style={styles.feeRight}>
                        <Text style={styles.feeAmount}>₹{fee.amount}</Text>
                        <View style={[styles.feeBadge, { backgroundColor: fee.paid ? "#DCFCE7" : "#FEF3C7" }]}>
                          <Text style={[styles.feeBadgeText, { color: fee.paid ? "#15803D" : "#92400E" }]}>
                            {fee.paid ? "Paid" : "Pending"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <Text style={[styles.sectionTitle, { paddingHorizontal: 0, marginTop: 8 }]}>
              My Products ({products.length})
            </Text>
          </>
        }
        renderItem={({ item }) => {
          const isLive = item.is_approved;
          const isRejected = !item.is_approved && !!item.rejection_reason;
          const statusBg = isLive ? "#DCFCE7" : isRejected ? "#FEE2E2" : "#FEF3C7";
          const statusColor = isLive ? "#15803D" : isRejected ? "#DC2626" : "#92400E";
          const statusLabel = isLive ? "✅ Approved" : isRejected ? "❌ Rejected" : "⏳ Pending";
          return (
            <View style={[styles.productCard, isRejected && styles.productCardRejected]}>
              <View style={styles.productMain}>
                <View style={styles.productIcon}>
                  <Ionicons name="cube-outline" size={24} color={C.primary} />
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.productMeta}>{item.category_name} • ₹{item.price}/{item.unit}</Text>
                  <Text style={styles.productStock}>Stock: {item.stock}</Text>
                </View>
                <View style={styles.productActions}>
                  <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
                    <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
                  </View>
                  <Pressable
                    style={[styles.editBtn, isLive && styles.btnDisabled]}
                    onPress={() => {
                      if (isLive) {
                        Alert.alert("Live Product", "This product is live. Contact admin to make changes.");
                        return;
                      }
                      router.push({ pathname: "/(vendor)/add-product", params: { productId: String(item.id) } });
                    }}
                  >
                    <Ionicons name={isLive ? "lock-closed-outline" : "create-outline"} size={18} color={isLive ? C.textSecondary : C.primary} />
                  </Pressable>
                  <Pressable
                    style={[styles.deleteBtn, isLive && styles.btnDisabled]}
                    onPress={() => handleDelete(item.id, item.name, item.is_approved)}
                  >
                    <Ionicons name="trash-outline" size={18} color={isLive ? C.textSecondary : C.danger} />
                  </Pressable>
                </View>
              </View>
              {isRejected && item.rejection_reason && (
                <View style={styles.rejectionNote}>
                  <Ionicons name="alert-circle-outline" size={14} color="#DC2626" />
                  <Text style={styles.rejectionNoteText}>Admin: {item.rejection_reason}</Text>
                </View>
              )}
              {isLive && (
                <View style={styles.liveNote}>
                  <Ionicons name="checkmark-circle" size={13} color="#15803D" />
                  <Text style={styles.liveNoteText}>Visible to customers · contact admin to edit or remove</Text>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={56} color={C.border} />
              <Text style={styles.emptyTitle}>No products yet</Text>
              <Text style={styles.emptySub}>Add your first product to start selling</Text>
              <Pressable style={styles.addFirstBtn} onPress={() => router.push("/(vendor)/add-product")}>
                <Text style={styles.addFirstBtnText}>Add Product</Text>
              </Pressable>
            </View>
          ) : (
            <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingVertical: 16,
  },
  greeting: { fontSize: 13, color: C.textSecondary, fontWeight: "500" },
  shopName: { fontSize: 22, fontWeight: "800", color: C.text, marginTop: 2 },
  slotText: { fontSize: 13, color: C.primary, fontWeight: "600", marginTop: 2 },
  logoutBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.backgroundCard,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  pendingBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#FEF3C7", borderRadius: 12, padding: 14, marginBottom: 8,
  },
  pendingBannerText: { flex: 1, fontSize: 13, color: "#92400E", lineHeight: 18 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  statCard: {
    flex: 1, backgroundColor: C.backgroundCard, borderRadius: 14, padding: 12, alignItems: "center", gap: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statValue: { fontSize: 18, fontWeight: "800" },
  statLabel: { fontSize: 10, color: C.textSecondary, textAlign: "center", fontWeight: "600" },
  actionsRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  primaryAction: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: C.primary, borderRadius: 14, paddingVertical: 13,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  primaryActionText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondaryAction: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: C.backgroundCard, borderRadius: 14, paddingVertical: 13,
    borderWidth: 1.5, borderColor: C.primary,
  },
  secondaryActionText: { color: C.primary, fontWeight: "700", fontSize: 15 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: C.text },
  feesCard: {
    backgroundColor: C.backgroundCard, borderRadius: 14, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  feeRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 14, borderBottomWidth: 1, borderBottomColor: C.borderLight,
  },
  feeType: { fontSize: 14, fontWeight: "600", color: C.text },
  feeDate: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  feeRight: { alignItems: "flex-end", gap: 4 },
  feeAmount: { fontSize: 15, fontWeight: "800", color: C.text },
  feeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  feeBadgeText: { fontSize: 11, fontWeight: "700" },
  productCard: {
    backgroundColor: C.backgroundCard, borderRadius: 14, padding: 14, gap: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  productCardRejected: { borderWidth: 1.5, borderColor: "#FECACA" },
  productMain: { flexDirection: "row", alignItems: "center", gap: 12 },
  productIcon: {
    width: 46, height: 46, borderRadius: 12, backgroundColor: C.backgroundSecondary,
    alignItems: "center", justifyContent: "center",
  },
  productInfo: { flex: 1, gap: 2 },
  productName: { fontSize: 14, fontWeight: "700", color: C.text },
  productMeta: { fontSize: 12, color: C.textSecondary },
  productStock: { fontSize: 12, color: C.success, fontWeight: "600" },
  productActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusPillText: { fontSize: 11, fontWeight: "700" },
  editBtn: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: C.backgroundSecondary,
    alignItems: "center", justifyContent: "center",
  },
  deleteBtn: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: "#FEE2E2",
    alignItems: "center", justifyContent: "center",
  },
  btnDisabled: { opacity: 0.4 },
  rejectionNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    backgroundColor: "#FEF2F2", borderRadius: 8, padding: 8,
  },
  rejectionNoteText: { flex: 1, fontSize: 12, color: "#DC2626", lineHeight: 16 },
  liveNote: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#F0FDF4", borderRadius: 8, padding: 8,
  },
  liveNoteText: { flex: 1, fontSize: 11, color: "#15803D" },
  empty: { alignItems: "center", paddingTop: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  emptySub: { fontSize: 14, color: C.textSecondary, textAlign: "center" },
  addFirstBtn: {
    backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8,
  },
  addFirstBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
