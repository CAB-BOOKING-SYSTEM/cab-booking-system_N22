import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CommonActions } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { RootStackParamList } from "../types/navigation";

const slides = [
  {
    id: 1,
    title: "Đặt xe nhanh chóng",
    description: "Đặt chuyến đi trong vài giây. Tài xế đến đón nhanh.",
    emoji: "CAR",
    bgColor: "#4F8EF7",
  },
  {
    id: 2,
    title: "An toàn và tin cậy",
    description: "Tài xế được xác minh. Hành trình luôn được theo dõi.",
    emoji: "SAFE",
    bgColor: "#7C5CBF",
  },
  {
    id: 3,
    title: "Thanh toán linh hoạt",
    description: "Nhiều phương thức thanh toán, hóa đơn rõ ràng.",
    emoji: "PAY",
    bgColor: "#E05C8A",
  },
];

type Props = NativeStackScreenProps<RootStackParamList, "Splash">;

const SplashScreen: React.FC<Props> = ({ navigation, route }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const postLogin = route.params?.postLogin ?? false;
  const successMessage = route.params?.successMessage ?? "Đăng nhập thành công";
  const slide = useMemo(() => slides[currentIndex], [currentIndex]);

  useEffect(() => {
    if (!postLogin) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      const parentNavigation = navigation.getParent();

      if (!parentNavigation) {
        return;
      }

      parentNavigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Home" }],
        })
      );
    }, 1200);

    return () => clearTimeout(timeout);
  }, [navigation, postLogin]);

  const onNext = (): void => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    navigation.navigate("SignIn");
  };

  if (postLogin) {
    return (
      <View
        style={[styles.container, styles.centered, { backgroundColor: "#4F8EF7" }]}
      >
        <StatusBar barStyle="light-content" backgroundColor="#4F8EF7" />
        <Text style={styles.loadingLogo}>CAB</Text>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingTitle}>Đăng nhập thành công</Text>
        <Text style={styles.loadingDescription}>{successMessage}</Text>
        <Text style={styles.loadingHint}>Đang chuyển sang trang đặt xe...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: slide.bgColor }]}>
      <StatusBar barStyle="light-content" backgroundColor={slide.bgColor} />

      {currentIndex < slides.length - 1 ? (
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => navigation.navigate("SignIn")}
        >
          <Text style={styles.skipText}>Bỏ qua</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.content}>
        <Text style={styles.emoji}>{slide.emoji}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((item, index) => (
            <View
              key={item.id}
              style={[styles.dot, index === currentIndex ? styles.dotActive : null]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.nextBtn} onPress={onNext}>
          <Text style={styles.nextText}>
            {currentIndex < slides.length - 1 ? "Tiếp theo" : "Bắt đầu"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingLogo: {
    fontSize: 34,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 12,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
  },
  loadingDescription: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
    textAlign: "center",
  },
  loadingHint: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 14,
    textAlign: "center",
  },
  skipBtn: {
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  skipText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  content: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20 },
  emoji: { fontSize: 48, fontWeight: "800", color: "#fff" },
  title: { fontSize: 28, color: "#fff", textAlign: "center", fontWeight: "700" },
  description: {
    maxWidth: width - 50,
    color: "rgba(255,255,255,0.88)",
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
  },
  footer: { alignItems: "center", gap: 32 },
  dots: { flexDirection: "row", gap: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  dotActive: { width: 24, backgroundColor: "#fff" },
  nextBtn: {
    backgroundColor: "#fff",
    width: "100%",
    paddingVertical: 16,
    borderRadius: 32,
    alignItems: "center",
  },
  nextText: { color: "#1f2937", fontWeight: "700", fontSize: 16 },
});

export default SplashScreen;
