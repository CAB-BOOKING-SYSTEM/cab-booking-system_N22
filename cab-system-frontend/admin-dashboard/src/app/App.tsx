import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "./router";
import {
  WebNotificationProvider,
  WebNotificationToast,
  useNotificationContext,
} from "../features/notifications";

/**
 * Root Application Component — Admin Dashboard
 *
 * Provider order (outer → inner):
 *   WebNotificationProvider   ← notification socket + state
 *     BrowserRouter
 *       AppRouter
 *       WebNotificationToastAdapter  ← global toast overlay
 *
 * TODO: Khi AuthProvider được thêm vào, hãy:
 *   1. Đặt <WebNotificationProvider> bên TRONG AuthProvider
 *   2. Truyền userId={auth.user.id} và accessToken={auth.token}
 *   3. Gọi connectSocket(user.id) ngay sau khi API Login thành công
 *      (ví dụ bên trong authSlice/thunk hoặc LoginPage.handleSubmit)
 */
export default function App() {
  // TODO: Lấy userId và accessToken từ AuthContext/Redux sau khi implement Auth
  const userId = "";       // Thay bằng: auth.user?.id ?? ""
  const accessToken = "";  // Thay bằng: auth.token ?? ""

  return (
    <WebNotificationProvider userId={userId} accessToken={accessToken}>
      <BrowserRouter>
        <AppRouter />
        {/* Toast toàn cục — hiển thị đè lên tất cả route */}
        <WebNotificationToastAdapter />
      </BrowserRouter>
    </WebNotificationProvider>
  );
}

/**
 * Adapter nội bộ: đọc latestToast từ Context và render Toast.
 * Tách ra component riêng để tránh re-render toàn bộ App khi toast thay đổi.
 */
function WebNotificationToastAdapter() {
  const { latestToast, dismissToast } = useNotificationContext();

  if (!latestToast) return null;

  return (
    <WebNotificationToast
      notification={latestToast}
      onDismiss={dismissToast}
      position="top-right"
    />
  );
}
