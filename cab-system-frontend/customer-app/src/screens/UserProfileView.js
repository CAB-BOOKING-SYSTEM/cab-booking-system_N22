import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const SavedLocationCard = ({ iconName, label, address, index }) => {
  return (
    <MotiView
      from={{ opacity: 0, translateX: -20 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'timing', duration: 400 + index * 100 }}
    >
      <TouchableOpacity style={styles.locationCard}>
        <MaterialCommunityIcons 
          name={iconName} 
          size={28} 
          color="#00B14F"
          style={styles.locationIcon}
        />
        <View style={styles.locationContent}>
          <Text style={styles.locationLabel}>{label}</Text>
          <Text style={styles.locationAddress}>{address}</Text>
        </View>
        <MaterialCommunityIcons 
          name="chevron-right" 
          size={24} 
          color="#d1d5db"
        />
      </TouchableOpacity>
    </MotiView>
  );
};

const MenuItem = ({ iconName, label, index }) => {
  return (
    <MotiView
      from={{ opacity: 0, translateX: -20 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'timing', duration: 400 + index * 100 }}
    >
      <TouchableOpacity style={styles.menuItem}>
        <MaterialCommunityIcons 
          name={iconName} 
          size={24} 
          color="#6b7280"
          style={styles.menuIcon}
        />
        <Text style={styles.menuLabel}>{label}</Text>
        <MaterialCommunityIcons 
          name="chevron-right" 
          size={24} 
          color="#d1d5db"
          style={{ marginLeft: 'auto' }}
        />
      </TouchableOpacity>
    </MotiView>
  );
};

export function ProfileScreen() {
  const [savedLocations] = useState([
    {
      id: 1,
      iconName: 'home',
      label: 'Home',
      address: '123 Main Street, City',
    },
    {
      id: 2,
      iconName: 'briefcase',
      label: 'Work',
      address: '456 Business Ave, Office',
    },
    {
      id: 3,
      iconName: 'map-marker',
      label: 'Recent',
      address: '789 Shopping Center, Mall',
    },
  ]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400 }}
      >
        <BlurView intensity={95}>
          <LinearGradient
            colors={['#00B14F', '#00a047']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <MotiView
                from={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'timing', duration: 500, delay: 100 }}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>DC</Text>
              </MotiView>
              <View style={{ marginLeft: 16, flex: 1 }}>
                <Text style={styles.userName}>Dong Cao</Text>
                <Text style={styles.userPhone}>090**567</Text>
                <View style={styles.badge}>
                  <View style={styles.badgeDot} />
                  <Text style={styles.badgeText}>Verified Member</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </BlurView>
      </MotiView>

      {/* Scroll Content */}
      <ScrollView style={styles.scrollView}>
        {/* Saved Locations */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 500, delay: 200 }}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Saved Locations</Text>
            <View style={styles.locationsList}>
              {savedLocations.map((location, index) => (
                <SavedLocationCard
                  key={location.id}
                  iconName={location.iconName}
                  label={location.label}
                  address={location.address}
                  index={index}
                />
              ))}
            </View>
          </View>
        </MotiView>

        {/* Account Menu */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 500, delay: 300 }}
        >
          <View style={[styles.section, styles.accountSection]}>
            <Text style={styles.sectionTitle}>Account</Text>
            <MenuItem iconName="cog" label="Settings" index={0} />
            <MenuItem iconName="help-circle" label="Help & Support" index={1} />
            <MenuItem iconName="information" label="About" index={2} />
          </View>
        </MotiView>

        {/* Logout Button */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 400 }}
          style={styles.logoutContainer}
        >
          <TouchableOpacity 
            style={styles.logoutButtonWrapper}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#00B14F', '#00d963']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoutButtonGradient}
            >
              {/* <View style={styles.logoutButton}>
                <MaterialCommunityIcons 
                  name="logout" 
                  size={20} 
                  color="#ffffff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.logoutButtonText}>ĐĂNG XUẤT</Text>
              </View> */}
            </LinearGradient>
            {/* Neon glow effect */}
            <View style={styles.neonGlow} />
          </TouchableOpacity>
        </MotiView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
    paddingBottom: 20,
  },
  headerGradient: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#ffffff',
    backgroundColor: '#86efac',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userPhone: {
    fontSize: 13,
    color: '#d1fae5',
    marginTop: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#ffffff',
  },
  badgeText: {
    fontSize: 11,
    color: '#d1fae5',
    marginLeft: 6,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  accountSection: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  locationsList: {
    gap: 10,
  },
  // Location Card Styles
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 8,
  },
  locationIcon: {
    marginRight: 12,
  },
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  locationAddress: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  // Menu Item Styles
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuIcon: {
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '500',
    flex: 1,
  },
  // Logout Button Styles
  logoutContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  logoutButtonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  logoutButtonGradient: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  neonGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#00B14F',
    opacity: 0.2,
    borderRadius: 12,
    shadowColor: '#00B14F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
  },
});

