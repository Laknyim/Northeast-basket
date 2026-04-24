import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router, Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { colors: C, isDark, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotConfirm, setForgotConfirm] = useState("");
  const [forgotShowPw, setForgotShowPw] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  const logoTapRef = useRef(0);

  const handleLogoTap = () => {
    logoTapRef.current += 1;
    if (logoTapRef.current >= 5) {
      logoTapRef.current = 0;
      router.push("/(auth)/admin-auth" as never);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim() || !forgotPassword) { setForgotError("Please fill all fields"); return; }
    if (forgotPassword.length < 6) { setForgotError("Password must be at least 6 characters"); return; }
    if (forgotPassword !== forgotConfirm) { setForgotError("Passwords do not match"); return; }
    setForgotError(""); setForgotLoading(true);
    try {
      const { apiRequest } = await import("@/lib/query-client");
      await apiRequest("POST", "/api/auth/reset-password", {
        email: forgotEmail.trim().toLowerCase(),
        newPassword: forgotPassword,
      });
      setForgotSuccess("Password updated! Please sign in with your new password.");
      setForgotEmail(""); setForgotPassword(""); setForgotConfirm("");
      setTimeout(() => { setShowForgot(false); setForgotSuccess(""); }, 2500);
    } catch (e: unknown) {
      setForgotError((e instanceof Error ? e.message : "Reset failed").replace(/^\d+:\s*/, ""));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError("Please enter email and password"); return; }
    setError("");
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : "Login failed").replace(/^\d+:\s*/, ""));
    } finally {
      setLoading(false);
    }
  };


  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.background }}
      contentContainerStyle={{
        paddingHorizontal: 24, gap: 28,
        paddingTop: insets.top + (Platform.OS === "web" ? 67 : 48),
        paddingBottom: insets.bottom + 34,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Theme toggle */}
      <Pressable
        style={({ pressed }) => ({
          alignSelf: "flex-end", padding: 10, borderRadius: 20,
          backgroundColor: C.backgroundCard, opacity: pressed ? 0.7 : 1,
          borderWidth: isDark ? 1 : 0, borderColor: C.border,
        })}
        onPress={toggleTheme}
      >
        <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={20} color={C.textSecondary} />
      </Pressable>

      {/* Header */}
      <View style={{ alignItems: "center", gap: 10 }}>
        <Pressable
          onPress={handleLogoTap}
          style={{
            width: 80, height: 80, borderRadius: 24,
            backgroundColor: C.primary, alignItems: "center", justifyContent: "center",
            shadowColor: C.primary, shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.38, shadowRadius: 18, elevation: 10,
          }}
        >
          <Ionicons name="basket" size={40} color="#fff" />
        </Pressable>
        <Text style={{ fontSize: 24, fontWeight: "800", color: C.primary, letterSpacing: -0.5 }}>Northeast Basket</Text>
        <Text style={{ fontSize: 12, color: C.textSecondary, textAlign: "center", lineHeight: 17, maxWidth: 240 }}>
          Empowering Local Sellers. Serving Local Homes.
        </Text>
      </View>

      {/* Card */}
      <View style={{
        backgroundColor: C.backgroundCard, borderRadius: 24, padding: 24,
        shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.4 : 0.06, shadowRadius: 20, elevation: 4,
        gap: 18, borderWidth: isDark ? 1 : 0, borderColor: C.border,
      }}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 22, fontWeight: "700", color: C.text, letterSpacing: -0.3 }}>Welcome back</Text>
          <Text style={{ fontSize: 14, color: C.textSecondary }}>Sign in to continue</Text>
        </View>

        {error ? (
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 8,
            backgroundColor: isDark ? "#2D1515" : "#FEF2F2",
            borderRadius: 10, padding: 11,
            borderWidth: 1, borderColor: isDark ? "#4D2020" : "#FECACA",
          }}>
            <Ionicons name="alert-circle" size={15} color={C.danger} />
            <Text style={{ color: C.danger, fontSize: 13, flex: 1 }}>{error}</Text>
          </View>
        ) : null}

        {/* Email */}
        <View style={{ gap: 7 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: C.text }}>Email</Text>
          <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: C.border, borderRadius: 14, backgroundColor: C.backgroundSecondary }}>
            <Ionicons name="mail-outline" size={17} color={C.textSecondary} style={{ paddingLeft: 14 }} />
            <TextInput
              style={{ flex: 1, fontSize: 15, color: C.text, paddingHorizontal: 12, paddingVertical: 14 }}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={C.textTertiary}
            />
          </View>
        </View>

        {/* Password */}
        <View style={{ gap: 7 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: C.text }}>Password</Text>
          <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: C.border, borderRadius: 14, backgroundColor: C.backgroundSecondary }}>
            <Ionicons name="lock-closed-outline" size={17} color={C.textSecondary} style={{ paddingLeft: 14 }} />
            <TextInput
              style={{ flex: 1, fontSize: 15, color: C.text, paddingHorizontal: 12, paddingVertical: 14, paddingRight: 44 }}
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry={!showPw}
              placeholderTextColor={C.textTertiary}
              onSubmitEditing={handleLogin}
            />
            <Pressable onPress={() => setShowPw(!showPw)} style={{ padding: 12 }}>
              <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={19} color={C.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* Sign In Button */}
        <Pressable
          style={({ pressed }) => ({
            backgroundColor: C.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center",
            shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
            opacity: loading ? 0.6 : pressed ? 0.88 : 1,
            transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
          })}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.2 }}>Sign In</Text>
          )}
        </Pressable>

        {/* Forgot Password */}
        <Pressable
          onPress={() => { setShowForgot(!showForgot); setForgotError(""); setForgotSuccess(""); }}
          style={{ alignItems: "center" }}
        >
          <Text style={{ fontSize: 14, color: C.primary, fontWeight: "600" }}>
            {showForgot ? "Hide" : "Forgot Password?"}
          </Text>
        </Pressable>

        {showForgot && (
          <View style={{ gap: 12, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 14 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: C.text }}>Reset Password</Text>

            {forgotError ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: isDark ? "#2D1515" : "#FEF2F2", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: isDark ? "#4D2020" : "#FECACA" }}>
                <Ionicons name="alert-circle" size={14} color="#DC2626" />
                <Text style={{ color: "#DC2626", fontSize: 13, flex: 1 }}>{forgotError}</Text>
              </View>
            ) : null}
            {forgotSuccess ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: isDark ? "#0A2A1A" : "#DCFCE7", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#86EFAC" }}>
                <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                <Text style={{ color: "#16A34A", fontSize: 13, flex: 1 }}>{forgotSuccess}</Text>
              </View>
            ) : null}

            <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: C.border, borderRadius: 12, backgroundColor: C.backgroundSecondary }}>
              <Ionicons name="mail-outline" size={16} color={C.textSecondary} style={{ paddingLeft: 12 }} />
              <TextInput
                style={{ flex: 1, fontSize: 14, color: C.text, paddingHorizontal: 10, paddingVertical: 12 }}
                value={forgotEmail} onChangeText={setForgotEmail}
                placeholder="Your email" keyboardType="email-address"
                autoCapitalize="none" autoCorrect={false}
                placeholderTextColor={C.textTertiary}
              />
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: C.border, borderRadius: 12, backgroundColor: C.backgroundSecondary }}>
              <Ionicons name="lock-closed-outline" size={16} color={C.textSecondary} style={{ paddingLeft: 12 }} />
              <TextInput
                style={{ flex: 1, fontSize: 14, color: C.text, paddingHorizontal: 10, paddingVertical: 12, paddingRight: 40 }}
                value={forgotPassword} onChangeText={setForgotPassword}
                placeholder="New password (min 6 chars)"
                secureTextEntry={!forgotShowPw}
                placeholderTextColor={C.textTertiary}
              />
              <Pressable onPress={() => setForgotShowPw(!forgotShowPw)} style={{ padding: 10 }}>
                <Ionicons name={forgotShowPw ? "eye-off-outline" : "eye-outline"} size={18} color={C.textSecondary} />
              </Pressable>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: C.border, borderRadius: 12, backgroundColor: C.backgroundSecondary }}>
              <Ionicons name="lock-closed-outline" size={16} color={C.textSecondary} style={{ paddingLeft: 12 }} />
              <TextInput
                style={{ flex: 1, fontSize: 14, color: C.text, paddingHorizontal: 10, paddingVertical: 12 }}
                value={forgotConfirm} onChangeText={setForgotConfirm}
                placeholder="Confirm new password"
                secureTextEntry={!forgotShowPw}
                placeholderTextColor={C.textTertiary}
                onSubmitEditing={handleForgotPassword}
              />
            </View>

            <Pressable
              style={({ pressed }) => ({
                backgroundColor: C.primary, borderRadius: 12, paddingVertical: 13,
                alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6,
                opacity: forgotLoading ? 0.7 : pressed ? 0.85 : 1,
              })}
              onPress={handleForgotPassword}
              disabled={forgotLoading}
            >
              {forgotLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Ionicons name="key-outline" size={16} color="#fff" />
                  <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Update Password</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* Divider */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
          <Text style={{ fontSize: 12, color: C.textTertiary, fontWeight: "500" }}>or</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
        </View>

        {/* Register link */}
        <View style={{ flexDirection: "row", justifyContent: "center" }}>
          <Text style={{ fontSize: 14, color: C.textSecondary }}>Don't have an account? </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable><Text style={{ fontSize: 14, color: C.primary, fontWeight: "700" }}>Sign Up</Text></Pressable>
          </Link>
        </View>
      </View>

    </ScrollView>
  );
}
