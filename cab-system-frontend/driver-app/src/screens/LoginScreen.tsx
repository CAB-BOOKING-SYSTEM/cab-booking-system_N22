import { Button, Text, View } from "react-native";

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>LoginScreen</Text>
      <View style={{ marginTop: 12 }}>
        <Button 
          title="Đăng nhập" 
          onPress={() => {
            // TODO: Sau khi API login thành công:
            // 1. const { connectSocket } = useMobileNotificationContext();
            // 2. connectSocket(driverId, accessToken);
            onLogin();
          }} 
        />
      </View>
    </View>
  );
}
