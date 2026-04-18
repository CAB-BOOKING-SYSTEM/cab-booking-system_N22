import { Text, View, StyleSheet } from "react-native";

export function DashboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driver App</Text>
      <Text style={styles.subtitle}>Matching and ride workflow scaffold.</Text>
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
    textAlign: "center",
  },
});
