import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";

import { store } from "../store";
import { MobileNotificationProvider } from "../../features/notifications";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

  // TODO: Get userId and accessToken from Redux/Auth state
  const userId = ""; 
  const accessToken = "";

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MobileNotificationProvider userId={userId} accessToken={accessToken}>
          {children}
        </MobileNotificationProvider>
      </QueryClientProvider>
    </Provider>
  );
}
