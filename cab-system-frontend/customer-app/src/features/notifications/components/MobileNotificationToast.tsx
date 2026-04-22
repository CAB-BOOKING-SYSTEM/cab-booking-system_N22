/**
 * @file MobileNotificationToast.tsx
 * @description Toast React Native hiển thị thông báo mới nhận qua socket.
 * Dùng View + Text + TouchableOpacity (không dùng HTML).
 * Tự động ẩn sau `duration` ms.
 */

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import type { Notification } from "@cab/shared-types";

// ─── Icon map ────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<string, string> = {
  ride_requested:   "🚖",
  ride_assigned:    "✅",
  ride_arriving:    "📍",
  ride_started:     "🚀",
  ride_completed:   "🏁",
  ride_cancelled:   "❌",
  payment_received: "💳",
  payment_failed:   "⚠️",
  system_alert:     "🔔",
  promotion:        "🎁",
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 16,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  icon: {
    fontSize: 22,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 3,
  },
  body: {
    fontSize: 13,
    color: "#94a3b8",
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    color: "#64748b",
    fontSize: 16,
    lineHeight: 20,
  },
});

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MobileNotificationToastProps {
  notification: Notification;
  onDismiss: () => void;
  duration?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MobileNotificationToast({
  notification,
  onDismiss,
  duration = 4000,
}: MobileNotificationToastProps): React.ReactElement {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(opacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();

    // Auto dismiss
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(onDismiss);
    }, duration);

    return () => clearTimeout(timer);
  }, [notification.id, duration, onDismiss, opacity]);

  const icon = TYPE_ICON[notification.type] ?? "🔔";

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.toast}>
        <Text style={styles.icon}>{icon}</Text>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {notification.body}
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss} style={styles.closeBtn} accessibilityLabel="Đóng">
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export default MobileNotificationToast;
