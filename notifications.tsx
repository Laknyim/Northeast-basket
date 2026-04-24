import React from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/contexts/theme";
import { apiRequest } from "@/lib/query-client";

interface Notification {
  id: number;
  user_id: number;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

function getTypeIcon(type: string): { icon: string; color: string; bg: string } {
  switch (type) {
    case "product": return { icon: "cube-outline", color: "#1D4ED8", bg: "#DBEAFE" };
    case "order": return { icon: "bag-handle-outline", color: "#059669", bg: "#D1FAE5" };
    default: return { icon: "notifications-outline", color: "#7C3AED", bg: "#EDE9FE" };
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { colors: C, isDark } = useTheme();
  const qc = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });

  const markAllMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notifications/read-all", {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      qc.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markOneMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/notifications/${id}/read`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      qc.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <View style={{
        paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
        backgroundColor: C.backgroundCard,
        borderBottomWidth: 1, borderBottomColor: C.border,
        paddingBottom: 12, paddingHorizontal: 20,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
          >
            <Ionicons name="arrow-back" size={24} color={C.text} />
          </Pressable>
          <View>
            <Text style={{ fontSize: 18, fontWeight: "800", color: C.text }}>Notifications</Text>
            {unreadCount > 0 && (
              <Text style={{ fontSize: 12, color: C.textSecondary }}>{unreadCount} unread</Text>
            )}
          </View>
        </View>
        {unreadCount > 0 && (
          <Pressable
            onPress={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            style={({ pressed }) => ({
              flexDirection: "row", alignItems: "center", gap: 4,
              opacity: pressed || markAllMutation.isPending ? 0.6 : 1,
              backgroundColor: isDark ? C.backgroundSecondary : "#F0FDF4",
              paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
            })}
          >
            <Ionicons name="checkmark-done-outline" size={16} color={C.primary} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: C.primary }}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 12, paddingBottom: 60 }}>
          <View style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: isDark ? C.backgroundSecondary : "#F3F4F6",
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name="notifications-off-outline" size={34} color={C.textTertiary} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: C.text }}>No notifications yet</Text>
          <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: "center", maxWidth: 260 }}>
            Order updates, product approvals, and delivery alerts will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 40 }}
          renderItem={({ item }) => {
            const { icon, color, bg } = getTypeIcon(item.type);
            const isUnread = !item.is_read;
            return (
              <Pressable
                onPress={() => {
                  if (isUnread) markOneMutation.mutate(item.id);
                }}
                style={({ pressed }) => ({
                  flexDirection: "row", gap: 14, alignItems: "flex-start",
                  backgroundColor: isUnread
                    ? (isDark ? "#0D1A0D" : "#F0FDF4")
                    : C.backgroundCard,
                  borderRadius: 16, padding: 14,
                  borderWidth: 1,
                  borderColor: isUnread ? (isDark ? "#1A3A1A" : "#BBF7D0") : C.border,
                  shadowColor: C.shadow,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDark ? 0.2 : 0.04, shadowRadius: 8, elevation: 2,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                {/* Icon */}
                <View style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: bg, alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Ionicons name={icon as never} size={20} color={color} />
                </View>

                {/* Content */}
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{
                    fontSize: 14, color: C.text, lineHeight: 20,
                    fontWeight: isUnread ? "600" : "400",
                  }}>
                    {item.message}
                  </Text>
                  <Text style={{ fontSize: 12, color: C.textTertiary }}>
                    {timeAgo(item.created_at)}
                  </Text>
                </View>

                {/* Unread dot */}
                {isUnread && (
                  <View style={{
                    width: 8, height: 8, borderRadius: 4,
                    backgroundColor: C.primary, marginTop: 6, flexShrink: 0,
                  }} />
                )}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
