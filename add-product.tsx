import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
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
  stock: number;
  unit: string;
  category_id: number;
  image_url: string;
  is_approved: boolean;
  rejection_reason: string | null;
}

const UNITS = ["piece", "kg", "g", "500g", "250g", "100g", "ltr", "ml", "dozen", "bunch", "bottle", "pack", "bag"];

function isDisplayable(src: string): boolean {
  if (!src || src.trim().length === 0) return false;
  if (src.startsWith("data:image/")) return true;
  try { new URL(src); return true; } catch { return false; }
}

export default function AddProductScreen() {
  const insets = useSafeAreaInsets();
  const { colors: TC } = useTheme();
  const params = useLocalSearchParams<{ productId?: string }>();
  const qc = useQueryClient();
  const isEdit = !!params.productId;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [unit, setUnit] = useState("piece");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageError, setImageError] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState("");

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: existingProducts = [] } = useQuery<Product[]>({
    queryKey: ["/api/vendor/products"],
    enabled: isEdit,
  });

  const editingProduct = isEdit && params.productId
    ? existingProducts.find((pr) => String(pr.id) === params.productId) ?? null
    : null;

  const isApprovedProduct = editingProduct?.is_approved ?? false;

  useEffect(() => {
    if (isEdit && params.productId && existingProducts.length > 0) {
      const p = existingProducts.find((pr) => String(pr.id) === params.productId);
      if (p) {
        setName(p.name);
        setDescription(p.description || "");
        setPrice(String(p.price));
        setStock(String(p.stock));
        setUnit(p.unit);
        setCategoryId(p.category_id);
        const img = p.image_url || "";
        setImageUrl(img);
        if (img && !img.startsWith("data:")) setShowUrlInput(true);
      }
    }
  }, [isEdit, params.productId, existingProducts]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        categoryId,
        stock: parseInt(stock) || 0,
        unit,
        imageUrl: imageUrl.trim(),
      };
      if (isEdit) {
        return apiRequest("PUT", `/api/vendor/products/${params.productId}`, data);
      }
      return apiRequest("POST", "/api/vendor/products", data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/vendor/products"] });
      qc.invalidateQueries({ queryKey: ["/api/products"] });
      router.back();
    },
    onError: (e: Error) => {
      setError(e.message.replace(/^\d+:\s*/, ""));
    },
  });

  const handleSave = () => {
    if (!name.trim()) { setError("Product name is required"); return; }
    if (!price || isNaN(parseFloat(price))) { setError("Valid price is required"); return; }
    if (!categoryId) { setError("Please select a category"); return; }
    setError("");
    saveMutation.mutate();
  };

  const handlePickImage = async () => {
    try {
      setPicking(true);

      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Please allow access to your photo library in Settings to upload images.",
          );
          setPicking(false);
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
          setImageUrl(`data:${mime};base64,${asset.base64}`);
          setImageError(false);
          setShowUrlInput(false);
        } else if (asset.uri) {
          setImageUrl(asset.uri);
          setImageError(false);
        }
      }
    } catch (e) {
      Alert.alert("Error", "Could not open gallery. Please try again.");
    } finally {
      setPicking(false);
    }
  };

  const clearImage = () => {
    setImageUrl("");
    setImageError(false);
  };

  const hasImage = isDisplayable(imageUrl);
  const isBase64 = imageUrl.startsWith("data:image/");

  if (isApprovedProduct) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center", padding: 32, backgroundColor: TC.background }]}>
        <View style={styles.lockedCard}>
          <Ionicons name="lock-closed" size={40} color={C.success} />
          <Text style={styles.lockedTitle}>Product is Live</Text>
          <Text style={styles.lockedSub}>
            This product has been approved and is visible to customers. Contact admin to make changes.
          </Text>
          <Pressable style={styles.lockedBack} onPress={() => router.back()}>
            <Text style={styles.lockedBackText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: TC.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16), paddingBottom: insets.bottom + 40 },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.title}>{isEdit ? "Edit Product" : "Add Product"}</Text>
        <View style={{ width: 40 }} />
      </View>

      {!isEdit && (
        <View style={styles.noteBanner}>
          <Ionicons name="information-circle-outline" size={16} color="#1D4ED8" />
          <Text style={styles.noteText}>Your product will go live after admin approval.</Text>
        </View>
      )}

      {isEdit && editingProduct?.rejection_reason && (
        <View style={styles.rejectedBanner}>
          <Ionicons name="alert-circle" size={16} color="#DC2626" />
          <Text style={styles.rejectedBannerText}>
            Admin: {editingProduct.rejection_reason}{"\n"}Update and resubmit.
          </Text>
        </View>
      )}

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={16} color={C.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* ─── Product Image Card ─── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Product Image</Text>

        {/* Image preview area */}
        {hasImage ? (
          <View style={styles.previewBox}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.previewImg}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
            {imageError ? (
              <View style={styles.previewOverlayErr}>
                <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
                <Text style={styles.previewErrText}>Could not load image</Text>
              </View>
            ) : (
              <View style={styles.previewOverlayOk}>
                <Ionicons name={isBase64 ? "phone-portrait-outline" : "link-outline"} size={13} color="#15803D" />
                <Text style={styles.previewOkText}>{isBase64 ? "Uploaded from gallery" : "Image from URL"}</Text>
              </View>
            )}
            {/* Clear button */}
            <Pressable style={styles.clearBtn} onPress={clearImage}>
              <Ionicons name="close-circle" size={26} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <View style={styles.uploadPlaceholder}>
            <Ionicons name="image-outline" size={44} color={C.border} />
            <Text style={styles.uploadPlaceholderText}>No image selected</Text>
          </View>
        )}

        {/* Gallery button */}
        <Pressable
          style={[styles.galleryBtn, picking && { opacity: 0.7 }]}
          onPress={handlePickImage}
          disabled={picking}
        >
          {picking ? (
            <ActivityIndicator color={C.primary} size="small" />
          ) : (
            <>
              <Ionicons name="images-outline" size={20} color={C.primary} />
              <Text style={styles.galleryBtnText}>
                {hasImage ? "Change Image from Gallery" : "Upload from Gallery"}
              </Text>
            </>
          )}
        </Pressable>

        {/* URL input toggle */}
        <Pressable
          style={styles.urlToggle}
          onPress={() => setShowUrlInput((v) => !v)}
        >
          <Ionicons name={showUrlInput ? "chevron-up" : "link-outline"} size={14} color={C.textSecondary} />
          <Text style={styles.urlToggleText}>
            {showUrlInput ? "Hide URL input" : "Or use image URL instead"}
          </Text>
        </Pressable>

        {showUrlInput && (
          <View style={styles.inputGroup}>
            <View style={styles.inputWrap}>
              <Ionicons name="link-outline" size={18} color={C.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={isBase64 ? "" : imageUrl}
                onChangeText={(t) => { setImageUrl(t); setImageError(false); }}
                placeholder="https://example.com/image.jpg"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholderTextColor={C.textSecondary}
              />
              {imageUrl.length > 0 && !isBase64 && (
                <Pressable onPress={clearImage} style={styles.clearIcon}>
                  <Ionicons name="close-circle" size={18} color={C.textSecondary} />
                </Pressable>
              )}
            </View>
            <Text style={styles.hint}>Paste a direct image link (jpg, png, webp)</Text>
          </View>
        )}
      </View>

      {/* ─── Product Info ─── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Product Information</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Product Name *</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="cube-outline" size={18} color={C.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Fresh Spinach"
              placeholderTextColor={C.textSecondary}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <View style={[styles.inputWrap, { alignItems: "flex-start" }]}>
            <Ionicons name="document-text-outline" size={18} color={C.textSecondary} style={[styles.inputIcon, { paddingTop: 13 }]} />
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Brief description of the product"
              multiline
              textAlignVertical="top"
              placeholderTextColor={C.textSecondary}
            />
          </View>
        </View>

        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Price (₹) *</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="cash-outline" size={18} color={C.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor={C.textSecondary}
              />
            </View>
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Stock Qty</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="layers-outline" size={18} color={C.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={stock}
                onChangeText={setStock}
                placeholder="0"
                keyboardType="number-pad"
                placeholderTextColor={C.textSecondary}
              />
            </View>
          </View>
        </View>
      </View>

      {/* ─── Unit ─── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Unit of Measurement</Text>
        <View style={styles.chipGrid}>
          {UNITS.map((u) => (
            <Pressable
              key={u}
              style={[styles.chip, unit === u && styles.chipActive]}
              onPress={() => setUnit(u)}
            >
              <Text style={[styles.chipText, unit === u && styles.chipTextActive]}>{u}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ─── Category ─── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Category *</Text>
        <View style={styles.chipGrid}>
          {categories.map((cat) => (
            <Pressable
              key={cat.id}
              style={[styles.chip, styles.catChip, categoryId === cat.id && styles.chipActive]}
              onPress={() => setCategoryId(cat.id)}
            >
              <Text style={[styles.chipText, categoryId === cat.id && styles.chipTextActive]}>{cat.name}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ─── Action Buttons ─── */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        {!isEdit && (
          <Pressable
            style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.8 }]}
            onPress={() => {
              setName("");
              setDescription("");
              setPrice("");
              setStock("");
              setUnit("piece");
              setCategoryId(null);
              setImageUrl("");
              setImageError(false);
              setShowUrlInput(false);
              setError("");
            }}
            disabled={saveMutation.isPending}
          >
            <Ionicons name="close-circle-outline" size={20} color={C.textSecondary} />
            <Text style={styles.cancelBtnText}>Clear</Text>
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [styles.saveBtn, { flex: 1 }, saveMutation.isPending && { opacity: 0.7 }, pressed && { opacity: 0.85 }]}
          onPress={handleSave}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name={isEdit ? "save-outline" : "add-circle-outline"} size={20} color="#fff" />
              <Text style={styles.saveBtnText}>{isEdit ? "Save Changes" : "Submit for Approval"}</Text>
            </>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  content: { paddingHorizontal: 16, gap: 16 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "800", color: C.text },
  noteBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#DBEAFE", borderRadius: 10, padding: 12,
  },
  noteText: { flex: 1, fontSize: 13, color: "#1D4ED8", lineHeight: 18 },
  rejectedBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#FEE2E2", borderRadius: 10, padding: 12,
  },
  rejectedBannerText: { flex: 1, fontSize: 13, color: "#DC2626", lineHeight: 18 },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FEE2E2", borderRadius: 10, padding: 12,
  },
  errorText: { flex: 1, color: C.danger, fontSize: 13 },
  card: {
    backgroundColor: C.backgroundCard, borderRadius: 16, padding: 16, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: C.text },
  uploadPlaceholder: {
    height: 140, borderRadius: 12, borderWidth: 1.5, borderColor: C.border,
    borderStyle: "dashed", backgroundColor: C.backgroundSecondary,
    alignItems: "center", justifyContent: "center", gap: 8,
  },
  uploadPlaceholderText: { fontSize: 13, color: C.textSecondary },
  previewBox: { borderRadius: 12, overflow: "hidden", position: "relative" },
  previewImg: { width: "100%", height: 180 },
  previewOverlayOk: {
    flexDirection: "row", alignItems: "center", gap: 6,
    padding: 8, backgroundColor: "#DCFCE7",
  },
  previewOkText: { fontSize: 12, color: "#15803D", fontWeight: "600" },
  previewOverlayErr: {
    flexDirection: "row", alignItems: "center", gap: 6,
    padding: 8, backgroundColor: "#FEE2E2",
  },
  previewErrText: { fontSize: 12, color: "#DC2626" },
  clearBtn: {
    position: "absolute", top: 8, right: 8,
    backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 14,
  },
  galleryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    borderWidth: 1.5, borderColor: C.primary, borderRadius: 12,
    paddingVertical: 13, backgroundColor: "#EFF6FF",
  },
  galleryBtnText: { color: C.primary, fontWeight: "700", fontSize: 15 },
  urlToggle: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "center",
  },
  urlToggleText: { fontSize: 13, color: C.textSecondary, fontWeight: "500" },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: C.text },
  hint: { fontSize: 11, color: C.textSecondary },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: C.border, borderRadius: 12,
    backgroundColor: C.backgroundSecondary,
  },
  inputIcon: { paddingLeft: 12 },
  clearIcon: { paddingRight: 12 },
  input: { flex: 1, fontSize: 14, color: C.text, paddingHorizontal: 10, paddingVertical: 12 },
  rowInputs: { flexDirection: "row", gap: 12 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.backgroundSecondary,
  },
  catChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 13, color: C.textSecondary, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  saveBtn: {
    backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cancelBtn: {
    borderRadius: 14, paddingVertical: 15, paddingHorizontal: 18,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.backgroundSecondary,
  },
  cancelBtnText: { color: C.textSecondary, fontSize: 15, fontWeight: "600" },
  lockedCard: {
    backgroundColor: C.backgroundCard, borderRadius: 20, padding: 28, alignItems: "center", gap: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 4,
    maxWidth: 340,
  },
  lockedTitle: { fontSize: 18, fontWeight: "800", color: C.text, textAlign: "center" },
  lockedSub: { fontSize: 14, color: C.textSecondary, textAlign: "center", lineHeight: 20 },
  lockedBack: {
    backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 11,
  },
  lockedBackText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
