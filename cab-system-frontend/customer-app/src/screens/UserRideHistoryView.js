import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { bookingService } from '../services/api';

const FILTER_OPTIONS = ['All', 'Completed', 'Cancelled'];

// Fallback mock data for testing
const FALLBACK_RIDES = [
  {
    id: 1,
    date: 'Today at 2:45 PM',
    pickupLocation: '123 Main St',
    dropoffLocation: '456 Business Ave',
    amount: 12.50,
    status: 'Completed',
  },
  {
    id: 2,
    date: 'Yesterday at 5:20 PM',
    pickupLocation: '789 Park Ave',
    dropoffLocation: '321 Center St',
    amount: 18.75,
    status: 'Completed',
  },
  {
    id: 3,
    date: '2 days ago at 10:15 AM',
    pickupLocation: '555 Oak Rd',
    dropoffLocation: '999 Pine St',
    amount: 9.25,
    status: 'Cancelled',
  },
];

const RideCard = ({ ride, isSelected, onPress, index, role = 'Customer' }) => {
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return { bg: '#d1fae5', text: '#047857', gradientStart: '#dcfce7', gradientEnd: '#bbf7d0' };
      case 'cancelled':
        return { bg: '#fee2e2', text: '#dc2626', gradientStart: '#fecaca', gradientEnd: '#fca5a5' };
      default:
        return { bg: '#f3f4f6', text: '#4b5563', gradientStart: '#f3f4f6', gradientEnd: '#e5e7eb' };
    }
  };

  const statusColor = getStatusColor(ride.status);
  const earnings = ride.amount * 0.8; // Driver gets 80% of ride cost

  return (
    <MotiView
      from={{
        opacity: 0,
        translateY: 20,
      }}
      animate={{
        opacity: 1,
        translateY: 0,
      }}
      transition={{
        type: 'timing',
        duration: 500 + index * 100,
      }}
      style={styles.motiContainer}
    >
      <TouchableOpacity 
        onPress={onPress}
        activeOpacity={0.9}
        style={[
          styles.rideCard,
          isSelected && styles.rideCardSelected
        ]}
      >
        <MotiView
          animate={{
            scale: isSelected ? 1.02 : 1,
          }}
          transition={{
            type: 'timing',
            duration: 300,
          }}
        >
          <BlurView intensity={85} style={styles.blurContainer}>
            <LinearGradient
              colors={isSelected ? ['#f0fdf4', '#f9fce8'] : ['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.88)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              {/* Route Section */}
              <View style={styles.routeSection}>
                <View style={styles.dotsColumn}>
                  <View style={styles.dotGreen} />
                  <View style={styles.line} />
                  <View style={styles.dotRed} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationText}>{ride.pickupLocation}</Text>
                  <View style={{ height: 24 }} />
                  <Text style={styles.locationText}>{ride.dropoffLocation}</Text>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Footer */}
              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.dateText}>{ride.date}</Text>
                  {role === 'Customer' ? (
                    <Text style={styles.amountText}>${ride.amount.toFixed(2)}</Text>
                  ) : (
                    <View>
                      <Text style={styles.amountText}>${ride.amount.toFixed(2)}</Text>
                      <LinearGradient
                        colors={['#10b981', '#34d399']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.earningsBox}
                      >
                        <Text style={styles.earningsLabel}>Earnings</Text>
                        <Text style={styles.earningsAmount}>${earnings.toFixed(2)}</Text>
                      </LinearGradient>
                    </View>
                  )}
                </View>
                <LinearGradient
                  colors={[statusColor.gradientStart, statusColor.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statusBadge}
                >
                  <Text style={[styles.statusText, { color: statusColor.text }]}>
                    {ride.status}
                  </Text>
                </LinearGradient>
              </View>
            </LinearGradient>
          </BlurView>
        </MotiView>
      </TouchableOpacity>
    </MotiView>
  );
};

export function RideHistoryScreen({ role = 'Customer' }) {
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRideId, setSelectedRideId] = useState(null);
  const [error, setError] = useState(null);

  // Format booking data to ride card format
  const formatBookingToRide = (booking) => {
    return {
      id: booking._id || booking.id,
      date: new Date(booking.createdAt || Date.now()).toLocaleDateString(),
      pickupLocation: booking.pickupLocation?.address || 'Unknown Location',
      dropoffLocation: booking.dropoffLocation?.address || 'Unknown Destination',
      amount: booking.estimatedFare || 0,
      status: booking.status === 'completed' ? 'Completed' : booking.status === 'cancelled' ? 'Cancelled' : 'Pending',
    };
  };

  // Fetch rides from booking service
  useEffect(() => {
    const fetchRides = async () => {
      try {
        setLoading(true);
        const bookings = await bookingService.getMyBookings();
        
        // Convert bookings to rides format
        const formattedRides = Array.isArray(bookings)
          ? bookings.map(formatBookingToRide)
          : [formatBookingToRide(bookings)];
        
        setRides(formattedRides);
        setError(null);
      } catch (err) {
        console.error('Error fetching rides:', err);
        setError(err.message);
        // Fallback to mock data
        setRides(FALLBACK_RIDES);
      } finally {
        setLoading(false);
      }
    };

    fetchRides();
  }, []);

  const filteredRides = rides.filter((ride) => {
    if (selectedFilter === 'All') return true;
    return ride.status.toLowerCase() === selectedFilter.toLowerCase();
  });

  const handleRidePress = (rideId) => {
    setSelectedRideId(selectedRideId === rideId ? null : rideId);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <MotiView
        from={{ opacity: 0, translateY: -10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400 }}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Hoạt động</Text>
        </View>
      </MotiView>

      {/* Filter Bar */}
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 500, delay: 100 }}
      >
        <View style={styles.filterBar}>
          {FILTER_OPTIONS.map((filter) => (
            <MotiView
              key={filter}
              animate={{
                scale: selectedFilter === filter ? 1 : 1,
              }}
              transition={{ type: 'timing', duration: 200 }}
            >
              <TouchableOpacity
                onPress={() => setSelectedFilter(filter)}
                style={[
                  styles.filterButton,
                  selectedFilter === filter
                    ? styles.filterButtonActive
                    : styles.filterButtonInactive,
                ]}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    selectedFilter === filter
                      ? styles.filterButtonTextActive
                      : styles.filterButtonTextInactive,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            </MotiView>
          ))}
        </View>
      </MotiView>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContent}>
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 400 }}
          >
            <ActivityIndicator size="large" color="#00B14F" />
            <Text style={styles.loadingText}>Loading rides...</Text>
          </MotiView>
        </View>
      ) : filteredRides.length === 0 ? (
        <View style={styles.centerContent}>
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'timing', duration: 400 }}
          >
            <Text style={styles.emptyText}>No rides found</Text>
          </MotiView>
        </View>
      ) : (
        <ScrollView style={styles.ridesList}>
          {filteredRides.map((ride, index) => (
            <RideCard 
              key={ride.id} 
              ride={ride}
              isSelected={selectedRideId === ride.id}
              onPress={() => handleRidePress(ride.id)}
              index={index}
              role={role}
            />
          ))}
          <View style={{ height: 16 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterButtonActive: {
    backgroundColor: '#00B14F',
  },
  filterButtonInactive: {
    backgroundColor: '#e5e7eb',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  filterButtonTextInactive: {
    color: '#6b7280',
  },
  ridesList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  motiContainer: {
    marginBottom: 12,
  },
  rideCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  rideCardSelected: {
    borderWidth: 2,
    borderColor: '#00B14F',
  },
  blurContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 16,
  },
  routeSection: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dotsColumn: {
    alignItems: 'center',
    marginRight: 12,
    paddingTop: 2,
  },
  dotGreen: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
  },
  dotRed: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
  },
  line: {
    width: 2,
    height: 48,
    backgroundColor: '#d1d5db',
    marginVertical: 4,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 12,
  },
  emptyText: {
    color: '#9ca3af',
    textAlign: 'center',
  },
  // Earnings Styles
  earningsBox: {
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  earningsLabel: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
  },
  earningsAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 2,
  },
});

