/**
 * @file components/WebNotificationToast.tsx
 * @description Toast popup hiển thị khi nhận được thông báo mới qua Socket.IO.
 *
 * Tự động ẩn sau `duration` ms (mặc định 4000ms).
 * Render ở góc màn hình theo `position`.
 */

import React, { useEffect, useRef } from "react";
import type { Notification } from "../types";
import type { ToastPosition } from "../types";

// ─── Icon map theo NotificationType ─────────────────────────────────────────

const TYPE_ICON: Record<string, string> = {
  ride_requested: "🚖",
  ride_assigned: "✅",
  ride_arriving: "📍",
  ride_started: "🚀",
  ride_completed: "🏁",
  ride_cancelled: "❌",
  payment_received: "💳",
  payment_failed: "⚠️",
  system_alert: "🔔",
  promotion: "🎁",
};

// ─── Styles ──────────────────────────────────────────────────────────────────

function getPositionStyle(position: ToastPosition): React.CSSProperties {
  const base: React.CSSProperties = {
    position: "fixed",
    zIndex: 9999,
    maxWidth: "360px",
    width: "calc(100% - 32px)",
  };

  switch (position) {
    case "top-right":    return { ...base, top: 16, right: 16 };
    case "top-left":     return { ...base, top: 16, left: 16 };
    case "bottom-right": return { ...base, bottom: 16, right: 16 };
    case "bottom-left":  return { ...base, bottom: 16, left: 16 };
    default:             return { ...base, top: 16, right: 16 };
  }
}

const styles = {
  toast: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "14px 16px",
    borderRadius: "12px",
    backgroundColor: "#1e293b", // slate-800
    color: "#f1f5f9",           // slate-100
    boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
    border: "1px solid rgba(255,255,255,0.08)",
    animation: "slideInToast 0.3s ease-out",
  } as React.CSSProperties,
  icon: {
    fontSize: "22px",
    lineHeight: 1,
    flexShrink: 0,
    marginTop: "1px",
  } as React.CSSProperties,
  content: {
    flex: 1,
    minWidth: 0,
  } as React.CSSProperties,
  title: {
    fontWeight: 600,
    fontSize: "14px",
    marginBottom: "4px",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  } as React.CSSProperties,
  body: {
    fontSize: "13px",
    color: "#94a3b8", // slate-400
    lineHeight: 1.4,
    display: "-webkit-box" as unknown as "flex",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
  } as React.CSSProperties,
  closeBtn: {
    background: "none",
    border: "none",
    color: "#64748b",
    cursor: "pointer",
    fontSize: "18px",
    lineHeight: 1,
    flexShrink: 0,
    padding: "0 2px",
  } as React.CSSProperties,
};

// ─── Props ───────────────────────────────────────────────────────────────────

export interface WebNotificationToastProps {
  notification: Notification;
  onDismiss: () => void;
  duration?: number;
  position?: ToastPosition;
  id?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function WebNotificationToast({
  notification,
  onDismiss,
  duration = 4000,
  position = "top-right",
  id = "notification-toast",
}: WebNotificationToastProps): React.ReactElement {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [notification.id, duration, onDismiss]);

  const icon = TYPE_ICON[notification.type] ?? "🔔";

  return (
    <>
      {/* Keyframe injection — chỉ cần 1 lần trong DOM */}
      <style>{`
        @keyframes slideInToast {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        id={id}
        role="alert"
        aria-live="polite"
        style={getPositionStyle(position)}
      >
        <div style={styles.toast}>
          <span style={styles.icon} aria-hidden="true">{icon}</span>

          <div style={styles.content}>
            <div id={`${id}-title`} style={styles.title}>
              {notification.title}
            </div>
            <div id={`${id}-body`} style={styles.body}>
              {notification.body}
            </div>
          </div>

          <button
            id={`${id}-close`}
            onClick={onDismiss}
            style={styles.closeBtn}
            aria-label="Đóng thông báo"
          >
            ✕
          </button>
        </div>
      </div>
    </>
  );
}

export default WebNotificationToast;
