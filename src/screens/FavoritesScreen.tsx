import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { Layout, FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { databaseService } from '../services/DatabaseService';
import { Note } from '../types';
import { formatDate, truncateText, extractTextFromMarkdown } from '../utils';

interface FavoritesScreenProps {
  navigation: any;
}

const FavoritesScreen: React.FC<FavoritesScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const [favoriteNotes, setFavoriteNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadFavoriteNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      // For now, we'll show all notes since favorite functionality isn't implemented yet
      // TODO: Replace with actual favorite notes query when implemented
      const allNotes = await databaseService.getAllNotes();
      // Simulate favorite notes by taking the first 3 notes
      setFavoriteNotes(allNotes.slice(0, 3));
    } catch (error) {
      console.error('Failed to load favorite notes:', error);
      Alert.alert('Error', 'Failed to load favorite notes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFavoriteNotes();
    }, [loadFavoriteNotes])
  );

  const removeFavorite = async (noteId: string) => {
    Alert.alert(
      'Remove Favorite',
      'Remove this note from favorites?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement actual favorite removal
            setFavoriteNotes(prev => prev.filter(note => note.id !== noteId));
          },
        },
      ]
    );
  };

  const renderFavoriteItem = ({ item, index }: { item: Note; index: number }) => {
    const preview = extractTextFromMarkdown(item.content);

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 100)}
        layout={Layout.springify()}
      >
        <Pressable
          onPress={() => navigation.navigate('Editor', { noteId: item.id })}
          style={({ pressed }) => [
            styles.noteCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              opacity: pressed ? 0.95 : 1,
            },
          ]}
        >
          <View style={styles.noteHeader}>
            <View style={styles.noteTitle}>
              <Text style={[styles.favoriteIcon, { color: theme.accent }]}>⭐️</Text>
              <Text style={[styles.noteText, { color: theme.text }]} numberOfLines={1}>
                {item.title || 'Untitled'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => removeFavorite(item.id)}
              style={styles.removeButton}
            >
              <Text style={[styles.removeIcon, { color: theme.textSecondary }]}>×</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.noteDate, { color: theme.textSecondary }]}>
            {formatDate(item.lastModified)}
          </Text>

          {preview && (
            <Text style={[styles.notePreview, { color: theme.textSecondary }]}>
              {truncateText(preview, 120)}
            </Text>
          )}

          {item.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {item.tags.slice(0, 3).map((tag, tagIndex) => (
                <View
                  key={tagIndex}
                  style={[styles.tag, { backgroundColor: theme.accent + '20' }]}
                >
                  <Text style={[styles.tagText, { color: theme.accent }]}>
                    {tag}
                  </Text>
                </View>
              ))}
              {item.tags.length > 3 && (
                <Text style={[styles.moreTagsText, { color: theme.textSecondary }]}>
                  +{item.tags.length - 3}
                </Text>
              )}
            </View>
          )}
        </Pressable>
      </Animated.View>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>⭐️</Text>
      <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
        No favorites yet
      </Text>
      <Text style={[styles.emptyStateSubtitle, { color: theme.textSecondary }]}>
        Star your favorite notes to see them here
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backIcon, { color: theme.primary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Favorites</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={favoriteNotes}
        renderItem={renderFavoriteItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          favoriteNotes.length === 0 && styles.emptyListContainer,
        ]}
        ListEmptyComponent={!isLoading ? EmptyState : null}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  noteCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  noteTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  favoriteIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  noteText: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  removeButton: {
    padding: 4,
  },
  removeIcon: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  noteDate: {
    fontSize: 12,
    marginBottom: 8,
  },
  notePreview: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default FavoritesScreen;