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
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const { colors: C, isDark } = useTheme();
  const [role, setRole] = useState<"customer" | "vendor">("customer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const [productType, setProductType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill all required fields");
      return;
    }
    if (role === "vendor" && !shopName.trim()) {
      setError("Shop name is required for vendors");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), password, role, shopName: shopName.trim(), productType: productType.trim() });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Registration failed";
      setError(msg.replace(/^\d+:\s*/, ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.background }}
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20),
        paddingBottom: insets.bottom + 34,
        gap: 20,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 40, height: 40, alignItems: "center", justifyContent: "center",
            backgroundColor: C.backgroundCard, borderRadius: 12,
            borderWidth: isDark ? 1 : 0, borderColor: C.border,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: "700", color: C.text }}>Create Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        {(["customer", "vendor"] as const).map((r) => (
          <Pressable
            key={r}
            style={{
              flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
              gap: 8, paddingVertical: 13, borderRadius: 14,
              borderWidth: 1.5,
              borderColor: role === r ? C.primary : C.border,
              backgroundColor: role === r ? C.primary : C.backgroundCard,
            }}
            onPress={() => setRole(r)}
          >
            <Ionicons name={r === "customer" ? "person-outline" : "storefront-outline"} size={17} color={role === r ? "#fff" : C.textSecondary} />
            <Text style={{ fontSize: 14, fontWeight: "600", color: role === r ? "#fff" : C.textSecondary }}>
              {r === "customer" ? "Customer" : "Vendor"}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{
        backgroundColor: C.backgroundCard, borderRadius: 20, padding: 22,
        shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.35 : 0.06, shadowRadius: 16, elevation: 3,
        gap: 16, borderWidth: isDark ? 1 : 0, borderColor: C.border,
      }}>
        {error ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: isDark ? "#2D1515" : "#FEF2F2", borderRadius: 10, padding: 11, borderWidth: 1, borderColor: isDark ? "#4D2020" : "#FECACA" }}>
            <Ionicons name="alert-circle" size={15} color={C.danger} />
            <Text style={{ color: C.danger, fontSize: 13, flex: 1 }}>{error}</Text>
          </View>
        ) : null}

        {[
          { label: "Full Name *", value: name, setter: setName, placeholder: "Your full name", icon: "person-outline" as const, keyboard: "default" as const },
          { label: "Email *", value: email, setter: setEmail, placeholder: "your@email.com", icon: "mail-outline" as const, keyboard: "email-address" as const },
          { label: "Phone", value: phone, setter: setPhone, placeholder: "+91 XXXXXXXXXX", icon: "call-outline" as const, keyboard: "phone-pad" as const },
          { label: "Password *", value: password, setter: setPassword, placeholder: "Min 6 characters", icon: "lock-closed-outline" as const, keyboard: "default" as const, secure: true },
        ].map(({ label, value, setter, placeholder, icon, keyboard, secure }) => (
          <View key={label} style={{ gap: 7 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: C.text }}>{label}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: C.border, borderRadius: 14, backgroundColor: C.backgroundSecondary }}>
              <Ionicons name={icon} size={17} color={C.textSecondary} style={{ paddingLeft: 14 }} />
              <TextInput
                style={{ flex: 1, fontSize: 15, color: C.text, paddingHorizontal: 12, paddingVertical: 14 }}
                value={value}
                onChangeText={setter}
                placeholder={placeholder}
                keyboardType={keyboard}
                autoCapitalize={keyboard === "email-address" ? "none" : "words"}
                secureTextEntry={!!secure}
                placeholderTextColor={C.textTertiary}
              />
            </View>
          </View>
        ))}

        {role === "vendor" && (
          <>
            <View style={{ height: 1, backgroundColor: C.border }} />
            <Text style={{ fontSize: 14, fontWeight: "700", color: C.primary }}>Vendor Details</Text>
            {[
              { label: "Shop Name *", value: shopName, setter: setShopName, placeholder: "e.g. Temsu Fresh Store", icon: "storefront-outline" as const },
              { label: "Product Type", value: productType, setter: setProductType, placeholder: "e.g. Vegetables & Fruits", icon: "list-outline" as const },
            ].map(({ label, value, setter, placeholder, icon }) => (
              <View key={label} style={{ gap: 7 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: C.text }}>{label}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: C.border, borderRadius: 14, backgroundColor: C.backgroundSecondary }}>
                  <Ionicons name={icon} size={17} color={C.textSecondary} style={{ paddingLeft: 14 }} />
                  <TextInput
                    style={{ flex: 1, fontSize: 15, color: C.text, paddingHorizontal: 12, paddingVertical: 14 }}
                    value={value}
                    onChangeText={setter}
                    placeholder={placeholder}
                    placeholderTextColor={C.textTertiary}
                  />
                </View>
              </View>
            ))}
            <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: isDark ? "#2A2010" : "#FFFBEB", borderRadius: 12, padding: 12 }}>
              <Ionicons name="information-circle-outline" size={16} color={C.warning} />
              <Text style={{ fontSize: 12, color: isDark ? "#D97706" : "#92400E", flex: 1, lineHeight: 18 }}>
                Vendor registration fee: ₹500/year. Vendor slot & approval by admin required.
              </Text>
            </View>
          </>
        )}

        <Pressable
          style={({ pressed }) => ({
            backgroundColor: C.primary, borderRadius: 14, paddingVertical: 16,
            alignItems: "center", opacity: loading ? 0.6 : pressed ? 0.88 : 1,
            shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
            transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
          })}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.2 }}>Create Account</Text>
          )}
        </Pressable>

        <Pressable style={{ flexDirection: "row", justifyContent: "center" }} onPress={() => router.back()}>
          <Text style={{ fontSize: 14, color: C.textSecondary }}>Already have an account? </Text>
          <Text style={{ fontSize: 14, color: C.primary, fontWeight: "700" }}>Sign In</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
