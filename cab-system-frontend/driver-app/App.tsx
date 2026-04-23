import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import CoreApp from "./src/core/App";

export default function App() {
  return (
    <SafeAreaProvider>
      <CoreApp />
    </SafeAreaProvider>
  );
}
