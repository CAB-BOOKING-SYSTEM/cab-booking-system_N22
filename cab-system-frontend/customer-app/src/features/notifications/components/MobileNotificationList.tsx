/**
 * @file MobileNotificationList.tsx
 * @description Màn hình danh sách thông báo React Native.
 * Dùng FlatList + View + Text + TouchableOpacity.
 */

import React, { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  type ListRenderItem,
} from "react-native";
import type { Notification } from "@cab/shared-types";

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1)  return "Vừa xong";
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24)  return `${hr} giờ trước`;
  return `${Math.floor(hr / 24)} ngày trước`;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f1f5f9",
  },
  markAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markAllText: {
    fontSize: 13,
    color: "#38bdf8",
    fontWeight: "500",
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  itemUnread: {
    backgroundColor: "rgba(56,189,248,0.06)",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    marginRight: 12,
  },
  dotUnread: {
    backgroundColor: "#38bdf8",
  },
  dotRead: {
    backgroundColor: "transparent",
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    marginBottom: 4,
    color: "#f1f5f9",
  },
  itemTitleRead: {
    fontWeight: "400",
    color: "#94a3b8",
  },
  itemTitleUnread: {
    fontWeight: "700",
  },
  itemBody: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
    marginBottom: 4,
  },
  itemTime: {
    fontSize: 11,
    color: "#475569",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#475569",
  },
  loader: {
    paddingVertical: 40,
  },
});

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MobileNotificationListProps {
  notifications: Notification[];
  isLoading?: boolean;
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MobileNotificationList({
  notifications,
  isLoading = false,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
}: MobileNotificationListProps): React.ReactElement {

  const renderItem: ListRenderItem<Notification> = useCallback(
    ({ item }) => (
      <TouchableOpacity
        activeOpacity={item.isRead ? 1 : 0.7}
        onPress={() => !item.isRead && onMarkAsRead(item.id)}
        style={[styles.item, !item.isRead && styles.itemUnread]}
        accessibilityLabel={`${item.isRead ? "Đã đọc" : "Chưa đọc"}: ${item.title}`}
      >
        <View style={[styles.dot, item.isRead ? styles.dotRead : styles.dotUnread]} />
        <View style={styles.itemContent}>
          <Text
            style={[
              styles.itemTitle,
              item.isRead ? styles.itemTitleRead : styles.itemTitleUnread,
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={styles.itemBody} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.itemTime}>
            {formatRelativeTime(item.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [onMarkAsRead],
  );

  const keyExtractor = useCallback((item: Notification) => item.id, []);

  const EmptyComponent = isLoading ? (
    <ActivityIndicator color="#38bdf8" style={styles.loader} />
  ) : (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🔕</Text>
      <Text style={styles.emptyText}>Không có thông báo nào</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thông báo</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={onMarkAllAsRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Đọc tất cả</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={EmptyComponent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

export default MobileNotificationList;
