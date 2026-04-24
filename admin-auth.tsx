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
import { apiRequest } from "@/lib/query-client";

const ADMIN_EMAIL = "laknyemchungz67@gmail.com";

type Mode = "login" | "signup" | "reset";

export default function AdminAuthScreen() {
  const insets = useSafeAreaInsets();
  const { login, register } = useAuth();
  const { colors: C, isDark } = useTheme();

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const checkAndDecideMode = async () => {
    const norm = email.trim().toLowerCase();
    if (norm !== ADMIN_EMAIL) {
      setError("Unauthorized. Only the designated admin email is permitted.");
      return;
    }
    setError("");
    setChecking(true);
    try {
      const res = await apiRequest<{ exists: boolean }>("POST", "/api/auth/check-email", { email: norm });
      setMode(res.exists ? "login" : "signup");
    } catch {
      setMode("login");
    } finally {
      setChecking(false);
    }
  };

  const handleLogin = async () => {
    const norm = email.trim().toLowerCase();
    if (!norm || !password) { setError("Please fill all fields"); return; }
    if (norm !== ADMIN_EMAIL) { setError("Unauthorized admin access"); return; }
    setError(""); setLoading(true);
    try {
      await login(norm, password);
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : "Login failed").replace(/^\d+:\s*/, ""));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    const norm = email.trim().toLowerCase();
    if (!name.trim() || !norm || !password) { setError("Please fill all required fields"); return; }
    if (norm !== ADMIN_EMAIL) { setError("Unauthorized admin access"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setError(""); setLoading(true);
    try {
      await register({ name: name.trim(), email: norm, phone: "", password, role: "admin" });
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : "Registration failed").replace(/^\d+:\s*/, ""));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    const norm = email.trim().toLowerCase();
    if (!norm || !password) { setError("Please fill all fields"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setError(""); setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/reset-password", { email: norm, newPassword: password });
      setSuccess("Password updated! Please login now.");
      setPassword(""); setConfirmPassword("");
      setMode("login");
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : "Reset failed").replace(/^\d+:\s*/, ""));
    } finally {
      setLoading(false);
    }
  };

  const modeLabel = mode === "login" ? "Admin Login" : mode === "signup" ? "Admin Registration" : "Reset Password";

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
        style={({ pressed }) => ({ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, opacity: pressed ? 0.6 : 1 })}
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
        <Text style={{ fontSize: 22, fontWeight: "800", color: C.text, letterSpacing: -0.4 }}>{modeLabel}</Text>
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 6,
          backgroundColor: isDark ? "#1A2A1E" : "#DCFCE7",
          borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
        }}>
          <Ionicons name="lock-closed" size={12} color="#15803D" />
          <Text style={{ fontSize: 11, color: "#15803D", fontWeight: "700" }}>RESTRICTED ACCESS</Text>
        </View>
        {mode === "login" && (
          <Text style={{ fontSize: 12, color: C.textSecondary, textAlign: "center", lineHeight: 17, maxWidth: 240 }}>
            Sign in to access the admin dashboard.
          </Text>
        )}
        {mode === "signup" && (
          <Text style={{ fontSize: 12, color: C.textSecondary, textAlign: "center", lineHeight: 17, maxWidth: 260 }}>
            Create the admin account for Northeast Basket.
          </Text>
        )}
      </View>

      {/* Tab switcher (email step) */}
      {mode !== "reset" && (
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["login", "signup"] as Mode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => { setMode(m); setError(""); setSuccess(""); }}
              style={({pressed}) => ({
                flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center",
                backgroundColor: mode === m ? "#1B4332" : (isDark ? C.backgroundSecondary : "#F0F0F0"),
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: mode === m ? "#6EE7B7" : C.textSecondary }}>
                {m === "login" ? "Login" : "Create Account"}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Form Card */}
      <View style={{
        backgroundColor: C.backgroundCard, borderRadius: 24, padding: 24,
        shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.4 : 0.06, shadowRadius: 20, elevation: 4,
        gap: 18, borderWidth: 1.5, borderColor: "#1B4332",
      }}>
        {/* Error */}
        {error ? (
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: isDark ? "#2D1515" : "#FEF2F2", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: isDark ? "#4D2020" : "#FECACA" }}>
            <Ionicons name="alert-circle" size={16} color="#DC2626" style={{ marginTop: 1 }} />
            <Text style={{ color: "#DC2626", fontSize: 13, flex: 1, lineHeight: 18 }}>{error}</Text>
          </View>
        ) : null}

        {/* Success */}
        {success ? (
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: isDark ? "#0A2A1A" : "#DCFCE7", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#86EFAC" }}>
            <Ionicons name="checkmark-circle" size={16} color="#16A34A" style={{ marginTop: 1 }} />
            <Text style={{ color: "#16A34A", fontSize: 13, flex: 1, lineHeight: 18 }}>{success}</Text>
          </View>
        ) : null}

        {/* Full Name (signup only) */}
        {mode === "signup" && (
          <View style={{ gap: 7 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: C.text }}>Full Name</Text>
            <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: C.border, borderRadius: 14, backgroundColor: C.backgroundSecondary }}>
              <Ionicons name="person-outline" size={17} color={C.textSecondary} style={{ paddingLeft: 14 }} />
              <TextInput
                style={{ flex: 1, fontSize: 15, color: C.text, paddingHorizontal: 12, paddingVertical: 14 }}
                value={name} onChangeText={setName}
                placeholder="Admin name" autoCapitalize="words"
                placeholderTextColor={C.textTertiary}
              />
            </View>
          </View>
        )}

        {/* Email */}
        <View style={{ gap: 7 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: C.text }}>
            Admin Email <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: C.border, borderRadius: 14, backgroundColor: C.backgroundSecondary }}>
            <Ionicons name="mail-outline" size={17} color={C.textSecondary} style={{ paddingLeft: 14 }} />
            <TextInput
              style={{ flex: 1, fontSize: 15, color: C.text, paddingHorizontal: 12, paddingVertical: 14 }}
              value={email} onChangeText={setEmail}
              placeholder={ADMIN_EMAIL}
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
              placeholderTextColor={C.textTertiary}
            />
          </View>
          <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: -2 }}>
            Only the designated admin email is accepted.
          </Text>
        </View>

        {/* Password */}
        <View style={{ gap: 7 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: C.text }}>
            {mode === "reset" ? "New Password" : "Password"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: C.border, borderRadius: 14, backgroundColor: C.backgroundSecondary }}>
            <Ionicons name="lock-closed-outline" size={17} color={C.textSecondary} style={{ paddingLeft: 14 }} />
            <TextInput
              style={{ flex: 1, fontSize: 15, color: C.text, paddingHorizontal: 12, paddingVertical: 14, paddingRight: 44 }}
              value={password} onChangeText={setPassword}
              placeholder="Min. 6 characters"
              secureTextEntry={!showPw}
              placeholderTextColor={C.textTertiary}
            />
            <Pressable onPress={() => setShowPw(!showPw)} style={{ padding: 12 }}>
              <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={19} color={C.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* Confirm Password (signup + reset) */}
        {(mode === "signup" || mode === "reset") && (
          <View style={{ gap: 7 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: C.text }}>Confirm Password</Text>
            <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: C.border, borderRadius: 14, backgroundColor: C.backgroundSecondary }}>
              <Ionicons name="lock-closed-outline" size={17} color={C.textSecondary} style={{ paddingLeft: 14 }} />
              <TextInput
                style={{ flex: 1, fontSize: 15, color: C.text, paddingHorizontal: 12, paddingVertical: 14, paddingRight: 44 }}
                value={confirmPassword} onChangeText={setConfirmPassword}
                placeholder="Re-enter password"
                secureTextEntry={!showConfirmPw}
                placeholderTextColor={C.textTertiary}
                onSubmitEditing={mode === "signup" ? handleSignup : handleReset}
              />
              <Pressable onPress={() => setShowConfirmPw(!showConfirmPw)} style={{ padding: 12 }}>
                <Ionicons name={showConfirmPw ? "eye-off-outline" : "eye-outline"} size={19} color={C.textSecondary} />
              </Pressable>
            </View>
          </View>
        )}

        {/* Primary Button */}
        <Pressable
          style={({ pressed }) => ({
            backgroundColor: "#1B4332", borderRadius: 14, paddingVertical: 16,
            alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8,
            shadowColor: "#1B4332", shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
            opacity: (loading || checking) ? 0.6 : pressed ? 0.85 : 1,
            transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
          })}
          onPress={mode === "login" ? handleLogin : mode === "signup" ? handleSignup : handleReset}
          disabled={loading || checking}
        >
          {(loading || checking) ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name={mode === "login" ? "log-in-outline" : mode === "signup" ? "shield-checkmark-outline" : "key-outline"} size={18} color="#6EE7B7" />
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.2 }}>
                {mode === "login" ? "Sign In as Admin" : mode === "signup" ? "Create Admin Account" : "Update Password"}
              </Text>
            </>
          )}
        </Pressable>

        {/* Forgot password / reset links */}
        {mode === "login" && (
          <Pressable onPress={() => { setMode("reset"); setError(""); setSuccess(""); }} style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 14, color: "#1B4332", fontWeight: "600" }}>Forgot Password?</Text>
          </Pressable>
        )}
        {mode === "reset" && (
          <Pressable onPress={() => { setMode("login"); setError(""); setSuccess(""); }} style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 14, color: C.textSecondary, fontWeight: "500" }}>Back to Login</Text>
          </Pressable>
        )}
      </View>

      {/* Security note */}
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
