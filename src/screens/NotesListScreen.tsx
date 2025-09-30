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
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { databaseService } from '../services/DatabaseService';
import { Note, Folder } from '../types';
import { formatDate, truncateText, extractTextFromMarkdown } from '../utils';
import FolderPicker from '../components/FolderPicker';

interface NotesListScreenProps {
  navigation: any;
  route: any;
}

type ContextMenuState = {
  note: Note;
  position: {
    pageX: number;
    pageY: number;
  };
};

// We'll define this inside the component to access translations


const NotesListScreen: React.FC<NotesListScreenProps> = ({ navigation, route }) => {
  const { theme, themeName } = useTheme();
  const { t } = useLocalization();
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [currentFolderName, setCurrentFolderName] = useState<string>(t('folders.allNotes'));
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPullingToSearch, setIsPullingToSearch] = useState(false);
  const [contextMenuState, setContextMenuState] = useState<ContextMenuState | null>(null);
  const [menuLayout, setMenuLayout] = useState({ width: 0, height: 0 });
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [showMoveToFolderModal, setShowMoveToFolderModal] = useState(false);
  const [noteToMove, setNoteToMove] = useState<Note | null>(null);
  const windowDimensions = useWindowDimensions();
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'gallery'>('list');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'lastEdited'>('lastEdited');
  const [groupByDate, setGroupByDate] = useState(false);

  

  const CONTEXT_MENU_ACTIONS = [
    { id: 'copy', label: t('notes.actions.copy'), icon: '📋' },
    { id: 'share', label: t('notes.actions.share'), icon: '📤' },
    { id: 'move', label: t('notes.actions.moveToFolder'), icon: '📁' },
    { id: 'favorite', label: t('notes.actions.favorite'), icon: '⭐️' },
    { id: 'delete', label: t('notes.actions.delete'), icon: '🗑️', destructive: true },
  ] as const;

  const loadNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      const folderNotes = await databaseService.getNotesByFolder(selectedFolderId, searchQuery || undefined);
      setNotes(folderNotes);
    } catch (error) {
      console.error('Failed to load notes:', error);
      Alert.alert(t('common.error'), t('errors.loadNotes'));
    } finally {
      setIsLoading(false);
    }
  }, [selectedFolderId, searchQuery, t]);

  const loadFolders = useCallback(async () => {
    try {
      const allFolders = await databaseService.getAllFolders();
      setFolders(allFolders);
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  }, []);

  const handleFolderSelect = useCallback((folderId: string | null, folderName?: string) => {
    setSelectedFolderId(folderId);
    setCurrentFolderName(folderName || t('folders.allNotes'));
  }, [t]);

  useEffect(() => {
    loadNotes();
    loadFolders();
  }, [loadNotes, loadFolders]);

  useFocusEffect(
    useCallback(() => {
      if (route.params?.folderId !== undefined) {
        setSelectedFolderId(route.params.folderId);
        setCurrentFolderName(route.params.folderName || t('folders.allNotes'));
      }
    }, [route.params?.folderId, route.params?.folderName, t])
  );

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
    if (isSearchActive) {
      setSearchQuery('');
    }
  };

  const handleScrollPullDown = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    if (contentOffset.y < -50 && !isSearchActive && !isPullingToSearch) {
      setIsPullingToSearch(true);
    } else if (contentOffset.y >= -10 && isPullingToSearch) {
      setIsPullingToSearch(false);
    }
  };

  const handleScrollEndDrag = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    if (contentOffset.y < -50 && !isSearchActive) {
      toggleSearch();
      setIsPullingToSearch(false);
    }
  };

  const createNewNote = async () => {
    try {
      // Navigate to editor without creating note yet
      // The editor will create the note when user starts typing
      navigation.navigate('Editor', { folderId: selectedFolderId || undefined });
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

      case 'move':
        setNoteToMove(note);
        setShowMoveToFolderModal(true);
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

  useEffect(() => {
    navigation.setOptions({
      title: currentFolderName,
      headerRight: () => (
        <View style={styles.headerActions}>
          {isSelectionMode ? (
            <TouchableOpacity onPress={handleSelectAll} style={styles.actionButton}>
              <Text style={[styles.actionIcon, { color: theme.primary, fontSize: 14 }]}>Select All</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setShowOptionsMenu(true)} style={styles.actionButton}>
              <Icon name="dots-vertical" size={24} color={theme.primary} />
            </TouchableOpacity>
          )}
        </View>
      ),
      headerLeft: isSelectionMode ? () => (
        <TouchableOpacity
          onPress={exitSelectionMode}
          style={styles.actionButton}
        >
          <Text style={[styles.actionIcon, { color: theme.primary }]}>✕</Text>
        </TouchableOpacity>
      ) : selectedFolderId === null ? () => (
        <TouchableOpacity
          onPress={() => navigation.openDrawer()}
          style={styles.actionButton}
        >
          <Text style={[styles.actionIcon, { color: theme.primary }]}>☰</Text>
        </TouchableOpacity>
      ) : () => (
        <TouchableOpacity
          onPress={() => handleFolderSelect(null)}
          style={styles.backButton}
        >
          <Text style={[styles.backIcon, { color: theme.primary }]}>←</Text>
          <Text style={[styles.backLabel, { color: theme.primary }]}>All Notes</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, currentFolderName, theme, toggleSearch, selectedFolderId, isSelectionMode, selectedNoteIds]);


  const handleMoveNoteToFolder = async (targetFolderId: string | null) => {
    if (!noteToMove && selectedNoteIds.size === 0) return;

    try {
      const folderIdToSet = targetFolderId === null ? undefined : targetFolderId;

      if (isSelectionMode && selectedNoteIds.size > 0) {
        // Bulk move
        for (const noteId of Array.from(selectedNoteIds)) {
          await databaseService.updateNote(noteId, { folderId: folderIdToSet });
        }
        exitSelectionMode();
      } else if (noteToMove) {
        // Single note move
        await databaseService.updateNote(noteToMove.id, { folderId: folderIdToSet });
        setNoteToMove(null);
      }
      setShowMoveToFolderModal(false);
      await loadNotes();
      HapticFeedback.trigger('impactLight');
    } catch (error) {
      console.error('Failed to move note:', error);
      Alert.alert(t('common.error'), t('errors.moveNote'));
    }
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

  

  const sortedNotes = useMemo(() => {
    let sorted = [...notes];

    switch (sortBy) {
      case 'date':
        sorted.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
        break;
      case 'name':
        sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'lastEdited':
      default:
        sorted.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
        break;
    }

    return sorted;
  }, [notes, sortBy]);

  const groupedNotes = useMemo(() => {
    if (!groupByDate) return null;

    const groups: { [key: string]: Note[] } = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    sortedNotes.forEach(note => {
      const noteDate = new Date(note.lastModified);
      noteDate.setHours(0, 0, 0, 0);

      let groupKey: string;
      if (noteDate.getTime() === today.getTime()) {
        groupKey = 'Today';
      } else if (noteDate.getTime() === yesterday.getTime()) {
        groupKey = 'Yesterday';
      } else {
        groupKey = noteDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(note);
    });

    return groups;
  }, [sortedNotes, groupByDate]);

  const combinedData = useMemo(() => {
    if (selectedFolderId === null) {
      return [...folders, ...sortedNotes];
    }
    return sortedNotes;
  }, [sortedNotes, folders, selectedFolderId]);

  const renderFolderItem = ({ item }: { item: Folder }) => (
    <Pressable
      onPress={() => handleFolderSelect(item.id, item.name)}
      style={({ pressed }) => [
        styles.folderCard,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Text style={[styles.folderIcon, { color: theme.primary }]}>📁</Text>
      <Text style={[styles.folderName, { color: theme.text }]}>{item.name}</Text>
    </Pressable>
  );

  const handleNotePress = (note: Note) => {
    if (isSelectionMode) {
      toggleNoteSelection(note.id);
    } else {
      navigation.navigate('Editor', { noteId: note.id });
    }
  };

  const handleNoteLongPress = (note: Note, event: any) => {
    if (!isSelectionMode) {
      HapticFeedback.trigger('impactMedium');
      setIsSelectionMode(true);
      setSelectedNoteIds(new Set([note.id]));
    }
  };

  const toggleNoteSelection = (noteId: string) => {
    HapticFeedback.trigger('impactLight');
    setSelectedNoteIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
        if (newSet.size === 0) {
          setIsSelectionMode(false);
        }
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    HapticFeedback.trigger('impactLight');
    const allNoteIds = notes.map(note => note.id);
    setSelectedNoteIds(new Set(allNoteIds));
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedNoteIds(new Set());
  };

  const handleBulkMoveToFolder = () => {
    if (selectedNoteIds.size === 0) return;

    setShowMoveToFolderModal(true);
  };

  const handleBulkFavorite = async () => {
    if (selectedNoteIds.size === 0) return;

    HapticFeedback.trigger('impactLight');
    Alert.alert(t('common.comingSoon'), t('common.comingSoonMessage'));
  };

  const handleBulkDelete = async () => {
    if (selectedNoteIds.size === 0) return;

    const count = selectedNoteIds.size;
    Alert.alert(
      t('notes.delete.title'),
      `Are you sure you want to delete ${count} note${count > 1 ? 's' : ''}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              for (const noteId of Array.from(selectedNoteIds)) {
                await databaseService.deleteNote(noteId);
              }
              exitSelectionMode();
              loadNotes();
            } catch (error) {
              console.error('Failed to delete notes:', error);
              Alert.alert(t('common.error'), t('errors.deleteNote'));
            }
          },
        },
      ]
    );
  };

  const renderNoteItem = ({ item, index }: { item: Note; index: number }) => {
    const preview = extractTextFromMarkdown(item.content);
    const isSelected = selectedNoteIds.has(item.id);

    return (
      <Pressable
          onPress={() => handleNotePress(item)}
          onLongPress={(event) => handleNoteLongPress(item, event)}
          delayLongPress={250}
          style={({ pressed }) => [
            viewMode === 'gallery' ? styles.galleryNoteCard : styles.noteCard,
            {
              backgroundColor: theme.surface,
              borderColor: isSelected ? theme.primary : theme.border,
              borderWidth: isSelected ? 2 : 1,
              opacity: pressed ? 0.95 : 1,
            },
          ]}
        >
          {isSelectionMode && (
            <View style={[styles.checkbox, { borderColor: theme.border }]}>
              {isSelected && (
                <Icon name="check" size={14} color={theme.primary} />
              )}
            </View>
          )}
          <View style={styles.noteContent}>
            <View style={styles.noteHeader}>
              <Text
                style={[styles.noteTitle, { color: theme.text }]}
                numberOfLines={viewMode === 'gallery' ? 2 : undefined}
              >
                {item.title || t('notes.untitled')}
              </Text>
              {viewMode === 'list' && (
                <Text style={[styles.noteDate, { color: theme.textSecondary }]}>
                  {formatDate(item.lastModified)}
                </Text>
              )}
            </View>

          {preview && (
            <Text
              style={[styles.notePreview, { color: theme.textSecondary }]}
              numberOfLines={viewMode === 'gallery' ? 4 : undefined}
            >
              {truncateText(preview, viewMode === 'gallery' ? 80 : 120)}
            </Text>
          )}

            {viewMode === 'list' && item.tags.length > 0 && (
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
          </View>
        </Pressable>
    );
  };

  const renderItem = ({ item, index }: { item: Note | Folder; index: number }) => {
    if ('content' in item) {
      return renderNoteItem({ item, index });
    }
    return renderFolderItem({ item });
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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      

      <View
        style={[styles.searchContainer]}
        pointerEvents={isSearchActive ? 'auto' : 'none'}
      >
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
      </View>

      <View style={styles.listWrapper}>
        {viewMode === 'gallery' ? (
          <>
            {selectedFolderId === null && folders.length > 0 && (
              <View style={styles.foldersSection}>
                {folders.map((folder) => renderFolderItem({ item: folder }))}
              </View>
            )}
            <FlatList
              data={sortedNotes}
              renderItem={({ item, index }) => renderNoteItem({ item, index })}
              keyExtractor={(item) => item.id}
              numColumns={2}
              key="gallery"
              columnWrapperStyle={styles.galleryRow}
              contentContainerStyle={[
                styles.galleryContainer,
                sortedNotes.length === 0 && styles.emptyListContainer,
              ]}
              ListEmptyComponent={!isLoading ? EmptyState : null}
              showsVerticalScrollIndicator={false}
              onScroll={handleScrollPullDown}
              onScrollEndDrag={handleScrollEndDrag}
              scrollEventThrottle={16}
              onScrollBeginDrag={() => {
                if (isSearchActive) {
                  toggleSearch();
                }
              }}
            />
          </>
        ) : groupByDate && groupedNotes ? (
          <FlatList
            data={Object.keys(groupedNotes)}
            renderItem={({ item: groupKey }) => (
              <View>
                <View style={styles.dateGroupHeader}>
                  <Text style={[styles.dateGroupHeaderText, { color: theme.textSecondary }]}>
                    {groupKey}
                  </Text>
                </View>
                {groupedNotes[groupKey].map((note, index) => (
                  <View key={note.id}>
                    {renderNoteItem({ item: note, index })}
                  </View>
                ))}
              </View>
            )}
            keyExtractor={(item) => item}
            key="grouped"
            contentContainerStyle={[
              styles.listContainer,
              Object.keys(groupedNotes).length === 0 && styles.emptyListContainer,
            ]}
            ListEmptyComponent={!isLoading ? EmptyState : null}
            showsVerticalScrollIndicator={false}
            onScroll={handleScrollPullDown}
            onScrollEndDrag={handleScrollEndDrag}
            scrollEventThrottle={16}
            onScrollBeginDrag={() => {
              if (isSearchActive) {
                toggleSearch();
              }
            }}
          />
        ) : (
          <FlatList
            data={combinedData}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            key="list"
            contentContainerStyle={[
              styles.listContainer,
              combinedData.length === 0 && styles.emptyListContainer,
            ]}
            ListEmptyComponent={!isLoading ? EmptyState : null}
            showsVerticalScrollIndicator={false}
            onScroll={handleScrollPullDown}
            onScrollEndDrag={handleScrollEndDrag}
            scrollEventThrottle={16}
            onScrollBeginDrag={() => {
              if (isSearchActive) {
                toggleSearch();
              }
            }}
          />
        )}
      </View>

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
              <View
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
                      <Icon name={action.icon} size={18} style={styles.contextMenuIcon} color={action.id === 'delete' ? '#d62d20' : theme.text} />
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
              </View>
            </View>
          )}
        </View>
      </Modal>

      <View style={[styles.fab]}>
        <TouchableOpacity
          style={[styles.fabButton, { backgroundColor: theme.primary }]}
          onPress={createNewNote}
          activeOpacity={0.8}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Folder Picker Modal */}
      <FolderPicker
        visible={showFolderPicker}
        onClose={() => setShowFolderPicker(false)}
        onFolderSelect={handleFolderSelect}
        selectedFolderId={selectedFolderId}
      />

      {/* Move Note to Folder Modal */}
      <FolderPicker
        visible={showMoveToFolderModal}
        onClose={() => {
          setShowMoveToFolderModal(false);
          setNoteToMove(null);
        }}
        onFolderSelect={(folderId) => handleMoveNoteToFolder(folderId)}
        selectedFolderId={noteToMove?.folderId}
        allowCreateFolder={false}
      />

      {/* Options Menu Modal */}
      <Modal
        visible={showOptionsMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowOptionsMenu(false)}>
          <View style={styles.optionsMenuOverlay}>
            <View
              style={[
                styles.optionsMenuContainer,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.optionsMenuItem}
                onPress={() => {
                  setViewMode(viewMode === 'list' ? 'gallery' : 'list');
                  HapticFeedback.trigger('impactLight');
                }}
              >
                <Icon
                  name={viewMode === 'list' ? 'view-grid' : 'view-list'}
                  size={20}
                  color={theme.text}
                />
                <Text style={[styles.optionsMenuItemText, { color: theme.text }]}>
                  {viewMode === 'list' ? 'View as Gallery' : 'View as List'}
                </Text>
              </TouchableOpacity>

              <View style={[styles.optionsMenuDivider, { backgroundColor: theme.border }]} />

              <View style={styles.optionsMenuSection}>
                <Text style={[styles.optionsMenuSectionTitle, { color: theme.textSecondary }]}>
                  Sort by
                </Text>
                <TouchableOpacity
                  style={styles.optionsMenuItem}
                  onPress={() => {
                    setSortBy('date');
                    HapticFeedback.trigger('impactLight');
                  }}
                >
                  <Icon
                    name={sortBy === 'date' ? 'radiobox-marked' : 'radiobox-blank'}
                    size={20}
                    color={sortBy === 'date' ? theme.primary : theme.text}
                  />
                  <Text style={[styles.optionsMenuItemText, { color: theme.text }]}>
                    Date Created
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionsMenuItem}
                  onPress={() => {
                    setSortBy('name');
                    HapticFeedback.trigger('impactLight');
                  }}
                >
                  <Icon
                    name={sortBy === 'name' ? 'radiobox-marked' : 'radiobox-blank'}
                    size={20}
                    color={sortBy === 'name' ? theme.primary : theme.text}
                  />
                  <Text style={[styles.optionsMenuItemText, { color: theme.text }]}>
                    Name
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionsMenuItem}
                  onPress={() => {
                    setSortBy('lastEdited');
                    HapticFeedback.trigger('impactLight');
                  }}
                >
                  <Icon
                    name={sortBy === 'lastEdited' ? 'radiobox-marked' : 'radiobox-blank'}
                    size={20}
                    color={sortBy === 'lastEdited' ? theme.primary : theme.text}
                  />
                  <Text style={[styles.optionsMenuItemText, { color: theme.text }]}>
                    Last Edited
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.optionsMenuDivider, { backgroundColor: theme.border }]} />

              <TouchableOpacity
                style={styles.optionsMenuItem}
                onPress={() => {
                  setGroupByDate(!groupByDate);
                  HapticFeedback.trigger('impactLight');
                }}
              >
                <Icon
                  name={groupByDate ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={20}
                  color={groupByDate ? theme.primary : theme.text}
                />
                <Text style={[styles.optionsMenuItemText, { color: theme.text }]}>
                  Group by Date
                </Text>
              </TouchableOpacity>

              <View style={[styles.optionsMenuDivider, { backgroundColor: theme.border }]} />

              <TouchableOpacity
                style={styles.optionsMenuItem}
                onPress={() => {
                  setShowOptionsMenu(false);
                  navigation.navigate('Attachments');
                }}
              >
                <Icon name="paperclip" size={20} color={theme.text} />
                <Text style={[styles.optionsMenuItemText, { color: theme.text }]}>
                  View Attachments
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Selection Mode Action Bar */}
      {isSelectionMode && selectedNoteIds.size > 0 && (
        <View style={[styles.selectionActionBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.selectionActionButton, { backgroundColor: theme.primary + '15' }]}
            onPress={handleBulkMoveToFolder}
          >
            <Icon name="folder-move" size={18} color={theme.primary} />
            <Text style={[styles.selectionActionButtonText, { color: theme.primary }]}>
              Move
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.selectionActionButton, { backgroundColor: theme.accent + '15' }]}
            onPress={handleBulkFavorite}
          >
            <Icon name="star" size={18} color={theme.accent} />
            <Text style={[styles.selectionActionButtonText, { color: theme.accent }]}>
              Favorite
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.selectionActionButton, { backgroundColor: '#d62d2015' }]}
            onPress={handleBulkDelete}
          >
            <Icon name="delete" size={18} color="#d62d20" />
            <Text style={[styles.selectionActionButtonText, { color: '#d62d20' }]}>
              Remove
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
  },
  backIcon: {
    fontSize: 18,
    marginRight: 4,
  },
  backLabel: {
    fontSize: 17,
    fontWeight: '400',
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
  listWrapper: {
    flex: 1,
    position: 'relative',
  },
  pullToSearchIndicator: {
    position: 'absolute',
    top: -40,
    left: 0,
    right: 0,
    height: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  pullToSearchText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  pullToSearchIcon: {
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
  folderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  folderIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  folderName: {
    fontSize: 16,
    fontWeight: '500',
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
  checkbox: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    zIndex: 1,
  },
  noteContent: {
    flex: 1,
    paddingLeft: 36,
  },
  noteContentWithCheckbox: {
    paddingLeft: 36,
  },
  selectionActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  selectionActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  selectionActionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  optionsMenuOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  optionsMenuContainer: {
    minWidth: 220,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    paddingVertical: 8,
  },
  optionsMenuSection: {
    paddingVertical: 4,
  },
  optionsMenuSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: 'uppercase',
  },
  optionsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionsMenuItemText: {
    fontSize: 15,
    marginLeft: 12,
  },
  optionsMenuDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  dateGroupHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingTop: 20,
  },
  dateGroupHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  galleryContainer: {
    paddingHorizontal: 16,
  },
  galleryRow: {
    justifyContent: 'space-between',
  },
  galleryNoteCard: {
    flex: 1,
    maxWidth: '48%',
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
    minHeight: 160,
  },
  foldersSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
});

export default NotesListScreen;
