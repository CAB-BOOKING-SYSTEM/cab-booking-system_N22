/**
 * @file components/WebNotificationList.tsx
 * @description Danh sách toàn bộ thông báo — hiển thị trong dropdown panel.
 *
 * Features:
 *  - Group thông báo: Chưa đọc / Đã đọc
 *  - Click từng item → markAsRead
 *  - Nút "Đánh dấu tất cả đã đọc"
 *  - Loading skeleton & empty state
 */

import React from "react";
import type { Notification } from "../types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1)  return "Vừa xong";
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24)  return `${hr} giờ trước`;
  return `${Math.floor(hr / 24)} ngày trước`;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = {
  container: {
    width: "380px",
    maxHeight: "520px",
    display: "flex",
    flexDirection: "column" as const,
    backgroundColor: "#0f172a", // slate-900
    borderRadius: "14px",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
    overflow: "hidden",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  headerTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#f1f5f9",
  },
  markAllBtn: {
    background: "none",
    border: "none",
    color: "#38bdf8",
    fontSize: "13px",
    cursor: "pointer",
    padding: 0,
    fontWeight: 500,
  },
  list: {
    overflowY: "auto" as const,
    flex: 1,
  },
  sectionLabel: {
    padding: "10px 20px 6px",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.08em",
    color: "#475569",
    textTransform: "uppercase" as const,
  },
  item: (isRead: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "12px 20px",
    cursor: "pointer",
    backgroundColor: isRead ? "transparent" : "rgba(56,189,248,0.06)",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    transition: "background-color 0.15s",
  }),
  unreadDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#38bdf8",
    flexShrink: 0,
    marginTop: "6px",
  },
  readDot: {
    width: "8px",
    height: "8px",
    flexShrink: 0,
    marginTop: "6px",
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: (isRead: boolean): React.CSSProperties => ({
    fontSize: "14px",
    fontWeight: isRead ? 400 : 600,
    color: isRead ? "#94a3b8" : "#f1f5f9",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
    marginBottom: "3px",
  }),
  itemBody: {
    fontSize: "13px",
    color: "#64748b",
    lineHeight: 1.4,
    display: "-webkit-box" as unknown as "flex",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
    marginBottom: "4px",
  } as React.CSSProperties,
  itemTime: {
    fontSize: "11px",
    color: "#475569",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 24px",
    color: "#475569",
    gap: "12px",
  },
  emptyIcon: { fontSize: "36px" },
  emptyText: { fontSize: "14px" },
  skeleton: {
    padding: "12px 20px",
    display: "flex",
    gap: "12px",
    alignItems: "center",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  skeletonCircle: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#1e293b",
    flexShrink: 0,
  },
  skeletonLine: (w: string, opacity?: number): React.CSSProperties => ({
    height: "12px",
    borderRadius: "6px",
    backgroundColor: "#1e293b",
    width: w,
    opacity: opacity ?? 1,
  }),
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonItem(): React.ReactElement {
  return (
    <div style={styles.skeleton}>
      <div style={styles.skeletonCircle} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={styles.skeletonLine("60%")} />
        <div style={styles.skeletonLine("90%", 0.6)} />
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface WebNotificationListProps {
  notifications: Notification[];
  isLoading?: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  unreadCount: number;
  id?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WebNotificationList({
  notifications,
  isLoading = false,
  onMarkAsRead,
  onMarkAllAsRead,
  unreadCount,
  id = "notification-list",
}: WebNotificationListProps): React.ReactElement {
  const unread = notifications.filter((n) => !n.isRead);
  const read   = notifications.filter((n) => n.isRead);

  return (
    <div id={id} style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>Thông báo</span>
        {unreadCount > 0 && (
          <button
            id={`${id}-mark-all`}
            style={styles.markAllBtn}
            onClick={onMarkAllAsRead}
          >
            Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      {/* Body */}
      <div id={`${id}-body`} style={styles.list}>
        {isLoading ? (
          <>
            <SkeletonItem />
            <SkeletonItem />
            <SkeletonItem />
          </>
        ) : notifications.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>🔕</span>
            <span style={styles.emptyText}>Không có thông báo nào</span>
          </div>
        ) : (
          <>
            {unread.length > 0 && (
              <>
                <div style={styles.sectionLabel}>Chưa đọc</div>
                {unread.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onMarkAsRead={onMarkAsRead}
                    parentId={id}
                  />
                ))}
              </>
            )}

            {read.length > 0 && (
              <>
                <div style={styles.sectionLabel}>Đã đọc</div>
                {read.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onMarkAsRead={onMarkAsRead}
                    parentId={id}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── NotificationItem ─────────────────────────────────────────────────────────

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  parentId: string;
}

function NotificationItem({
  notification,
  onMarkAsRead,
  parentId,
}: NotificationItemProps): React.ReactElement {
  const { id, title, body, isRead, createdAt } = notification;

  return (
    <div
      id={`${parentId}-item-${id}`}
      style={styles.item(isRead)}
      onClick={() => !isRead && onMarkAsRead(id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && !isRead && onMarkAsRead(id)}
      aria-label={`${isRead ? "Đã đọc" : "Chưa đọc"}: ${title}`}
    >
      {/* Unread indicator */}
      <div style={isRead ? styles.readDot : styles.unreadDot} />

      <div style={styles.itemContent}>
        <div style={styles.itemTitle(isRead)}>{title}</div>
        <div style={styles.itemBody}>{body}</div>
        <div style={styles.itemTime}>{formatRelativeTime(createdAt)}</div>
      </div>
    </div>
  );
}

export default WebNotificationList;
