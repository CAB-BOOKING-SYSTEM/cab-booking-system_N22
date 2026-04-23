import React, { createContext, useContext } from "react";

import { CustomerAuthSession } from "./session";

interface CustomerAuthSessionContextValue {
  session: CustomerAuthSession | null;
  setSession: React.Dispatch<
    React.SetStateAction<CustomerAuthSession | null>
  >;
}

const CustomerAuthSessionContext =
  createContext<CustomerAuthSessionContextValue | null>(null);

export function CustomerAuthSessionProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: CustomerAuthSessionContextValue;
}): React.ReactElement {
  return (
    <CustomerAuthSessionContext.Provider value={value}>
      {children}
    </CustomerAuthSessionContext.Provider>
  );
}

export function useCustomerAuthSession(): CustomerAuthSessionContextValue {
  const context = useContext(CustomerAuthSessionContext);

  if (!context) {
    throw new Error("useCustomerAuthSession phải được dùng trong provider");
  }

  return context;
}
