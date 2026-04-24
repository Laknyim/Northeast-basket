import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import { useTheme } from "@/contexts/theme";

const C = Colors.light;

interface FeeRecord {
  id: number;
  vendor_id: number;
  vendor_name: string;
  shop_name: string;
  fee_type: string;
  amount: number;
  fee_date: string;
  paid: boolean;
  notes: string;
}

interface Vendor {
  id: number;
  name: string;
  shop_name: string;
}

export default function AdminFeesScreen() {
  const insets = useSafeAreaInsets();
  const { colors: TC } = useTheme();
  const qc = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState<"all" | "paid" | "pending">("pending");

  const [newVendorId, setNewVendorId] = useState("");
  const [newFeeType, setNewFeeType] = useState<"platform" | "registration">("platform");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newNotes, setNewNotes] = useState("");

  const { data: fees = [], isLoading, refetch } = useQuery<FeeRecord[]>({
    queryKey: ["/api/admin/fees"],
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/admin/vendors"],
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, paid }: { id: number; paid: boolean }) =>
      apiRequest("PUT", `/api/admin/fees/${id}`, { paid }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/fees"] }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/admin/fees", {
        vendorId: parseInt(newVendorId),
        feeType: newFeeType,
        amount: newFeeType === "platform" ? 100 : 500,
        feeDate: newDate,
        notes: newNotes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/fees"] });
      setShowAddModal(false);
      setNewVendorId("");
      setNewNotes("");
    },
  });

  const filtered = fees.filter((f) => {
    if (filter === "paid") return f.paid;
    if (filter === "pending") return !f.paid;
    return true;
  });

  const totalCollected = fees.filter((f) => f.paid).reduce((s, f) => s + Number(f.amount), 0);
  const totalPending = fees.filter((f) => !f.paid).reduce((s, f) => s + Number(f.amount), 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0), backgroundColor: TC.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.title}>Fee Tracking</Text>
        <Pressable style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: "#DCFCE7" }]}>
          <Text style={styles.summaryLabel}>Collected</Text>
          <Text style={[styles.summaryValue, { color: "#15803D" }]}>₹{totalCollected}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: "#FEF3C7" }]}>
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={[styles.summaryValue, { color: "#92400E" }]}>₹{totalPending}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: C.backgroundSecondary }]}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={[styles.summaryValue, { color: C.primary }]}>₹{totalCollected + totalPending}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={16} color="#1D4ED8" />
        <Text style={styles.infoText}>
          Platform fee: ₹100/sales day (Mon, Wed, Fri) • Registration fee: ₹500/year
        </Text>
      </View>

      {/* Filter */}
      <View style={styles.filterRow}>
        {(["pending", "paid", "all"] as const).map((f) => (
          <Pressable
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={C.primary} />}
          renderItem={({ item }) => (
            <View style={styles.feeCard}>
              <View style={styles.feeTop}>
                <View style={styles.feeInfo}>
                  <Text style={styles.vendorName}>{item.shop_name || item.vendor_name}</Text>
                  <Text style={styles.feeMeta}>
                    {item.fee_type === "platform" ? "Platform Fee" : "Registration Fee"} •{" "}
                    {new Date(item.fee_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </Text>
                  {item.notes ? <Text style={styles.feeNotes}>{item.notes}</Text> : null}
                </View>
                <View style={styles.feeRight}>
                  <Text style={styles.feeAmount}>₹{item.amount}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: item.paid ? "#DCFCE7" : "#FEF3C7" }]}>
                    <Text style={[styles.statusText, { color: item.paid ? "#15803D" : "#92400E" }]}>
                      {item.paid ? "Paid" : "Pending"}
                    </Text>
                  </View>
                </View>
              </View>

              <Pressable
                style={[styles.toggleBtn, { backgroundColor: item.paid ? "#FEF3C7" : "#DCFCE7" }]}
                onPress={() => toggleMutation.mutate({ id: item.id, paid: !item.paid })}
              >
                <Ionicons name={item.paid ? "close-circle-outline" : "checkmark-circle-outline"} size={16} color={item.paid ? "#92400E" : "#15803D"} />
                <Text style={[styles.toggleBtnText, { color: item.paid ? "#92400E" : "#15803D" }]}>
                  {item.paid ? "Mark as Unpaid" : "Mark as Paid"}
                </Text>
              </Pressable>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cash-outline" size={56} color={C.border} />
              <Text style={styles.emptyTitle}>No fee records</Text>
            </View>
          }
        />
      )}

      {/* Add Fee Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Fee Record</Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={C.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalContent}>
                {/* Fee Type */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Fee Type</Text>
                  <View style={styles.typeRow}>
                    {(["platform", "registration"] as const).map((t) => (
                      <Pressable
                        key={t}
                        style={[styles.typeChip, newFeeType === t && styles.typeChipActive]}
                        onPress={() => setNewFeeType(t)}
                      >
                        <Text style={[styles.typeChipText, newFeeType === t && styles.typeChipTextActive]}>
                          {t === "platform" ? "Platform (₹100)" : "Registration (₹500)"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Vendor */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Vendor</Text>
                  <View style={styles.vendorList}>
                    {vendors.map((v) => (
                      <Pressable
                        key={v.id}
                        style={[styles.vendorChip, newVendorId === String(v.id) && styles.vendorChipActive]}
                        onPress={() => setNewVendorId(String(v.id))}
                      >
                        <Text style={[styles.vendorChipText, newVendorId === String(v.id) && styles.vendorChipTextActive]}>
                          {v.shop_name || v.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Date */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newDate}
                    onChangeText={setNewDate}
                    placeholder="2026-02-28"
                    placeholderTextColor={C.textSecondary}
                  />
                </View>

                {/* Notes */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Notes (optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newNotes}
                    onChangeText={setNewNotes}
                    placeholder="e.g. Sales day fee - Monday"
                    placeholderTextColor={C.textSecondary}
                  />
                </View>

                <Pressable
                  style={[styles.createBtn, (!newVendorId || createMutation.isPending) && { opacity: 0.6 }]}
                  onPress={() => createMutation.mutate()}
                  disabled={!newVendorId || createMutation.isPending}
                >
                  <Text style={styles.createBtnText}>Create Fee Record</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 20, fontWeight: "800", color: C.text },
  addBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary,
    alignItems: "center", justifyContent: "center",
  },
  summaryRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: "center", gap: 4 },
  summaryLabel: { fontSize: 12, color: C.textSecondary, fontWeight: "600" },
  summaryValue: { fontSize: 18, fontWeight: "800" },
  infoBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#DBEAFE", marginHorizontal: 16, borderRadius: 10, padding: 12, marginBottom: 12,
  },
  infoText: { flex: 1, fontSize: 12, color: "#1D4ED8", lineHeight: 18 },
  filterRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  filterTab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: C.backgroundCard, borderWidth: 1.5, borderColor: C.border,
  },
  filterTabActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterTabText: { fontSize: 13, fontWeight: "600", color: C.textSecondary },
  filterTabTextActive: { color: "#fff" },
  list: { paddingHorizontal: 16, gap: 12, paddingBottom: 40 },
  feeCard: {
    backgroundColor: C.backgroundCard, borderRadius: 14, padding: 14, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  feeTop: { flexDirection: "row", gap: 12 },
  feeInfo: { flex: 1, gap: 2 },
  vendorName: { fontSize: 14, fontWeight: "700", color: C.text },
  feeMeta: { fontSize: 12, color: C.textSecondary },
  feeNotes: { fontSize: 12, color: C.textSecondary, fontStyle: "italic" },
  feeRight: { alignItems: "flex-end", gap: 6 },
  feeAmount: { fontSize: 18, fontWeight: "800", color: C.primary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: "700" },
  toggleBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 10, borderRadius: 10,
  },
  toggleBtnText: { fontSize: 13, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: C.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContainer: {
    backgroundColor: C.backgroundCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 20, fontWeight: "800", color: C.text },
  modalContent: { gap: 16 },
  inputGroup: { gap: 8 },
  label: { fontSize: 13, fontWeight: "700", color: C.text },
  typeRow: { flexDirection: "row", gap: 8 },
  typeChip: {
    flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: C.border,
    alignItems: "center", backgroundColor: C.backgroundSecondary,
  },
  typeChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  typeChipText: { fontSize: 13, fontWeight: "600", color: C.textSecondary },
  typeChipTextActive: { color: "#fff" },
  vendorList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  vendorChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.backgroundSecondary,
  },
  vendorChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  vendorChipText: { fontSize: 13, color: C.textSecondary, fontWeight: "600" },
  vendorChipTextActive: { color: "#fff" },
  textInput: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: C.text,
    backgroundColor: C.backgroundSecondary,
  },
  createBtn: {
    backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14,
    alignItems: "center",
  },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
