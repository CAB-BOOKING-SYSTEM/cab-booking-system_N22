import React, { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface AuthCardProps {
  title: string;
  subtitle: string;
}

const AuthCard: React.FC<PropsWithChildren<AuthCardProps>> = ({ title, subtitle, children }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 14,
    fontSize: 14,
    color: '#6b7280',
  },
  content: {
    gap: 14,
  },
});

export default AuthCard;