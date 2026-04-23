import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import axios from 'axios';

import { RideCard } from '../components/RideCard';
import { BlurView } from '../shims/ui';

const FILTER_OPTIONS = ['All', 'Completed', 'Cancelled'];

const mockDriverRideData = [
  {
    id: 1,
    date: 'Today at 2:45 PM',
    pickupLocation: '123 Main St',
    dropoffLocation: '456 Business Ave',
    amount: 12.5,
    earnings: 10,
    status: 'Completed',
  },
  {
    id: 2,
    date: 'Today at 11:15 AM',
    pickupLocation: '789 Park Ave',
    dropoffLocation: '321 Center St',
    amount: 18.75,
    earnings: 15,
    status: 'Completed',
  },
  {
    id: 3,
    date: 'Yesterday at 6:45 PM',
    pickupLocation: '555 Oak Rd',
    dropoffLocation: '999 Pine St',
    amount: 9.25,
    earnings: 0,
    status: 'Cancelled',
  },
  {
    id: 4,
    date: '2 days ago at 11:20 AM',
    pickupLocation: '111 Elm St',
    dropoffLocation: '222 Maple Ave',
    amount: 15,
    earnings: 12,
    status: 'Completed',
  },
  {
    id: 5,
    date: '3 days ago at 4:00 PM',
    pickupLocation: '333 Cedar Ln',
    dropoffLocation: '444 Birch Rd',
    amount: 22,
    earnings: 17.6,
    status: 'Completed',
  },
];

const FilterBar = ({ selectedFilter, onFilterChange }) => (
  <View style={styles.filterBar}>
    {FILTER_OPTIONS.map((filter) => {
      const active = selectedFilter === filter;
      return (
        <TouchableOpacity
          key={filter}
          onPress={() => onFilterChange(filter)}
          style={[styles.filterButton, active ? styles.filterButtonActive : styles.filterButtonInactive]}
        >
          <Text style={[styles.filterButtonText, active ? styles.filterButtonTextActive : styles.filterButtonTextInactive]}>
            {filter}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const EarningsSummary = ({ completedRides, totalEarnings }) => (
  <View style={styles.summaryWrapper}>
    <BlurView intensity={85} tint="light" style={styles.summaryBlur}>
      <View style={styles.summaryCard}>
        <View>
          <Text style={styles.summaryLabel}>Today's Earnings</Text>
          <Text style={styles.summaryValue}>${totalEarnings.toFixed(2)}</Text>
          <Text style={styles.summaryMeta}>
            {completedRides} completed ride{completedRides !== 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.summaryIcon}>
          <Text style={styles.summaryIconText}>$</Text>
        </View>
      </View>
    </BlurView>
  </View>
);

export const DriverRideHistoryScreen = () => {
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDriverRideHistory = async () => {
      try {
        setLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 800));
        setRides(mockDriverRideData);
        setError(null);
      } catch (err) {
        setError('Failed to load ride history');
        console.error('Error fetching rides:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDriverRideHistory();
  }, []);

  const filteredRides = rides.filter((ride) => {
    if (selectedFilter === 'All') return true;
    return ride.status.toLowerCase() === selectedFilter.toLowerCase();
  });

  const completedRides = filteredRides.filter((ride) => ride.status.toLowerCase() === 'completed').length;
  const totalEarnings = filteredRides.reduce((sum, ride) => sum + ride.earnings, 0);

  const handleRidePress = (ride) => {
    console.log('Driver ride pressed:', ride);
  };

  return (
    <SafeAreaView style={styles.container}>
      <BlurView intensity={90} tint="light" style={styles.topBar}>
        <View style={styles.topBarContent}>
          <Text style={styles.topBarTitle}>My Rides</Text>
        </View>
      </BlurView>

      {!loading && !error ? (
        <EarningsSummary completedRides={completedRides} totalEarnings={totalEarnings} />
      ) : null}

      <FilterBar selectedFilter={selectedFilter} onFilterChange={setSelectedFilter} />

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#00B14F" />
          <Text style={styles.helperText}>Loading rides...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : filteredRides.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={styles.emptyText}>
            No {selectedFilter.toLowerCase() === 'all' ? 'rides' : selectedFilter.toLowerCase()} rides found
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {filteredRides.map((ride) => (
            <RideCard
              key={ride.id}
              date={ride.date}
              pickupLocation={ride.pickupLocation}
              dropoffLocation={ride.dropoffLocation}
              amount={ride.amount}
              earnings={ride.earnings}
              status={ride.status}
              isDriver
              onPress={() => handleRidePress(ride)}
            />
          ))}
        </ScrollView>
      )}

      <BlurView intensity={90} tint="light" style={styles.bottomBar}>
        <View style={styles.bottomBarContent}>
          <TouchableOpacity style={styles.bottomItem}>
            <Text style={styles.bottomIcon}>P</Text>
            <Text style={styles.bottomLabel}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bottomItem}>
            <Text style={styles.bottomIcon}>H</Text>
            <Text style={[styles.bottomLabel, styles.bottomLabelActive]}>History</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </SafeAreaView>
  );
};

void axios;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topBar: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  topBarContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  topBarTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  summaryWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  summaryBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  summaryCard: {
    padding: 20,
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dcfce7',
  },
  summaryValue: {
    marginTop: 8,
    fontSize: 30,
    fontWeight: '700',
    color: '#ffffff',
  },
  summaryMeta: {
    marginTop: 8,
    fontSize: 12,
    color: '#dcfce7',
  },
  summaryIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  summaryIconText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#ffffff',
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
  },
  filterButtonActive: {
    backgroundColor: '#22c55e',
  },
  filterButtonInactive: {
    backgroundColor: '#e5e7eb',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  filterButtonTextInactive: {
    color: '#374151',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  helperText: {
    marginTop: 12,
    color: '#4b5563',
  },
  errorText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  bottomBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  bottomItem: {
    flex: 1,
    alignItems: 'center',
  },
  bottomIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  bottomLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  bottomLabelActive: {
    color: '#22c55e',
  },
});
