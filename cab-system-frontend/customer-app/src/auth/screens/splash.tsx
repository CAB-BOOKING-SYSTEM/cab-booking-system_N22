import React, { useState } from 'react';
import { Dimensions, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

const slides = [
  {
    id: 1,
    title: 'Đặt xe nhanh chóng',
    description: 'Đặt chuyến đi trong vài giây. Tài xế đến đón nhanh.',
    emoji: '🚗',
    bgColor: '#4F8EF7',
  },
  {
    id: 2,
    title: 'An toàn và tin cậy',
    description: 'Tài xế được xác minh. Hành trình luôn được theo dõi.',
    emoji: '🛡️',
    bgColor: '#7C5CBF',
  },
  {
    id: 3,
    title: 'Thanh toán linh hoạt',
    description: 'Nhiều phương thức thanh toán, hóa đơn rõ ràng.',
    emoji: '💳',
    bgColor: '#E05C8A',
  },
];

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const SplashScreen: React.FC<Props> = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const slide = slides[currentIndex];

  const onNext = (): void => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }
    navigation.navigate('SignIn');
  };

  return (
    <View style={[styles.container, { backgroundColor: slide.bgColor }]}>
      <StatusBar barStyle="light-content" backgroundColor={slide.bgColor} />

      {currentIndex < slides.length - 1 ? (
        <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.navigate('SignIn')}>
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
            <View key={item.id} style={[styles.dot, index === currentIndex ? styles.dotActive : null]} />
          ))}
        </View>

        <TouchableOpacity style={styles.nextBtn} onPress={onNext}>
          <Text style={styles.nextText}>{currentIndex < slides.length - 1 ? 'Tiếp theo' : 'Bắt đầu'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  skipBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  skipText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  emoji: { fontSize: 100 },
  title: { fontSize: 28, color: '#fff', textAlign: 'center', fontWeight: '700' },
  description: {
    maxWidth: width - 50,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
  },
  footer: { alignItems: 'center', gap: 32 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotActive: { width: 24, backgroundColor: '#fff' },
  nextBtn: {
    backgroundColor: '#fff',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 32,
    alignItems: 'center',
  },
  nextText: { color: '#1f2937', fontWeight: '700', fontSize: 16 },
});

export default SplashScreen;
