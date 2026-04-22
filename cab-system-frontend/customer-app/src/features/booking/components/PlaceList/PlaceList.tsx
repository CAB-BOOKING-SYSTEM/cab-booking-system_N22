// src/features/booking/components/PlaceList/PlaceList.tsx
import React from 'react';
import { FlatList, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { PlaceItem } from './PlaceItem';

interface PlaceListProps {
  data: any[];
  onSelectPlace: (place: any) => void;
  loading?: boolean;
}

export const PlaceList: React.FC<PlaceListProps> = ({ 
  data, 
  onSelectPlace, 
  loading = false 
}) => {
  const renderHeader = (title: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    // Nếu item có type là 'header', render header
    if (item.type === 'header') {
      return renderHeader(item.title);
    }
    
    // Ngược lại render PlaceItem
    return <PlaceItem place={item} onPress={onSelectPlace} />;
  };

  const keyExtractor = (item: any, index: number): string => {
    if (item.type === 'header') {
      return `header-${index}`;
    }
    return item.place_id || `item-${index}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Đang tìm kiếm...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F9F9F9',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
  },
});