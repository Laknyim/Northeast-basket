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
  Modal,
  TextInput,
  ScrollView,
  Image,
  KeyboardAvoidingView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import { useTheme } from "@/contexts/theme";

const C = Colors.light;

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  unit: string;
  stock: number;
  category_id: number;
  category_name: string;
  vendor_name: string;
  image_url: string;
  is_approved: boolean;
  is_active: boolean;
  rejection_reason: string | null;
}

type ModalMode = "edit" | "reject" | "add" | null;

export default function AdminProductsScreen() {
  const insets = useSafeAreaInsets();
  const { colors: TC } = useTheme();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<Product | null>(null);

  // Edit fields
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editImageError, setEditImageError] = useState(false);

  // Reject field
  const [rejectReason, setRejectReason] = useState("");

  const { data: products = [], isLoading, refetch } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
    refetchInterval: 15_000,
    staleTime: 5_000,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["/api/admin/products"] });
    qc.invalidateQueries({ queryKey: ["/api/products"] });
    qc.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
  };

  const approveMutation = useMutation({
    mutationFn: ({ id, isApproved }: { id: number; isApproved: boolean }) =>
      apiRequest("PUT", `/api/admin/products/${id}`, { isApproved }),
    onSuccess: invalidate,
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiRequest("PUT", `/api/admin/products/${id}`, data),
    onSuccess: () => { invalidate(); closeModal(); },
    onError: (e: Error) => setEditError(e.message.replace(/^\d+:\s*/, "")),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      apiRequest("PUT", `/api/admin/products/${id}`, { isApproved: false, rejectionReason: reason }),
    onSuccess: () => { invalidate(); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/products/${id}`),
    onSuccess: invalidate,
  });

  const filtered = products.filter((p) => {
    if (filter === "pending") return !p.is_approved && !p.rejection_reason;
    if (filter === "approved") return p.is_approved;
    if (filter === "rejected") return !p.is_approved && !!p.rejection_reason;
    return true;
  });

  function openEdit(p: Product) {
    setSelected(p);
    setEditName(p.name);
    setEditPrice(String(p.price));
    setEditDescription(p.description || "");
    setEditImageUrl(p.image_url || "");
    setEditImageError(false);
    setEditError("");
    setModalMode("edit");
  }

  function openReject(p: Product) {
    setSelected(p);
    setRejectReason(p.rejection_reason || "");
    setModalMode("reject");
  }

  function closeModal() {
    setModalMode(null);
    setSelected(null);
    setAddError("");
    setEditError("");
  }

  function handleSaveEdit() {
    if (!selected) return;
    if (!editName.trim()) { setEditError("Product name is required"); return; }
    setEditError("");
    editMutation.mutate({
      id: selected.id,
      data: {
        name: editName.trim(),
        price: parseFloat(editPrice) || selected.price,
        description: editDescription.trim(),
        imageUrl: editImageUrl.trim(),
      },
    });
  }

  function handleReject() {
    if (!selected) return;
    rejectMutation.mutate({ id: selected.id, reason: rejectReason.trim() });
  }

  function handleDelete(id: number, name: string) {
    if (Platform.OS === "web") {
      if (confirm(`Delete "${name}"?`)) deleteMutation.mutate(id);
    } else {
      Alert.alert("Delete Product", `Delete "${name}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(id) },
      ]);
    }
  }

  // Add product fields (admin upload — auto-approved)
  const [addName, setAddName] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addStock, setAddStock] = useState("0");
  const [addUnit, setAddUnit] = useState("piece");
  const [addCategoryId, setAddCategoryId] = useState<number | null>(null);
  const [addImageUrl, setAddImageUrl] = useState("");
  const [addImageError, setAddImageError] = useState(false);
  const [addImagePicking, setAddImagePicking] = useState(false);
  const [addError, setAddError] = useState("");
  const [editError, setEditError] = useState("");

  const addMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("POST", "/api/admin/products", data),
    onSuccess: () => { invalidate(); closeModal(); },
    onError: (e: Error) => setAddError(e.message.replace(/^\d+:\s*/, "")),
  });

  function openAdd() {
    setAddName(""); setAddPrice(""); setAddDescription(""); setAddStock("0");
    setAddUnit("piece"); setAddCategoryId(null); setAddImageUrl(""); setAddImageError(false);
    setAddError("");
    setModalMode("add");
  }

  function handleSaveAdd() {
    if (!addName.trim()) { setAddError("Product name is required"); return; }
    if (!addPrice || isNaN(parseFloat(addPrice))) { setAddError("A valid price is required"); return; }
    if (!addCategoryId) { setAddError("Please select a category"); return; }
    setAddError("");
    addMutation.mutate({
      name: addName.trim(),
      description: addDescription.trim(),
      price: parseFloat(addPrice) || 0,
      categoryId: addCategoryId,
      stock: parseInt(addStock) || 0,
      unit: addUnit.trim() || "piece",
      imageUrl: addImageUrl.trim(),
    });
  }

  const handlePickAddImage = async () => {
    try {
      setAddImagePicking(true);
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") { Alert.alert("Permission Required", "Please allow photo library access in Settings."); return; }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          const mime = asset.mimeType || "image/jpeg";
          setAddImageUrl(`data:${mime};base64,${asset.base64}`);
          setAddImageError(false);
        } else if (asset.uri) { setAddImageUrl(asset.uri); }
      }
    } catch { Alert.alert("Error", "Could not open gallery."); }
    finally { setAddImagePicking(false); }
  };

  const [editImagePicking, setEditImagePicking] = useState(false);

  const handlePickEditImage = async () => {
    try {
      setEditImagePicking(true);
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Please allow photo library access in Settings.");
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          const mime = asset.mimeType || "image/jpeg";
          setEditImageUrl(`data:${mime};base64,${asset.base64}`);
          setEditImageError(false);
        } else if (asset.uri) {
          setEditImageUrl(asset.uri);
        }
      }
    } catch { Alert.alert("Error", "Could not open gallery."); }
    finally { setEditImagePicking(false); }
  };

  const isDisplayable = (src: string) => {
    if (!src || !src.trim()) return false;
    if (src.startsWith("data:image/")) return true;
    try { new URL(src); return true; } catch { return false; }
  };
  const showImgPreview = isDisplayable(editImageUrl) && !editImageError;

  const pendingCount = products.filter((p) => !p.is_approved && !p.rejection_reason).length;
  const rejectedCount = products.filter((p) => !p.is_approved && !!p.rejection_reason).length;

  function getProductStatus(p: Product) {
    if (p.is_approved) return { label: "Live", bg: "#DCFCE7", color: "#15803D" };
    if (p.rejection_reason) return { label: "Rejected", bg: "#FEE2E2", color: "#DC2626" };
    return { label: "Pending", bg: "#FEF3C7", color: "#92400E" };
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0), backgroundColor: TC.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Products</Text>
          <Text style={styles.subtitle}>{pendingCount} pending · {rejectedCount} rejected</Text>
        </View>
        <Text style={styles.count}>{filtered.length}</Text>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {([
          { key: "pending", label: `Pending (${pendingCount})` },
          { key: "approved", label: `Live (${products.filter((p) => p.is_approved).length})` },
          { key: "rejected", label: `Rejected (${rejectedCount})` },
          { key: "all", label: "All" },
        ] as const).map((f) => (
          <Pressable
            key={f.key}
            style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterTabText, filter === f.key && styles.filterTabTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={C.primary} />}
          renderItem={({ item }) => {
            const status = getProductStatus(item);
            return (
              <View style={styles.productCard}>
                {/* Top Row */}
                <View style={styles.productHeader}>
                  {/* Thumbnail */}
                  <View style={styles.thumb}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.thumbImg} resizeMode="cover" />
                    ) : (
                      <Ionicons name="cube-outline" size={24} color={C.primary} />
                    )}
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.productMeta}>{item.category_name} · {item.vendor_name}</Text>
                    <Text style={styles.productPrice}>₹{item.price}/{item.unit} · Stock: {item.stock}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>

                {/* Rejection reason banner */}
                {item.rejection_reason ? (
                  <View style={styles.rejectionBanner}>
                    <Ionicons name="close-circle-outline" size={14} color="#DC2626" />
                    <Text style={styles.rejectionText} numberOfLines={2}>{item.rejection_reason}</Text>
                  </View>
                ) : null}

                {/* Actions */}
                <View style={styles.actionRow}>
                  {/* Approve / Revoke */}
                  {!item.is_approved ? (
                    <Pressable
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => approveMutation.mutate({ id: item.id, isApproved: true })}
                      disabled={approveMutation.isPending}
                    >
                      <Ionicons name="checkmark-circle-outline" size={15} color="#fff" />
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[styles.actionBtn, styles.revokeBtn]}
                      onPress={() => approveMutation.mutate({ id: item.id, isApproved: false })}
                    >
                      <Ionicons name="pause-circle-outline" size={15} color={C.warning} />
                      <Text style={styles.revokeBtnText}>Revoke</Text>
                    </Pressable>
                  )}

                  {/* Reject */}
                  {!item.is_approved && (
                    <Pressable
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => openReject(item)}
                    >
                      <Ionicons name="close-circle-outline" size={15} color="#DC2626" />
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </Pressable>
                  )}

                  {/* Edit */}
                  <Pressable
                    style={[styles.actionBtn, styles.editBtn]}
                    onPress={() => openEdit(item)}
                  >
                    <Ionicons name="create-outline" size={15} color={C.primary} />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </Pressable>

                  {/* Delete */}
                  <Pressable
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDelete(item.id, item.name)}
                  >
                    <Ionicons name="trash-outline" size={15} color={C.danger} />
                  </Pressable>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={56} color={C.border} />
              <Text style={styles.emptyTitle}>
                {filter === "pending" ? "No pending products" : filter === "approved" ? "No live products" : filter === "rejected" ? "No rejected products" : "No products"}
              </Text>
            </View>
          }
        />
      )}

      {/* FAB: Add Product */}
      <Pressable
        style={({ pressed }) => ({
          position: "absolute", bottom: insets.bottom + (Platform.OS === "web" ? 34 : 20), right: 20,
          width: 56, height: 56, borderRadius: 28, backgroundColor: TC.primary,
          alignItems: "center", justifyContent: "center",
          shadowColor: TC.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
          opacity: pressed ? 0.85 : 1,
        })}
        onPress={openAdd}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      {/* Add Product Modal */}
      <Modal visible={modalMode === "add"} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { paddingBottom: insets.bottom + 24 }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Add Product</Text>
                  <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>Admin upload · Auto-approved ✅</Text>
                </View>
                <Pressable onPress={closeModal}>
                  <Ionicons name="close" size={24} color={C.text} />
                </Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.modalBody}>
                  {!!addError && (
                    <View style={styles.modalErrorBanner}>
                      <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
                      <Text style={styles.modalErrorText}>{addError}</Text>
                    </View>
                  )}
                  {/* Image */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Product Image</Text>
                    {addImageUrl && !addImageError && (
                      <View style={{ borderRadius: 10, overflow: "hidden" }}>
                        <Image
                          source={{ uri: addImageUrl }}
                          style={styles.imgPreview}
                          resizeMode="cover"
                          onError={() => setAddImageError(true)}
                        />
                      </View>
                    )}
                    {Platform.OS === "web" ? (
                      <View style={styles.galleryPickBtn}>
                        <Ionicons name="images-outline" size={17} color={C.primary} />
                        <Text style={styles.galleryPickBtnText}>{addImageUrl ? "Change from Gallery" : "Upload from Gallery"}</Text>
                        {/* @ts-ignore */}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onloadend = () => { setAddImageUrl(reader.result as string); setAddImageError(false); };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </View>
                    ) : (
                      <Pressable style={[styles.galleryPickBtn, addImagePicking && { opacity: 0.7 }]} onPress={handlePickAddImage} disabled={addImagePicking}>
                        {addImagePicking ? <ActivityIndicator color={C.primary} size="small" /> : (
                          <>
                            <Ionicons name="images-outline" size={17} color={C.primary} />
                            <Text style={styles.galleryPickBtnText}>{addImageUrl ? "Change from Gallery" : "Upload from Gallery"}</Text>
                          </>
                        )}
                      </Pressable>
                    )}
                    <Text style={styles.orDivider}>— or paste URL —</Text>
                    <View style={styles.fieldInput}>
                      <Ionicons name="link-outline" size={16} color={C.textSecondary} style={{ marginLeft: 10 }} />
                      <TextInput
                        style={styles.fieldText}
                        value={addImageUrl.startsWith("data:") ? "" : addImageUrl}
                        onChangeText={(t) => { setAddImageUrl(t); setAddImageError(false); }}
                        placeholder="https://example.com/image.jpg"
                        autoCapitalize="none" autoCorrect={false}
                        placeholderTextColor={C.textSecondary}
                      />
                      {addImageUrl.length > 0 && (
                        <Pressable onPress={() => setAddImageUrl("")} style={{ paddingRight: 10 }}>
                          <Ionicons name="close-circle" size={16} color={C.textSecondary} />
                        </Pressable>
                      )}
                    </View>
                  </View>

                  {/* Name */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Product Name *</Text>
                    <View style={styles.fieldInput}>
                      <Ionicons name="cube-outline" size={16} color={C.textSecondary} style={{ marginLeft: 10 }} />
                      <TextInput style={styles.fieldText} value={addName} onChangeText={setAddName} placeholder="Product name" placeholderTextColor={C.textSecondary} />
                    </View>
                  </View>

                  {/* Price */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Price (₹) *</Text>
                    <View style={styles.fieldInput}>
                      <Ionicons name="cash-outline" size={16} color={C.textSecondary} style={{ marginLeft: 10 }} />
                      <TextInput style={styles.fieldText} value={addPrice} onChangeText={setAddPrice} placeholder="0.00" keyboardType="decimal-pad" placeholderTextColor={C.textSecondary} />
                    </View>
                  </View>

                  {/* Category */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Category *</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        {categories.map((cat) => (
                          <Pressable
                            key={cat.id}
                            style={{
                              paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 2,
                              backgroundColor: addCategoryId === cat.id ? C.primary : C.backgroundSecondary,
                              borderColor: addCategoryId === cat.id ? C.primary : C.border,
                            }}
                            onPress={() => setAddCategoryId(cat.id)}
                          >
                            <Text style={{ fontSize: 13, fontWeight: "600", color: addCategoryId === cat.id ? "#fff" : C.text }}>{cat.name}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>
                  </View>

                  {/* Stock */}
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>Stock</Text>
                      <View style={styles.fieldInput}>
                        <Ionicons name="layers-outline" size={16} color={C.textSecondary} style={{ marginLeft: 10 }} />
                        <TextInput style={styles.fieldText} value={addStock} onChangeText={setAddStock} placeholder="0" keyboardType="number-pad" placeholderTextColor={C.textSecondary} />
                      </View>
                    </View>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>Unit</Text>
                      <View style={styles.fieldInput}>
                        <Ionicons name="scale-outline" size={16} color={C.textSecondary} style={{ marginLeft: 10 }} />
                        <TextInput style={styles.fieldText} value={addUnit} onChangeText={setAddUnit} placeholder="piece/kg/litre" placeholderTextColor={C.textSecondary} />
                      </View>
                    </View>
                  </View>

                  {/* Description */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Description</Text>
                    <View style={[styles.fieldInput, { alignItems: "flex-start" }]}>
                      <Ionicons name="document-text-outline" size={16} color={C.textSecondary} style={{ marginLeft: 10, paddingTop: 12 }} />
                      <TextInput style={[styles.fieldText, { height: 80 }]} value={addDescription} onChangeText={setAddDescription} placeholder="Brief description" multiline textAlignVertical="top" placeholderTextColor={C.textSecondary} />
                    </View>
                  </View>
                </View>
              </ScrollView>
              <View style={styles.modalActions}>
                <Pressable style={styles.cancelBtn} onPress={closeModal}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveBtn, (addMutation.isPending || !addName.trim() || !addPrice || !addCategoryId) && { opacity: 0.6 }]}
                  onPress={handleSaveAdd}
                  disabled={addMutation.isPending || !addName.trim() || !addPrice || !addCategoryId}
                >
                  {addMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                      <Text style={styles.saveBtnText}>Add &amp; Publish</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={modalMode === "edit"} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { paddingBottom: insets.bottom + 24 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Product</Text>
                <Pressable onPress={closeModal}>
                  <Ionicons name="close" size={24} color={C.text} />
                </Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.modalBody}>
                  {!!editError && (
                    <View style={styles.modalErrorBanner}>
                      <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
                      <Text style={styles.modalErrorText}>{editError}</Text>
                    </View>
                  )}
                  {/* Image */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Product Image</Text>

                    {showImgPreview && (
                      <View style={{ borderRadius: 10, overflow: "hidden" }}>
                        <Image
                          source={{ uri: editImageUrl.trim() }}
                          style={styles.imgPreview}
                          resizeMode="cover"
                          onError={() => setEditImageError(true)}
                        />
                      </View>
                    )}

                    {Platform.OS === "web" ? (
                      <View style={styles.galleryPickBtn}>
                        <Ionicons name="images-outline" size={17} color={C.primary} />
                        <Text style={styles.galleryPickBtnText}>{editImageUrl ? "Change from Gallery" : "Upload from Gallery"}</Text>
                        {/* @ts-ignore */}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onloadend = () => { setEditImageUrl(reader.result as string); setEditImageError(false); };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </View>
                    ) : (
                      <Pressable
                        style={[styles.galleryPickBtn, editImagePicking && { opacity: 0.7 }]}
                        onPress={handlePickEditImage}
                        disabled={editImagePicking}
                      >
                        {editImagePicking ? (
                          <ActivityIndicator color={C.primary} size="small" />
                        ) : (
                          <>
                            <Ionicons name="images-outline" size={17} color={C.primary} />
                            <Text style={styles.galleryPickBtnText}>
                              {editImageUrl ? "Change from Gallery" : "Upload from Gallery"}
                            </Text>
                          </>
                        )}
                      </Pressable>
                    )}

                    <Text style={styles.orDivider}>— or paste URL —</Text>

                    <View style={styles.fieldInput}>
                      <Ionicons name="link-outline" size={16} color={C.textSecondary} style={{ marginLeft: 10 }} />
                      <TextInput
                        style={styles.fieldText}
                        value={editImageUrl.startsWith("data:") ? "" : editImageUrl}
                        onChangeText={(t) => { setEditImageUrl(t); setEditImageError(false); }}
                        placeholder="https://example.com/image.jpg"
                        autoCapitalize="none"
                        autoCorrect={false}
                        placeholderTextColor={C.textSecondary}
                      />
                      {editImageUrl.length > 0 && (
                        <Pressable onPress={() => setEditImageUrl("")} style={{ paddingRight: 10 }}>
                          <Ionicons name="close-circle" size={16} color={C.textSecondary} />
                        </Pressable>
                      )}
                    </View>
                  </View>

                  {/* Name */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Product Name *</Text>
                    <View style={styles.fieldInput}>
                      <Ionicons name="cube-outline" size={16} color={C.textSecondary} style={{ marginLeft: 10 }} />
                      <TextInput
                        style={styles.fieldText}
                        value={editName}
                        onChangeText={setEditName}
                        placeholder="Product name"
                        placeholderTextColor={C.textSecondary}
                      />
                    </View>
                  </View>

                  {/* Price */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Price (₹)</Text>
                    <View style={styles.fieldInput}>
                      <Ionicons name="cash-outline" size={16} color={C.textSecondary} style={{ marginLeft: 10 }} />
                      <TextInput
                        style={styles.fieldText}
                        value={editPrice}
                        onChangeText={setEditPrice}
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                        placeholderTextColor={C.textSecondary}
                      />
                    </View>
                  </View>

                  {/* Description */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Description</Text>
                    <View style={[styles.fieldInput, { alignItems: "flex-start" }]}>
                      <Ionicons name="document-text-outline" size={16} color={C.textSecondary} style={{ marginLeft: 10, paddingTop: 12 }} />
                      <TextInput
                        style={[styles.fieldText, { height: 80 }]}
                        value={editDescription}
                        onChangeText={setEditDescription}
                        placeholder="Brief description"
                        multiline
                        textAlignVertical="top"
                        placeholderTextColor={C.textSecondary}
                      />
                    </View>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <Pressable style={styles.cancelBtn} onPress={closeModal}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveBtn, editMutation.isPending && { opacity: 0.7 }]}
                  onPress={handleSaveEdit}
                  disabled={editMutation.isPending}
                >
                  {editMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={16} color="#fff" />
                      <Text style={styles.saveBtnText}>Save Changes</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Reject Modal */}
      <Modal visible={modalMode === "reject"} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { paddingBottom: insets.bottom + 24 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Reject Product</Text>
                <Pressable onPress={closeModal}>
                  <Ionicons name="close" size={24} color={C.text} />
                </Pressable>
              </View>
              <View style={styles.modalBody}>
                <Text style={styles.rejectProductName} numberOfLines={1}>{selected?.name}</Text>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Reason for rejection (visible to vendor)</Text>
                  <View style={[styles.fieldInput, { alignItems: "flex-start" }]}>
                    <Ionicons name="chatbubble-outline" size={16} color={C.textSecondary} style={{ marginLeft: 10, paddingTop: 12 }} />
                    <TextInput
                      style={[styles.fieldText, { height: 100 }]}
                      value={rejectReason}
                      onChangeText={setRejectReason}
                      placeholder="e.g. Image is unclear, price too high, missing description..."
                      multiline
                      textAlignVertical="top"
                      placeholderTextColor={C.textSecondary}
                      autoFocus
                    />
                  </View>
                </View>
              </View>
              <View style={styles.modalActions}>
                <Pressable style={styles.cancelBtn} onPress={closeModal}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.rejectSubmitBtn, rejectMutation.isPending && { opacity: 0.7 }]}
                  onPress={handleReject}
                  disabled={rejectMutation.isPending}
                >
                  {rejectMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="close-circle-outline" size={16} color="#fff" />
                      <Text style={styles.saveBtnText}>Reject Product</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "800", color: C.text },
  subtitle: { fontSize: 12, color: C.textSecondary, marginTop: 1 },
  count: { fontSize: 16, fontWeight: "700", color: C.textSecondary },
  filterRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  filterTab: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
    backgroundColor: C.backgroundCard, borderWidth: 1.5, borderColor: C.border,
    alignItems: "center",
  },
  filterTabActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterTabText: { fontSize: 12, fontWeight: "600", color: C.textSecondary },
  filterTabTextActive: { color: "#fff" },
  list: { paddingHorizontal: 16, gap: 12, paddingBottom: 40 },
  productCard: {
    backgroundColor: C.backgroundCard, borderRadius: 14, padding: 14, gap: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  productHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  thumb: {
    width: 52, height: 52, borderRadius: 10, backgroundColor: C.backgroundSecondary,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  thumbImg: { width: 52, height: 52 },
  productInfo: { flex: 1, gap: 2 },
  productName: { fontSize: 14, fontWeight: "700", color: C.text },
  productMeta: { fontSize: 11, color: C.textSecondary },
  productPrice: { fontSize: 11, color: C.primary, fontWeight: "600" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, alignSelf: "flex-start" },
  statusText: { fontSize: 11, fontWeight: "700" },
  rejectionBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    backgroundColor: "#FEE2E2", borderRadius: 8, padding: 8,
  },
  rejectionText: { flex: 1, fontSize: 12, color: "#DC2626", lineHeight: 16 },
  actionRow: { flexDirection: "row", gap: 6 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
    paddingVertical: 8, borderRadius: 8,
  },
  approveBtn: { flex: 1, backgroundColor: C.success },
  approveBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  revokeBtn: { flex: 1, backgroundColor: "#FEF3C7" },
  revokeBtnText: { color: C.warning, fontSize: 12, fontWeight: "700" },
  rejectBtn: { flex: 1, backgroundColor: "#FEE2E2" },
  rejectBtnText: { color: "#DC2626", fontSize: 12, fontWeight: "700" },
  editBtn: { flex: 1, backgroundColor: C.backgroundSecondary },
  editBtnText: { color: C.primary, fontSize: 12, fontWeight: "700" },
  deleteBtn: { width: 36, backgroundColor: "#FEE2E2" },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: C.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContainer: {
    backgroundColor: C.backgroundCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 16, maxHeight: "90%",
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: C.text },
  modalBody: { gap: 14 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: C.text },
  fieldInput: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: C.border, borderRadius: 12,
    backgroundColor: C.backgroundSecondary,
  },
  fieldText: { flex: 1, fontSize: 14, color: C.text, paddingHorizontal: 10, paddingVertical: 11 },
  imgPreview: { width: "100%", height: 140, borderRadius: 10, marginTop: 4 },
  galleryPickBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1.5, borderColor: C.primary, borderRadius: 10,
    paddingVertical: 11, backgroundColor: "#EFF6FF", marginTop: 6,
    position: "relative", overflow: "hidden",
  },
  galleryPickBtnText: { color: C.primary, fontWeight: "700", fontSize: 14 },
  orDivider: { textAlign: "center", fontSize: 12, color: C.textSecondary, marginTop: 6 },
  modalErrorBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FEE2E2", borderRadius: 10, padding: 12, marginBottom: 4,
  },
  modalErrorText: { flex: 1, fontSize: 13, color: "#DC2626", fontWeight: "500" },
  rejectProductName: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 4 },
  cancelBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingVertical: 12,
  },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: C.textSecondary },
  saveBtn: {
    flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: C.primary, borderRadius: 12, paddingVertical: 12,
  },
  rejectSubmitBtn: {
    flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: "#DC2626", borderRadius: 12, paddingVertical: 12,
  },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
