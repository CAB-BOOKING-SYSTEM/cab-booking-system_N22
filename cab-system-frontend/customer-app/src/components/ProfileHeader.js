import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BlurView } from '../shims/ui';

export const ProfileHeader = ({ userName = 'Dong Cao', phoneNumber = '090**567' }) => {
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <BlurView intensity={95} tint="light" style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>{initials}</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.phoneNumber}>{phoneNumber}</Text>
            <View style={styles.badge}>
              <View style={styles.badgeDot} />
              <Text style={styles.badgeText}>Verified Member</Text>
            </View>
          </View>
        </View>
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  header: {
    width: '100%',
    backgroundColor: 'rgba(34, 197, 94, 0.8)',
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: '#4ade80',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff',
  },
  content: {
    marginLeft: 20,
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  phoneNumber: {
    marginTop: 4,
    fontSize: 14,
    color: '#dcfce7',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  badgeText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#dcfce7',
  },
});
