import { Button, Text, View } from "react-native";

interface ProfileScreenProps {
  onLogout: () => void;
}

export function ProfileScreen({ onLogout }: ProfileScreenProps) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>ProfileScreen</Text>
      <View style={{ marginTop: 12 }}>
        <Button title="Đăng xuất" onPress={onLogout} />
      </View>
    </View>
  );
}
