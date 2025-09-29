import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { databaseService } from '../services/DatabaseService';
import { Folder } from '../types';

interface FolderViewProps {
  onFolderSelect: (folderId: string | null, folderName?: string) => void;
  selectedFolderId?: string | null;
  onCreateFolder?: () => void;
  onManageFolders?: () => void;
}

const FolderView: React.FC<FolderViewProps> = ({
  onFolderSelect,
  selectedFolderId,
  onCreateFolder,
  onManageFolders,
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      setIsLoading(true);
      const allFolders = await databaseService.getAllFolders();
      setFolders(allFolders);
    } catch (error) {
      console.error('Failed to load folders:', error);
      Alert.alert(t('common.error'), t('errors.loadFolders'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFolderPress = (folder: Folder) => {
    onFolderSelect(folder.id, folder.name);
  };

  const handleAllNotesPress = () => {
    onFolderSelect(null, t('folders.allNotes'));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          {t('folders.title')}
        </Text>
        <View style={styles.headerActions}>
          {onCreateFolder && (
            <TouchableOpacity onPress={onCreateFolder} style={styles.actionButton}>
              <Text style={[styles.actionIcon, { color: theme.primary }]}>+</Text>
            </TouchableOpacity>
          )}
          {onManageFolders && (
            <TouchableOpacity onPress={onManageFolders} style={styles.actionButton}>
              <Text style={[styles.actionIcon, { color: theme.primary }]}>⋯</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.folderList}
        showsVerticalScrollIndicator={false}
      >
        {/* All Notes */}
        <TouchableOpacity
          style={[
            styles.folderItem,
            {
              backgroundColor: selectedFolderId === null ? theme.primary + '15' : theme.surface,
              borderColor: theme.border,
            },
          ]}
          onPress={handleAllNotesPress}
        >
          <View style={[styles.folderIconContainer, { backgroundColor: theme.accent + '20' }]}>
            <Text style={styles.folderIcon}>📋</Text>
          </View>
          <View style={styles.folderContent}>
            <Text style={[styles.folderName, { color: theme.text }]}>
              {t('folders.allNotes')}
            </Text>
            <Text style={[styles.folderDescription, { color: theme.textSecondary }]}>
              {t('folders.allNotesDescription')}
            </Text>
          </View>
          {selectedFolderId === null && (
            <View style={[styles.selectedIndicator, { backgroundColor: theme.primary }]} />
          )}
        </TouchableOpacity>

        {/* Folders */}
        {folders.map((folder) => (
          <TouchableOpacity
            key={folder.id}
            style={[
              styles.folderItem,
              {
                backgroundColor: selectedFolderId === folder.id ? theme.primary + '15' : theme.surface,
                borderColor: theme.border,
              },
            ]}
            onPress={() => handleFolderPress(folder)}
          >
            <View style={[
              styles.folderIconContainer,
              { backgroundColor: (folder.color || theme.accent) + '40' }
            ]}>
              <Text style={styles.folderIcon}>{folder.icon || '📁'}</Text>
            </View>
            <View style={styles.folderContent}>
              <Text style={[styles.folderName, { color: theme.text }]}>
                {folder.name}
              </Text>
              <Text style={[styles.folderDescription, { color: theme.textSecondary }]}>
                {folder.noteCount} {folder.noteCount === 1 ? t('folders.note') : t('folders.notes')}
                {folder.description && ` • ${folder.description}`}
              </Text>
            </View>
            {selectedFolderId === folder.id && (
              <View style={[styles.selectedIndicator, { backgroundColor: theme.primary }]} />
            )}
          </TouchableOpacity>
        ))}

        {folders.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
              {t('folders.empty')}
            </Text>
            {onCreateFolder && (
              <TouchableOpacity
                style={[styles.createFolderButton, { backgroundColor: theme.accent }]}
                onPress={onCreateFolder}
              >
                <Text style={styles.createFolderButtonText}>
                  {t('folders.createFirst')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
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
    fontSize: 24,
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
    fontSize: 18,
    fontWeight: '600',
  },
  folderList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  folderIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  folderIcon: {
    fontSize: 20,
  },
  folderContent: {
    flex: 1,
  },
  folderName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  folderDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  selectedIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  createFolderButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createFolderButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default FolderView;