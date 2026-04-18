import { Text, View, StyleSheet } from "react-native";

import { formatCurrency } from "@cab/shared-utils";

export function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Customer App</Text>
      <Text style={styles.subtitle}>Monorepo scaffold is ready.</Text>
      <Text style={styles.highlight}>{formatCurrency(25000)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: "#5b6475",
  },
  highlight: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: "600",
  },
});
