/**
 * @file components/WebNotificationBadge.tsx
 * @description Badge hiển thị số thông báo chưa đọc.
 *
 * Dùng trên icon chuông ở header Admin Dashboard.
 * Tự ẩn khi count = 0.
 */

import React from "react";

// ─── Inline styles (no Tailwind dependency) ───────────────────────────────────

const styles = {
  wrapper: {
    position: "relative" as const,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute" as const,
    top: "-6px",
    right: "-6px",
    minWidth: "18px",
    height: "18px",
    padding: "0 4px",
    borderRadius: "9999px",
    backgroundColor: "#ef4444", // red-500
    color: "#ffffff",
    fontSize: "11px",
    fontWeight: 700,
    lineHeight: "18px",
    textAlign: "center" as const,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 0 2px #ffffff",
    pointerEvents: "none" as const,
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface WebNotificationBadgeProps {
  /** Số thông báo chưa đọc */
  count: number;
  /** Icon hoặc nút bao bọc badge */
  children: React.ReactNode;
  /** Giới hạn hiển thị — mặc định 99 (hiển thị "99+") */
  max?: number;
  /** ID cho truy xuất trong browser tests */
  id?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WebNotificationBadge({
  count,
  children,
  max = 99,
  id = "notification-badge",
}: WebNotificationBadgeProps): React.ReactElement {
  const displayCount = count > max ? `${max}+` : String(count);
  const showBadge = count > 0;

  return (
    <div id={id} style={styles.wrapper}>
      {children}
      {showBadge && (
        <span
          id={`${id}-count`}
          style={styles.badge}
          aria-label={`${count} thông báo chưa đọc`}
          role="status"
        >
          {displayCount}
        </span>
      )}
    </div>
  );
}

export default WebNotificationBadge;
