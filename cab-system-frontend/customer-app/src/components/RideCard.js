import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from '../shims/ui';

const getStatusStyle = (status) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return styles.statusCompleted;
    case 'cancelled':
      return styles.statusCancelled;
    case 'ongoing':
      return styles.statusOngoing;
    default:
      return styles.statusDefault;
  }
};

export const RideCard = ({
  date,
  pickupLocation,
  dropoffLocation,
  amount,
  status,
  isDriver = false,
  earnings,
  onPress,
}) => {
  const statusStyle = getStatusStyle(status);

  return (
    <BlurView intensity={80} tint="light" style={styles.wrapper}>
      <TouchableOpacity onPress={onPress} style={styles.card} activeOpacity={0.7}>
        <View style={styles.routeSection}>
          <View style={styles.routeRail}>
            <View style={[styles.routeDot, styles.pickupDot]} />
            <View style={styles.routeLine} />
            <View style={[styles.routeDot, styles.dropoffDot]} />
          </View>

          <View style={styles.locations}>
            <Text style={styles.locationText}>{pickupLocation}</Text>
            <View style={styles.locationSpacer} />
            <Text style={styles.locationText}>{dropoffLocation}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View>
            <Text style={styles.dateText}>{date}</Text>
            <Text style={styles.amountText}>${amount.toFixed(2)}</Text>
          </View>

          <View style={styles.badges}>
            {isDriver && typeof earnings === 'number' ? (
              <View style={[styles.badge, styles.earningsBadge]}>
                <Text style={[styles.badgeText, styles.earningsText]}>+${earnings.toFixed(2)}</Text>
              </View>
            ) : null}

            <View style={[styles.badge, statusStyle.badge]}>
              <Text style={[styles.badgeText, statusStyle.text]}>{status}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  card: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  routeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  routeRail: {
    alignItems: 'center',
    marginRight: 12,
    paddingTop: 4,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pickupDot: {
    backgroundColor: '#22c55e',
  },
  dropoffDot: {
    backgroundColor: '#ef4444',
  },
  routeLine: {
    width: 2,
    height: 48,
    backgroundColor: '#d1d5db',
    marginVertical: 2,
  },
  locations: {
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  locationSpacer: {
    height: 32,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  dateText: {
    fontSize: 12,
    color: '#4b5563',
  },
  amountText: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  earningsBadge: {
    backgroundColor: '#f0fdf4',
  },
  earningsText: {
    color: '#16a34a',
  },
  statusCompleted: {
    badge: { backgroundColor: '#dcfce7' },
    text: { color: '#15803d' },
  },
  statusCancelled: {
    badge: { backgroundColor: '#fee2e2' },
    text: { color: '#b91c1c' },
  },
  statusOngoing: {
    badge: { backgroundColor: '#dbeafe' },
    text: { color: '#1d4ed8' },
  },
  statusDefault: {
    badge: { backgroundColor: '#f3f4f6' },
    text: { color: '#374151' },
  },
});
