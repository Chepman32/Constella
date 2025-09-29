import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { databaseService } from '../services/DatabaseService';
import { Folder } from '../types';

interface FolderManagementScreenProps {
  navigation: any;
}

const FolderManagementScreen: React.FC<FolderManagementScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('#007AFF');
  const [selectedIcon, setSelectedIcon] = useState('📁');

  const folderColors = [
    '#007AFF', '#FF3B30', '#FF9500', '#FFCC00',
    '#34C759', '#00C7BE', '#AF52DE', '#FF2D92'
  ];

  const folderIcons = ['📁', '📂', '🗂️', '📋', '📊', '💼', '🎯', '📝', '🏷️', '🗃️'];

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

  const handleCreateFolder = () => {
    setEditingFolder(null);
    setFolderName('');
    setFolderDescription('');
    setSelectedColor('#007AFF');
    setSelectedIcon('📁');
    setShowCreateModal(true);
  };

  const handleEditFolder = (folder: Folder) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderDescription(folder.description || '');
    setSelectedColor(folder.color || '#007AFF');
    setSelectedIcon(folder.icon || '📁');
    setShowCreateModal(true);
  };

  const handleSaveFolder = async () => {
    if (!folderName.trim()) return;

    try {
      if (editingFolder) {
        await databaseService.updateFolder(editingFolder.id, {
          name: folderName.trim(),
          description: folderDescription.trim() || undefined,
          color: selectedColor,
          icon: selectedIcon,
        });
      } else {
        await databaseService.createFolder({
          name: folderName.trim(),
          description: folderDescription.trim() || undefined,
          color: selectedColor,
          icon: selectedIcon,
          created: new Date(),
          lastModified: new Date(),
        });
      }

      setShowCreateModal(false);
      resetForm();
      loadFolders();
    } catch (error) {
      console.error('Failed to save folder:', error);
      Alert.alert(t('common.error'), editingFolder ? t('errors.updateFolder') : t('errors.createFolder'));
    }
  };

  const handleDeleteFolder = (folder: Folder) => {
    Alert.alert(
      t('folders.delete.title'),
      t('folders.delete.message', { folderName: folder.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.deleteFolder(folder.id);
              loadFolders();
            } catch (error) {
              console.error('Failed to delete folder:', error);
              Alert.alert(t('common.error'), t('errors.deleteFolder'));
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFolderName('');
    setFolderDescription('');
    setSelectedColor('#007AFF');
    setSelectedIcon('📁');
    setEditingFolder(null);
  };

  const renderFolderItem = ({ item }: { item: Folder }) => (
    <View style={[styles.folderCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.folderCardHeader}>
        <View style={[styles.folderIconContainer, { backgroundColor: (item.color || theme.accent) + '40' }]}>
          <Text style={styles.folderIcon}>{item.icon || '📁'}</Text>
        </View>
        <View style={styles.folderInfo}>
          <Text style={[styles.folderName, { color: theme.text }]}>
            {item.name}
          </Text>
          <Text style={[styles.folderMeta, { color: theme.textSecondary }]}>
            {item.noteCount} {item.noteCount === 1 ? t('folders.note') : t('folders.notes')}
          </Text>
          {item.description && (
            <Text style={[styles.folderDescription, { color: theme.textSecondary }]}>
              {item.description}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.folderActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.accent + '20' }]}
          onPress={() => handleEditFolder(item)}
        >
          <Text style={[styles.actionButtonText, { color: theme.accent }]}>
            {t('common.edit')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#FF3B30' + '20' }]}
          onPress={() => handleDeleteFolder(item)}
        >
          <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>
            {t('common.delete')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backIcon, { color: theme.primary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>
          {t('folders.manage')}
        </Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleCreateFolder}
        >
          <Text style={[styles.addIcon, { color: theme.primary }]}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={folders}
        keyExtractor={(item) => item.id}
        renderItem={renderFolderItem}
        contentContainerStyle={styles.folderList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
                {t('folders.empty')}
              </Text>
              <Text style={[styles.emptyStateSubtitle, { color: theme.textSecondary }]}>
                {t('folders.emptyDescription')}
              </Text>
              <TouchableOpacity
                style={[styles.createFirstButton, { backgroundColor: theme.accent }]}
                onPress={handleCreateFolder}
              >
                <Text style={styles.createFirstButtonText}>
                  {t('folders.createFirst')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      {/* Create/Edit Folder Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowCreateModal(false);
            resetForm();
          }}
        >
          <TouchableOpacity
            style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {editingFolder ? t('folders.editFolder') : t('folders.createFolder')}
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder={t('folders.folderName')}
              placeholderTextColor={theme.textSecondary}
              value={folderName}
              onChangeText={setFolderName}
              autoFocus
            />

            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder={t('folders.description')}
              placeholderTextColor={theme.textSecondary}
              value={folderDescription}
              onChangeText={setFolderDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionLabel, { color: theme.text }]}>
                {t('folders.icon')}
              </Text>
              <View style={styles.iconGrid}>
                {folderIcons.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconOption,
                      selectedIcon === icon && { backgroundColor: theme.primary + '20' },
                    ]}
                    onPress={() => setSelectedIcon(icon)}
                  >
                    <Text style={styles.iconOptionText}>{icon}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionLabel, { color: theme.text }]}>
                {t('folders.color')}
              </Text>
              <View style={styles.colorGrid}>
                {folderColors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      selectedColor === color && styles.selectedColorOption,
                    ]}
                    onPress={() => setSelectedColor(color)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.border }]}
                onPress={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.primary },
                  !folderName.trim() && styles.disabledButton,
                ]}
                onPress={handleSaveFolder}
                disabled={!folderName.trim()}
              >
                <Text style={styles.modalButtonText}>
                  {editingFolder ? t('common.save') : t('common.create')}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  headerButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 22,
    fontWeight: '600',
  },
  addIcon: {
    fontSize: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  folderList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  folderCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  folderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  folderIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  folderIcon: {
    fontSize: 24,
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  folderMeta: {
    fontSize: 13,
    marginBottom: 2,
  },
  folderDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  folderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  createFirstButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createFirstButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 80,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconOptionText: {
    fontSize: 20,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColorOption: {
    borderColor: '#ffffff',
    transform: [{ scale: 1.1 }],
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default FolderManagementScreen;