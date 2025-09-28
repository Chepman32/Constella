import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  TextInput,
  Alert,
  Share,
  Modal,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import HapticFeedback from 'react-native-haptic-feedback';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  Layout,
  FadeInDown,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { databaseService } from '../services/DatabaseService';
import { Note } from '../types';
import { formatDate, truncateText, extractTextFromMarkdown } from '../utils';

interface NotesListScreenProps {
  navigation: any;
}

type ContextMenuState = {
  note: Note;
  position: {
    pageX: number;
    pageY: number;
  };
};

// We'll define this inside the component to access translations


const NotesListScreen: React.FC<NotesListScreenProps> = ({ navigation }) => {
  const { theme, themeName } = useTheme();
  const { t } = useLocalization();
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [contextMenuState, setContextMenuState] = useState<ContextMenuState | null>(null);
  const [menuLayout, setMenuLayout] = useState({ width: 0, height: 0 });
  const windowDimensions = useWindowDimensions();

  const searchOpacity = useSharedValue(0);
  const fabScale = useSharedValue(1);

  const CONTEXT_MENU_ACTIONS = [
    { id: 'copy', label: t('notes.actions.copy'), icon: '📋' },
    { id: 'share', label: t('notes.actions.share'), icon: '📤' },
    { id: 'favorite', label: t('notes.actions.favorite'), icon: '⭐️' },
    { id: 'delete', label: t('notes.actions.delete'), icon: '🗑️', destructive: true },
  ] as const;

  const loadNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      const allNotes = await databaseService.getAllNotes(searchQuery || undefined);
      setNotes(allNotes);
    } catch (error) {
      console.error('Failed to load notes:', error);
      Alert.alert(t('common.error'), t('errors.loadNotes'));
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, t]);

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [loadNotes])
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadNotes();
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery, loadNotes]);

  const toggleSearch = () => {
    const newSearchActive = !isSearchActive;
    setIsSearchActive(newSearchActive);
    searchOpacity.value = withTiming(newSearchActive ? 1 : 0, { duration: 300 });
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
        title: t('notes.newNote'),
        content: '',
        tags: [],
        lastModified: new Date(),
        created: new Date(),
      });

      navigation.navigate('Editor', { noteId });
    } catch (error) {
      console.error('Failed to create note:', error);
      Alert.alert(t('common.error'), t('errors.createNote'));
    }
  };

  const deleteNote = async (noteId: string) => {
    Alert.alert(
      t('notes.delete.title'),
      t('notes.delete.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.deleteNote(noteId);
              loadNotes();
            } catch (error) {
              console.error('Failed to delete note:', error);
              Alert.alert(t('common.error'), t('errors.deleteNote'));
            }
          },
        },
      ]
    );
  };

  const handleMenuAction = async (noteId: string, action: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    switch (action) {
      case 'copy':
        try {
          const textContent = note.title + '\n\n' + note.content;
          Clipboard.setString(textContent);
          HapticFeedback.trigger('impactLight');
        } catch (error) {
          console.error('Failed to copy note:', error);
        }
        break;

      case 'share':
        try {
          const textContent = note.title + '\n\n' + note.content;
          await Share.share({
            message: textContent,
            title: note.title,
          });
        } catch (error) {
          console.error('Failed to share note:', error);
        }
        break;

      case 'favorite':
        // TODO: Implement favorite functionality
        HapticFeedback.trigger('impactLight');
        Alert.alert(t('common.comingSoon'), t('common.comingSoonMessage'));
        break;

      case 'delete':
        deleteNote(noteId);
        break;
    }
  };

  const closeContextMenu = () => {
    setContextMenuState(null);
  };

  const openContextMenu = (note: Note, position: { pageX: number; pageY: number }) => {
    HapticFeedback.trigger('impactMedium');
    setContextMenuState({ note, position });
  };

  const handleContextMenuSelection = async (action: string) => {
    if (!contextMenuState) {
      return;
    }

    const { note } = contextMenuState;
    closeContextMenu();
    await handleMenuAction(note.id, action);
  };

  const menuPosition = useMemo(() => {
    if (!contextMenuState) {
      return { top: 0, left: 0 };
    }

    const { width: screenWidth, height: screenHeight } = windowDimensions;
    const estimatedWidth = menuLayout.width || 260;
    const estimatedHeight = menuLayout.height || 220;
    const margin = 16;
    const { pageX, pageY } = contextMenuState.position;

    const preferredTop = pageY + 12;
    const maximumTop = screenHeight - margin - estimatedHeight;
    let top = preferredTop;

    if (preferredTop > maximumTop) {
      top = pageY - estimatedHeight - 12;
      if (top < margin) {
        top = Math.max(margin, maximumTop);
      }
    } else if (top < margin) {
      top = margin;
    }

    let left = pageX - estimatedWidth / 2;
    if (left < margin) {
      left = margin;
    } else if (left > screenWidth - estimatedWidth - margin) {
      left = screenWidth - estimatedWidth - margin;
    }

    return { top, left };
  }, [contextMenuState, menuLayout, windowDimensions]);

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
        <Pressable
          onPress={() => navigation.navigate('Editor', { noteId: item.id })}
          onLongPress={(event) =>
            openContextMenu(item, {
              pageX: event.nativeEvent.pageX,
              pageY: event.nativeEvent.pageY,
            })
          }
          delayLongPress={250}
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
            <Text style={[styles.noteTitle, { color: theme.text }]}>
              {item.title || t('notes.untitled')}
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
        </Pressable>
      </Animated.View>
    );
  };

  const selectedNotePreview = useMemo(() => {
    if (!contextMenuState) {
      return '';
    }

    return extractTextFromMarkdown(contextMenuState.note.content);
  }, [contextMenuState]);

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
        {t('notes.empty.title')}
      </Text>
      <Text style={[styles.emptyStateSubtitle, { color: theme.textSecondary }]}>
        {t('notes.empty.subtitle')}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.openDrawer()}
          style={styles.actionButton}
        >
          <Text style={[styles.actionIcon, { color: theme.primary }]}>☰</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>{t('notes.title')}</Text>
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
          placeholder={t('notes.search')}
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

      <Modal
        visible={!!contextMenuState}
        transparent
        animationType="fade"
        onRequestClose={closeContextMenu}
      >
        <View style={styles.contextMenuWrapper}>
          <TouchableWithoutFeedback onPress={closeContextMenu}>
            <View style={[StyleSheet.absoluteFillObject, styles.contextMenuBackdrop]} />
          </TouchableWithoutFeedback>

          {contextMenuState && (
            <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
              <Animated.View
                entering={FadeInDown.duration(150)}
                style={[
                  styles.contextMenuContainer,
                  {
                    top: menuPosition.top,
                    left: menuPosition.left,
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                  },
                ]}
                onLayout={(event) => {
                  const { width, height } = event.nativeEvent.layout;
                  if (
                    menuLayout.width !== width ||
                    menuLayout.height !== height
                  ) {
                    setMenuLayout({ width, height });
                  }
                }}
              >
                <View style={styles.contextMenuPreview}>
                  <Text
                    style={[styles.contextMenuTitle, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {contextMenuState.note.title || t('notes.untitled')}
                  </Text>
                  <Text
                    style={[styles.contextMenuDate, { color: theme.textSecondary }]}
                  >
                    {formatDate(contextMenuState.note.lastModified)}
                  </Text>
                  {selectedNotePreview ? (
                    <Text
                      style={[styles.contextMenuContent, { color: theme.textSecondary }]}
                      numberOfLines={4}
                    >
                      {truncateText(selectedNotePreview, 200)}
                    </Text>
                  ) : (
                    <Text
                      style={[styles.contextMenuContent, { color: theme.textSecondary }]}
                      numberOfLines={2}
                    >
                      No details to show yet
                    </Text>
                  )}
                  {contextMenuState.note.tags.length > 0 && (
                    <View style={styles.contextMenuTags}>
                      {contextMenuState.note.tags.slice(0, 3).map((tag, tagIndex) => (
                        <View
                          key={tagIndex}
                          style={[styles.contextMenuTag, { backgroundColor: theme.accent + '20' }]}
                        >
                          <Text style={[styles.contextMenuTagText, { color: theme.accent }]}>
                            {tag}
                          </Text>
                        </View>
                      ))}
                      {contextMenuState.note.tags.length > 3 && (
                        <Text style={[styles.contextMenuMoreTags, { color: theme.textSecondary }]}>
                          +{contextMenuState.note.tags.length - 3}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
                <View style={[styles.contextMenuActions, { borderColor: theme.border }]}
                >
                  {CONTEXT_MENU_ACTIONS.map((action) => (
                    <Pressable
                      key={action.id}
                      onPress={() => handleContextMenuSelection(action.id)}
                      style={({ pressed }) => [
                        styles.contextMenuAction,
                        pressed && {
                          backgroundColor:
                            themeName === 'dark'
                              ? 'rgba(255, 255, 255, 0.08)'
                              : 'rgba(0, 0, 0, 0.06)',
                        },
                      ]}
                    >
                      <Text style={styles.contextMenuIcon}>{action.icon}</Text>
                      <Text
                        style={[
                          styles.contextMenuActionLabel,
                          { color: action.id === 'delete' ? '#d62d20' : theme.text },
                        ]}
                      >
                        {action.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Animated.View>
            </View>
          )}
        </View>
      </Modal>

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
  contextMenuWrapper: {
    flex: 1,
  },
  contextMenuBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  contextMenuContainer: {
    position: 'absolute',
    width: 280,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  contextMenuPreview: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  contextMenuTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  contextMenuDate: {
    fontSize: 12,
    marginBottom: 8,
  },
  contextMenuContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  contextMenuTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  contextMenuTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  contextMenuTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  contextMenuMoreTags: {
    fontSize: 12,
    fontStyle: 'italic',
    alignSelf: 'center',
    marginBottom: 4,
  },
  contextMenuActions: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  contextMenuAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  contextMenuIcon: {
    fontSize: 18,
  },
  contextMenuActionLabel: {
    fontSize: 16,
    marginLeft: 12,
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
