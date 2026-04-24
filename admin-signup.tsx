import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";

const ADMIN_EMAIL = "laknyemchungz67@gmail.com";

export default function AdminSignupScreen() {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const { colors: C, isDark } = useTheme();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAdminRegister = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!name.trim() || !normalizedEmail || !password) {
      setError("Please fill all required fields");
      return;
    }
    if (normalizedEmail !== ADMIN_EMAIL) {
      setError("Unauthorized admin access. This email is not permitted.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await register({
        name: name.trim(),
        email: normalizedEmail,
        phone: "",
        password,
        role: "admin",
      });
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
        paddingTop: insets.top + (Platform.OS === "web" ? 67 : 32),
        paddingBottom: insets.bottom + 40,
        gap: 24,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Back */}
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => ({
          alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Ionicons name="arrow-back" size={20} color={C.textSecondary} />
        <Text style={{ fontSize: 14, color: C.textSecondary, fontWeight: "500" }}>Back</Text>
      </Pressable>

      {/* Header */}
      <View style={{ alignItems: "center", gap: 12 }}>
        <View style={{
          width: 72, height: 72, borderRadius: 20,
          backgroundColor: "#1B4332", alignItems: "center", justifyContent: "center",
          shadowColor: "#1B4332", shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
        }}>
          <Ionicons name="shield-checkmark" size={36} color="#6EE7B7" />
        </View>
        <Text style={{ fontSize: 22, fontWeight: "800", color: C.text, letterSpacing: -0.4 }}>Admin Registration</Text>
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 6,
          backgroundColor: isDark ? "#1A2A1E" : "#DCFCE7",
          borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
        }}>
          <Ionicons name="lock-closed" size={12} color="#15803D" />
          <Text style={{ fontSize: 11, color: "#15803D", fontWeight: "700" }}>RESTRICTED ACCESS</Text>
        </View>
        <Text style={{ fontSize: 12, color: C.textSecondary, textAlign: "center", lineHeight: 17, maxWidth: 260 }}>
          This page is only accessible to the designated system administrator.
        </Text>
      </View>

      {/* Form Card */}
      <View style={{
        backgroundColor: C.backgroundCard, borderRadius: 24, padding: 24,
        shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.4 : 0.06, shadowRadius: 20, elevation: 4,
        gap: 18, borderWidth: 1.5, borderColor: "#1B4332",
      }}>
        {/* Error */}
        {error ? (
          <View style={{
            flexDirection: "row", alignItems: "flex-start", gap: 8,
            backgroundColor: isDark ? "#2D1515" : "#FEF2F2",
            borderRadius: 10, padding: 12,
            borderWidth: 1, borderColor: isDark ? "#4D2020" : "#FECACA",
          }}>
            <Ionicons name="alert-circle" size={16} color="#DC2626" style={{ marginTop: 1 }} />
            <Text style={{ color: "#DC2626", fontSize: 13, flex: 1, lineHeight: 18 }}>{error}</Text>
          </View>
        ) : null}

        {/* Full Name */}
        <View style={{ gap: 7 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: C.text }}>Full Name</Text>
          <View style={{
            flexDirection: "row", alignItems: "center",
            borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
            backgroundColor: C.backgroundSecondary,
          }}>
            <Ionicons name="person-outline" size={17} color={C.textSecondary} style={{ paddingLeft: 14 }} />
            <TextInput
              style={{ flex: 1, fontSize: 15, color: C.text, paddingHorizontal: 12, paddingVertical: 14 }}
              value={name}
              onChangeText={setName}
              placeholder="Admin name"
              autoCapitalize="words"
              placeholderTextColor={C.textTertiary}
            />
          </View>
        </View>

        {/* Email */}
        <View style={{ gap: 7 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: C.text }}>
            Admin Email <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <View style={{
            flexDirection: "row", alignItems: "center",
            borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
            backgroundColor: C.backgroundSecondary,
          }}>
            <Ionicons name="mail-outline" size={17} color={C.textSecondary} style={{ paddingLeft: 14 }} />
            <TextInput
              style={{ flex: 1, fontSize: 15, color: C.text, paddingHorizontal: 12, paddingVertical: 14 }}
              value={email}
              onChangeText={setEmail}
              placeholder={ADMIN_EMAIL}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={C.textTertiary}
            />
          </View>
          <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: -2 }}>
            Only the designated admin email is accepted.
          </Text>
        </View>

        {/* Password */}
        <View style={{ gap: 7 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: C.text }}>Password</Text>
          <View style={{
            flexDirection: "row", alignItems: "center",
            borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
            backgroundColor: C.backgroundSecondary,
          }}>
            <Ionicons name="lock-closed-outline" size={17} color={C.textSecondary} style={{ paddingLeft: 14 }} />
            <TextInput
              style={{ flex: 1, fontSize: 15, color: C.text, paddingHorizontal: 12, paddingVertical: 14, paddingRight: 44 }}
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 6 characters"
              secureTextEntry={!showPw}
              placeholderTextColor={C.textTertiary}
            />
            <Pressable onPress={() => setShowPw(!showPw)} style={{ padding: 12 }}>
              <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={19} color={C.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* Confirm Password */}
        <View style={{ gap: 7 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: C.text }}>Confirm Password</Text>
          <View style={{
            flexDirection: "row", alignItems: "center",
            borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
            backgroundColor: C.backgroundSecondary,
          }}>
            <Ionicons name="lock-closed-outline" size={17} color={C.textSecondary} style={{ paddingLeft: 14 }} />
            <TextInput
              style={{ flex: 1, fontSize: 15, color: C.text, paddingHorizontal: 12, paddingVertical: 14, paddingRight: 44 }}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter password"
              secureTextEntry={!showConfirmPw}
              placeholderTextColor={C.textTertiary}
              onSubmitEditing={handleAdminRegister}
            />
            <Pressable onPress={() => setShowConfirmPw(!showConfirmPw)} style={{ padding: 12 }}>
              <Ionicons name={showConfirmPw ? "eye-off-outline" : "eye-outline"} size={19} color={C.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* Register Button */}
        <Pressable
          style={({ pressed }) => ({
            backgroundColor: "#1B4332", borderRadius: 14, paddingVertical: 16,
            alignItems: "center", justifyContent: "center",
            flexDirection: "row", gap: 8,
            shadowColor: "#1B4332", shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
            opacity: loading ? 0.6 : pressed ? 0.85 : 1,
            transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
          })}
          onPress={handleAdminRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="shield-checkmark-outline" size={18} color="#6EE7B7" />
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.2 }}>
                Register Admin Account
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Warning note */}
      <View style={{
        flexDirection: "row", gap: 8, alignItems: "flex-start",
        backgroundColor: isDark ? "#2A1F0A" : "#FFFBEB",
        borderRadius: 12, padding: 12,
        borderWidth: 1, borderColor: isDark ? "#78350F" : "#FDE68A",
      }}>
        <Ionicons name="warning-outline" size={16} color="#92400E" style={{ marginTop: 1 }} />
        <Text style={{ fontSize: 12, color: "#92400E", flex: 1, lineHeight: 17 }}>
          This page is not indexed or linked publicly. Access is strictly restricted to the system administrator of Northeast Basket.
        </Text>
      </View>
    </ScrollView>
  );
}
