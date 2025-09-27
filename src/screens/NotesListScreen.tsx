import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Layout,
  FadeInDown,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { databaseService } from '../services/DatabaseService';
import { Note } from '../types';
import { formatDate, truncateText, extractTextFromMarkdown } from '../utils';

interface NotesListScreenProps {
  navigation: any;
}

const { width } = Dimensions.get('window');

const NotesListScreen: React.FC<NotesListScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const searchOpacity = useSharedValue(0);
  const fabScale = useSharedValue(1);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      const allNotes = await databaseService.getAllNotes(searchQuery || undefined);
      setNotes(allNotes);
    } catch (error) {
      console.error('Failed to load notes:', error);
      Alert.alert('Error', 'Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = useCallback(
    debounce((query: string) => {
      loadNotes();
    }, 300),
    []
  );

  useEffect(() => {
    handleSearch(searchQuery);
  }, [searchQuery, handleSearch]);

  const toggleSearch = () => {
    setIsSearchActive(!isSearchActive);
    searchOpacity.value = withTiming(isSearchActive ? 0 : 1, { duration: 300 });
    if (isSearchActive) {
      setSearchQuery('');
    }
  };

  const createNewNote = async () => {
    try {
      fabScale.value = withSequence(
        withSpring(0.8, { damping: 8 }),
        withSpring(1, { damping: 8 })
      );

      const noteId = await databaseService.createNote({
        title: 'New Note',
        content: '',
        tags: [],
        lastModified: new Date(),
        created: new Date(),
      });

      navigation.navigate('Editor', { noteId });
    } catch (error) {
      console.error('Failed to create note:', error);
      Alert.alert('Error', 'Failed to create note');
    }
  };

  const deleteNote = async (noteId: string) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.deleteNote(noteId);
              loadNotes();
            } catch (error) {
              console.error('Failed to delete note:', error);
              Alert.alert('Error', 'Failed to delete note');
            }
          },
        },
      ]
    );
  };

  const searchAnimatedStyle = useAnimatedStyle(() => ({
    opacity: searchOpacity.value,
    transform: [
      {
        translateY: withTiming(isSearchActive ? 0 : -50, { duration: 300 }),
      },
    ],
  }));

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const renderNoteItem = ({ item, index }: { item: Note; index: number }) => {
    const preview = extractTextFromMarkdown(item.content);

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 100)}
        layout={Layout.springify()}
      >
        <TouchableOpacity
          style={[styles.noteCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => navigation.navigate('Editor', { noteId: item.id })}
          onLongPress={() => deleteNote(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.noteHeader}>
            <Text style={[styles.noteTitle, { color: theme.text }]}>
              {item.title || 'Untitled'}
            </Text>
            <Text style={[styles.noteDate, { color: theme.textSecondary }]}>
              {formatDate(item.lastModified)}
            </Text>
          </View>

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
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
        No notes yet
      </Text>
      <Text style={[styles.emptyStateSubtitle, { color: theme.textSecondary }]}>
        Tap the + button to create your first note
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Notes</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Canvas')}
            style={styles.actionButton}
          >
            <Text style={[styles.actionIcon, { color: theme.primary }]}>🗺️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleSearch} style={styles.actionButton}>
            <Text style={[styles.actionIcon, { color: theme.primary }]}>🔍</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View style={[styles.searchContainer, searchAnimatedStyle]}>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: theme.surface,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          placeholder="Search notes..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus={isSearchActive}
        />
      </Animated.View>

      <FlatList
        data={notes}
        renderItem={renderNoteItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          notes.length === 0 && styles.emptyListContainer,
        ]}
        ListEmptyComponent={!isLoading ? EmptyState : null}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => {
          if (isSearchActive) {
            toggleSearch();
          }
        }}
      />

      <Animated.View style={[styles.fab, fabAnimatedStyle]}>
        <TouchableOpacity
          style={[styles.fabButton, { backgroundColor: theme.primary }]}
          onPress={createNewNote}
          activeOpacity={0.8}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

// Utility function for debouncing search
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Animation sequence helper
function withSequence(...animations: any[]) {
  return animations.reduce((acc, animation, index) => {
    if (index === 0) return animation;
    return acc;
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  actionIcon: {
    fontSize: 20,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInput: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    fontSize: 16,
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
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  noteDate: {
    fontSize: 12,
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
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
  },
  fabButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default NotesListScreen;