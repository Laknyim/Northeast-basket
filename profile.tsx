import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  Switch,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";

function MenuItem({
  icon,
  label,
  onPress,
  danger,
  right,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
  right?: React.ReactNode;
}) {
  const { colors: C, isDark } = useTheme();
  return (
    <Pressable
      style={({ pressed }) => ({
        flexDirection: "row", alignItems: "center", gap: 14,
        paddingVertical: 15, paddingHorizontal: 16,
        opacity: pressed ? 0.7 : 1,
      })}
      onPress={onPress}
    >
      <View style={{
        width: 38, height: 38, borderRadius: 12,
        backgroundColor: danger ? (isDark ? "#2D1515" : "#FEF2F2") : C.primaryFade,
        alignItems: "center", justifyContent: "center",
      }}>
        <Ionicons name={icon as never} size={18} color={danger ? C.danger : C.primary} />
      </View>
      <Text style={{ flex: 1, fontSize: 15, fontWeight: "500", color: danger ? C.danger : C.text }}>{label}</Text>
      {right ?? <Ionicons name="chevron-forward" size={16} color={C.textTertiary} />}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { colors: C, isDark, toggleTheme } = useTheme();

  const handleLogout = () => {
    if (Platform.OS === "web") {
      logout();
    } else {
      Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: logout },
      ]);
    }
  };

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.background }}
      contentContainerStyle={{
        paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
        paddingBottom: insets.bottom + 100,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={{ padding: 24, paddingBottom: 0 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: C.text, letterSpacing: -0.3, marginBottom: 20 }}>Profile</Text>

        <View style={{
          backgroundColor: C.backgroundCard, borderRadius: 24, padding: 20,
          flexDirection: "row", alignItems: "center", gap: 16,
          shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.3 : 0.06, shadowRadius: 16, elevation: 3,
          borderWidth: isDark ? 1 : 0, borderColor: C.border,
        }}>
          <View style={{
            width: 64, height: 64, borderRadius: 32,
            backgroundColor: C.primary, alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#fff" }}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: C.text }}>{user.name}</Text>
            <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>{user.email}</Text>
            <View style={{
              alignSelf: "flex-start", marginTop: 6,
              backgroundColor: C.primaryFade, borderRadius: 8,
              paddingHorizontal: 10, paddingVertical: 3,
            }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: C.primary, textTransform: "uppercase", letterSpacing: 0.6 }}>
                {user.role}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Account Section */}
      <View style={{ padding: 24, paddingBottom: 0 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: C.textTertiary, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Account</Text>
        <View style={{
          backgroundColor: C.backgroundCard, borderRadius: 20, overflow: "hidden",
          shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.25 : 0.05, shadowRadius: 12, elevation: 2,
          borderWidth: isDark ? 1 : 0, borderColor: C.border,
        }}>
          <MenuItem icon="bag-outline" label="My Orders" onPress={() => router.push("/(shop)/orders")} />
          <View style={{ height: 1, backgroundColor: C.borderLight, marginLeft: 68 }} />
          <MenuItem icon="cart-outline" label="My Cart" onPress={() => router.push("/(shop)/cart")} />
          <View style={{ height: 1, backgroundColor: C.borderLight, marginLeft: 68 }} />
          <MenuItem icon="search-outline" label="Browse Products" onPress={() => router.push("/(shop)/search")} />
        </View>
      </View>

      {/* Appearance Section */}
      <View style={{ padding: 24, paddingBottom: 0 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: C.textTertiary, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Appearance</Text>
        <View style={{
          backgroundColor: C.backgroundCard, borderRadius: 20, overflow: "hidden",
          shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.25 : 0.05, shadowRadius: 12, elevation: 2,
          borderWidth: isDark ? 1 : 0, borderColor: C.border,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13, paddingHorizontal: 16 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.primaryFade, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={isDark ? "moon" : "sunny-outline"} size={18} color={C.primary} />
            </View>
            <Text style={{ flex: 1, fontSize: 15, fontWeight: "500", color: C.text }}>Dark Mode</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: C.border, true: C.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </View>

      {/* About Section */}
      <View style={{ padding: 24, paddingBottom: 0 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: C.textTertiary, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>About</Text>
        <View style={{
          backgroundColor: C.backgroundCard, borderRadius: 20, overflow: "hidden",
          shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.25 : 0.05, shadowRadius: 12, elevation: 2,
          borderWidth: isDark ? 1 : 0, borderColor: C.border,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13, paddingHorizontal: 16 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.primaryFade, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="basket-outline" size={18} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "500", color: C.text }}>Northeast Basket</Text>
              <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 1 }}>Empowering Local Sellers</Text>
            </View>
            <Text style={{ fontSize: 12, color: C.textTertiary }}>v1.0</Text>
          </View>
        </View>
      </View>

      {/* Sign Out */}
      <View style={{ padding: 24 }}>
        <View style={{
          backgroundColor: C.backgroundCard, borderRadius: 20, overflow: "hidden",
          shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.25 : 0.05, shadowRadius: 12, elevation: 2,
          borderWidth: isDark ? 1 : 0, borderColor: C.border,
        }}>
          <MenuItem icon="log-out-outline" label="Sign Out" onPress={handleLogout} danger right={null} />
        </View>
      </View>
    </ScrollView>
  );
}
