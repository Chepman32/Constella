import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  Share,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { databaseService } from '../services/DatabaseService';
import { Note, Attachment } from '../types';

interface AttachmentsScreenProps {
  navigation: any;
  route: any;
}

type AttachmentWithNote = {
  attachment: Attachment;
  note: Note;
};

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 60) / 2;

const AttachmentsScreen: React.FC<AttachmentsScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const [attachments, setAttachments] = useState<AttachmentWithNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const loadAllAttachments = useCallback(async () => {
    try {
      setIsLoading(true);
      const notes = await databaseService.getNotesByFolder(null);
      const attachmentsWithNotes: AttachmentWithNote[] = [];

      notes.forEach((note) => {
        if (note.attachments && note.attachments.length > 0) {
          note.attachments.forEach((attachment) => {
            attachmentsWithNotes.push({ attachment, note });
          });
        }
      });

      setAttachments(attachmentsWithNotes);
    } catch (error) {
      console.error('Failed to load attachments:', error);
      Alert.alert(t('common.error'), 'Failed to load attachments');
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadAllAttachments();
  }, [loadAllAttachments]);

  useFocusEffect(
    useCallback(() => {
      loadAllAttachments();
    }, [loadAllAttachments])
  );

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return 'image';
      case 'audio':
        return 'music';
      case 'file':
      default:
        return 'file-document';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleAttachmentPress = (item: AttachmentWithNote) => {
    navigation.navigate('Editor', { noteId: item.note.id });
  };

  const handleAttachmentLongPress = (item: AttachmentWithNote) => {
    Alert.alert(
      item.attachment.name,
      `Note: ${item.note.title || t('notes.untitled')}\nSize: ${formatFileSize(item.attachment.size)}`,
      [
        {
          text: 'Open Note',
          onPress: () => handleAttachmentPress(item),
        },
        {
          text: 'Share',
          onPress: async () => {
            try {
              await Share.share({
                url: item.attachment.path,
                title: item.attachment.name,
              });
            } catch (error) {
              console.error('Failed to share attachment:', error);
            }
          },
        },
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
      ]
    );
  };

  const renderGridItem = ({ item }: { item: AttachmentWithNote }) => {
    const { attachment, note } = item;
    const isImage = attachment.type === 'image';

    return (
      <TouchableOpacity
        onPress={() => handleAttachmentPress(item)}
        onLongPress={() => handleAttachmentLongPress(item)}
        style={[
          styles.gridItem,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            width: ITEM_WIDTH,
          },
        ]}
      >
        {isImage ? (
          <Image
            source={{ uri: attachment.path }}
            style={styles.gridItemImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.gridItemIconContainer, { backgroundColor: theme.background }]}>
            <Icon name={getFileIcon(attachment.type)} size={48} color={theme.primary} />
          </View>
        )}
        <View style={styles.gridItemInfo}>
          <Text
            style={[styles.gridItemName, { color: theme.text }]}
            numberOfLines={1}
          >
            {attachment.name}
          </Text>
          <Text
            style={[styles.gridItemNote, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {note.title || t('notes.untitled')}
          </Text>
          <Text style={[styles.gridItemSize, { color: theme.textSecondary }]}>
            {formatFileSize(attachment.size)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderListItem = ({ item }: { item: AttachmentWithNote }) => {
    const { attachment, note } = item;
    const isImage = attachment.type === 'image';

    return (
      <TouchableOpacity
        onPress={() => handleAttachmentPress(item)}
        onLongPress={() => handleAttachmentLongPress(item)}
        style={[
          styles.listItem,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        {isImage ? (
          <Image
            source={{ uri: attachment.path }}
            style={styles.listItemThumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.listItemIconContainer, { backgroundColor: theme.background }]}>
            <Icon name={getFileIcon(attachment.type)} size={32} color={theme.primary} />
          </View>
        )}
        <View style={styles.listItemInfo}>
          <Text
            style={[styles.listItemName, { color: theme.text }]}
            numberOfLines={1}
          >
            {attachment.name}
          </Text>
          <Text
            style={[styles.listItemNote, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {note.title || t('notes.untitled')}
          </Text>
          <Text style={[styles.listItemSize, { color: theme.textSecondary }]}>
            {formatFileSize(attachment.size)}
          </Text>
        </View>
        <Icon name="chevron-right" size={24} color={theme.textSecondary} />
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="paperclip" size={64} color={theme.textSecondary} />
      <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
        No Attachments
      </Text>
      <Text style={[styles.emptyStateSubtitle, { color: theme.textSecondary }]}>
        Attachments from your notes will appear here
      </Text>
    </View>
  );

  useEffect(() => {
    navigation.setOptions({
      title: 'Attachments',
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          style={styles.actionButton}
        >
          <Icon
            name={viewMode === 'grid' ? 'view-list' : 'view-grid'}
            size={24}
            color={theme.primary}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, theme, viewMode]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {viewMode === 'grid' ? (
        <FlatList
          data={attachments}
          renderItem={renderGridItem}
          keyExtractor={(item, index) => `${item.note.id}-${item.attachment.id}-${index}`}
          numColumns={2}
          contentContainerStyle={[
            styles.gridContainer,
            attachments.length === 0 && styles.emptyListContainer,
          ]}
          columnWrapperStyle={styles.gridRow}
          ListEmptyComponent={EmptyState}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={attachments}
          renderItem={renderListItem}
          keyExtractor={(item, index) => `${item.note.id}-${item.attachment.id}-${index}`}
          contentContainerStyle={[
            styles.listContainer,
            attachments.length === 0 && styles.emptyListContainer,
          ]}
          ListEmptyComponent={EmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  actionButton: {
    padding: 8,
    marginRight: 8,
  },
  gridContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  gridItem: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  gridItemImage: {
    width: '100%',
    height: ITEM_WIDTH,
  },
  gridItemIconContainer: {
    width: '100%',
    height: ITEM_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridItemInfo: {
    padding: 12,
  },
  gridItemName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  gridItemNote: {
    fontSize: 12,
    marginBottom: 4,
  },
  gridItemSize: {
    fontSize: 11,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  listItemThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  listItemIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  listItemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  listItemNote: {
    fontSize: 14,
    marginBottom: 4,
  },
  listItemSize: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  emptyListContainer: {
    flex: 1,
  },
});

export default AttachmentsScreen;