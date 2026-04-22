/**
 * @file src/app/providers/index.tsx
 * @description AppProviders cho Customer App.
 *
 * Provider order (outer → inner):
 *   MobileNotificationProvider
 *     children (NavigationContainer + AppNavigator)
 *
 * TODO: Khi AuthProvider được thêm vào, hãy:
 *   1. Đặt <MobileNotificationProvider> bên TRONG AuthProvider
 *   2. Truyền userId={auth.customerId} và accessToken={auth.token}
 *   3. Gọi connectSocket(customerId) ngay sau khi API Login thành công
 *      (ví dụ trong authSlice/thunk hoặc LoginScreen.handleLogin)
 */

import React, { type ReactNode } from "react";
import { MobileNotificationProvider } from "../../features/notifications";

interface AppProvidersProps {
  children: ReactNode;
  // TODO: nhận userId + accessToken từ AuthContext sau khi implement Auth
  userId?: string;
  accessToken?: string;
}

export function AppProviders({
  children,
  userId = "",
  accessToken = "",
}: AppProvidersProps): React.ReactElement {
  return (
    <MobileNotificationProvider userId={userId} accessToken={accessToken}>
      {children}
    </MobileNotificationProvider>
  );
}
