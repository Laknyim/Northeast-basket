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
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import { useTheme } from "@/contexts/theme";

const C = Colors.light;

interface Vendor {
  id: number;
  name: string;
  email: string;
  phone: string;
  shop_name: string;
  product_type: string;
  slot_number: number | null;
  is_approved: boolean;
  registration_year: number;
  registration_paid: boolean;
  created_at: string;
}

export default function AdminVendorsScreen() {
  const insets = useSafeAreaInsets();
  const { colors: TC } = useTheme();
  const qc = useQueryClient();
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [slotInput, setSlotInput] = useState("");

  const { data: vendors = [], isLoading, refetch } = useQuery<Vendor[]>({
    queryKey: ["/api/admin/vendors"],
    refetchInterval: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; isApproved?: boolean; slotNumber?: number; registrationPaid?: boolean }) =>
      apiRequest("PUT", `/api/admin/vendors/${data.id}`, {
        isApproved: data.isApproved,
        slotNumber: data.slotNumber,
        registrationPaid: data.registrationPaid,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/vendors"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
      setSelectedVendor(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/vendors/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/vendors"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
      setSelectedVendor(null);
    },
  });

  const handleApprove = (vendor: Vendor) => {
    const slot = parseInt(slotInput) || (vendors.length + 1);
    updateMutation.mutate({ id: vendor.id, isApproved: true, slotNumber: slot });
  };

  const handleDelete = (vendor: Vendor) => {
    const doDelete = () => deleteMutation.mutate(vendor.id);
    const msg = `Delete vendor "${vendor.name}" (${vendor.shop_name})? This will remove their account and all data. This cannot be undone.`;
    if (Platform.OS === "web") {
      if (confirm(msg)) doDelete();
    } else {
      Alert.alert("Delete Vendor", msg, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0), backgroundColor: TC.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.title}>Vendors</Text>
        <Text style={styles.count}>{vendors.length}</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={vendors}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={C.primary} />}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.vendorCard, pressed && { opacity: 0.9 }]}
              onPress={() => { setSelectedVendor(item); setSlotInput(String(item.slot_number || "")); }}
            >
              <View style={styles.vendorTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name?.charAt(0).toUpperCase() || "V"}</Text>
                </View>
                <View style={styles.vendorInfo}>
                  <Text style={styles.vendorName}>{item.name}</Text>
                  <Text style={styles.shopName}>{item.shop_name || "No shop name"}</Text>
                  <Text style={styles.vendorEmail}>{item.email}</Text>
                  {item.product_type && <Text style={styles.vendorMeta}>{item.product_type}</Text>}
                </View>
                <View style={styles.vendorRight}>
                  <View style={[styles.statusBadge, { backgroundColor: item.is_approved ? "#DCFCE7" : "#FEF3C7" }]}>
                    <Text style={[styles.statusText, { color: item.is_approved ? "#15803D" : "#92400E" }]}>
                      {item.is_approved ? "Approved" : "Pending"}
                    </Text>
                  </View>
                  {item.slot_number && (
                    <Text style={styles.slotText}>Slot #{item.slot_number}</Text>
                  )}
                </View>
              </View>

              <View style={styles.vendorFooter}>
                <View style={styles.footerItem}>
                  <Ionicons name="calendar-outline" size={12} color={C.textSecondary} />
                  <Text style={styles.footerText}>{item.registration_year || "—"}</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <View style={[styles.regFeeBadge, { backgroundColor: item.registration_paid ? "#DCFCE7" : "#FEE2E2" }]}>
                    <Text style={[styles.regFeeText, { color: item.registration_paid ? "#15803D" : "#DC2626" }]}>
                      Reg Fee: {item.registration_paid ? "Paid" : "Unpaid"}
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={56} color={C.border} />
              <Text style={styles.emptyTitle}>No vendors yet</Text>
            </View>
          }
        />
      )}

      {/* Vendor Detail Modal */}
      <Modal
        visible={!!selectedVendor}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedVendor(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedVendor?.shop_name || selectedVendor?.name}</Text>
              <Pressable onPress={() => setSelectedVendor(null)}>
                <Ionicons name="close" size={24} color={C.text} />
              </Pressable>
            </View>

            {selectedVendor && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalContent}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Name</Text>
                    <Text style={styles.detailValue}>{selectedVendor.name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{selectedVendor.email}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Phone</Text>
                    <Text style={styles.detailValue}>{selectedVendor.phone || "—"}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Product Type</Text>
                    <Text style={styles.detailValue}>{selectedVendor.product_type || "—"}</Text>
                  </View>

                  {/* Slot Assignment */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Assign Slot Number</Text>
                    <View style={styles.slotInputRow}>
                      <TextInput
                        style={styles.slotInput}
                        value={slotInput}
                        onChangeText={setSlotInput}
                        placeholder="e.g. 3"
                        keyboardType="number-pad"
                        placeholderTextColor={C.textSecondary}
                      />
                      <Pressable
                        style={styles.slotSaveBtn}
                        onPress={() => updateMutation.mutate({ id: selectedVendor.id, slotNumber: parseInt(slotInput) || 1 })}
                      >
                        <Text style={styles.slotSaveBtnText}>Save</Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionGrid}>
                    {!selectedVendor.is_approved ? (
                      <Pressable
                        style={[styles.actionBtn, styles.approveBtn]}
                        onPress={() => handleApprove(selectedVendor)}
                        disabled={updateMutation.isPending}
                      >
                        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                        <Text style={styles.approveBtnText}>Approve Vendor</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        style={[styles.actionBtn, styles.revokeBtn]}
                        onPress={() => updateMutation.mutate({ id: selectedVendor.id, isApproved: false })}
                        disabled={updateMutation.isPending}
                      >
                        <Ionicons name="close-circle-outline" size={18} color="#D97706" />
                        <Text style={styles.revokeBtnText}>Revoke Approval</Text>
                      </Pressable>
                    )}

                    <Pressable
                      style={[styles.actionBtn, selectedVendor.registration_paid ? styles.revokeBtn : styles.approveBtn]}
                      onPress={() => updateMutation.mutate({ id: selectedVendor.id, registrationPaid: !selectedVendor.registration_paid })}
                      disabled={updateMutation.isPending}
                    >
                      <Ionicons name={selectedVendor.registration_paid ? "close-circle-outline" : "cash-outline"} size={18} color={selectedVendor.registration_paid ? "#D97706" : "#fff"} />
                      <Text style={selectedVendor.registration_paid ? styles.revokeBtnText : styles.approveBtnText}>
                        {selectedVendor.registration_paid ? "Mark Fee Unpaid" : "Mark Fee Paid (₹500)"}
                      </Text>
                    </Pressable>

                    {/* Delete Vendor */}
                    <Pressable
                      style={[styles.actionBtn, styles.deleteBtn]}
                      onPress={() => handleDelete(selectedVendor)}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <ActivityIndicator color="#DC2626" size="small" />
                      ) : (
                        <>
                          <Ionicons name="trash-outline" size={18} color="#DC2626" />
                          <Text style={styles.deleteBtnText}>Delete Vendor</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            )}
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
  count: { fontSize: 16, fontWeight: "700", color: C.textSecondary },
  list: { paddingHorizontal: 16, gap: 12, paddingBottom: 40 },
  vendorCard: {
    backgroundColor: C.backgroundCard, borderRadius: 14, padding: 14, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  vendorTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  avatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: C.primary,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "800", color: "#fff" },
  vendorInfo: { flex: 1, gap: 2 },
  vendorName: { fontSize: 15, fontWeight: "700", color: C.text },
  shopName: { fontSize: 13, color: C.primary, fontWeight: "600" },
  vendorEmail: { fontSize: 12, color: C.textSecondary },
  vendorMeta: { fontSize: 12, color: C.textSecondary },
  vendorRight: { alignItems: "flex-end", gap: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: "700" },
  slotText: { fontSize: 12, color: C.textSecondary, fontWeight: "600" },
  vendorFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerText: { fontSize: 12, color: C.textSecondary },
  regFeeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  regFeeText: { fontSize: 11, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: C.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContainer: {
    backgroundColor: C.backgroundCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 20, fontWeight: "800", color: C.text },
  modalContent: { gap: 16 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  detailLabel: { fontSize: 13, color: C.textSecondary, fontWeight: "600" },
  detailValue: { fontSize: 14, color: C.text, fontWeight: "600", flex: 1, textAlign: "right" },
  detailSection: { gap: 8 },
  detailSectionTitle: { fontSize: 13, fontWeight: "700", color: C.textSecondary },
  slotInputRow: { flexDirection: "row", gap: 8 },
  slotInput: {
    flex: 1, borderWidth: 1.5, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: C.text,
    backgroundColor: C.backgroundSecondary,
  },
  slotSaveBtn: {
    backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 20, justifyContent: "center",
  },
  slotSaveBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  actionGrid: { gap: 10 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 13, borderRadius: 12,
  },
  approveBtn: { backgroundColor: C.success },
  approveBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  revokeBtn: { backgroundColor: "#FEF3C7" },
  revokeBtnText: { color: "#D97706", fontSize: 14, fontWeight: "700" },
  deleteBtn: { backgroundColor: "#FEE2E2", borderWidth: 1.5, borderColor: "#DC2626" },
  deleteBtnText: { color: "#DC2626", fontSize: 14, fontWeight: "700" },
});
