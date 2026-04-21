// src/features/booking/components/PlaceList/PlaceItem.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface PlaceItemProps {
  place: any;
  onPress: (place: any) => void;
}

export const PlaceItem: React.FC<PlaceItemProps> = ({ place, onPress }) => {
  const getMainText = () => {
    if (place.structured_formatting) {
      return place.structured_formatting.main_text;
    }
    return place.name || 'Unknown';
  };

  const getSecondaryText = () => {
    if (place.structured_formatting) {
      return place.structured_formatting.secondary_text;
    }
    return place.vicinity || place.formatted_address || '';
  };

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(place)}>
      <Icon name="place" size={20} color="#666" />
      <View style={styles.infoContainer}>
        <Text style={styles.mainText}>{getMainText()}</Text>
        <Text style={styles.secondaryText} numberOfLines={1}>
          {getSecondaryText()}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoContainer: {
    marginLeft: 15,
    flex: 1,
  },
  mainText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 3,
  },
  secondaryText: {
    fontSize: 13,
    color: '#666',
  },
});