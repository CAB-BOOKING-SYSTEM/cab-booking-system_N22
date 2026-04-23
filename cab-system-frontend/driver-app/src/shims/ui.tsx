import React from 'react';
import { View } from 'react-native';

export function BlurView({ children, style }) {
  return <View style={style}>{children}</View>;
}

export function LinearGradient({ children, colors = [], style }) {
  const backgroundColor = Array.isArray(colors) && colors.length > 0 ? colors[0] : 'transparent';
  return <View style={[{ backgroundColor }, style]}>{children}</View>;
}

export function MotiView({ children, style }) {
  return <View style={style}>{children}</View>;
}
