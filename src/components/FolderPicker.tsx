import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  TextInput,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { databaseService } from '../services/DatabaseService';
import { Folder } from '../types';

interface FolderPickerProps {
  visible: boolean;
  onClose: () => void;
  onFolderSelect: (folderId: string | null) => void;
  selectedFolderId?: string | null;
  allowCreateFolder?: boolean;
}

const FolderPicker: React.FC<FolderPickerProps> = ({
  visible,
  onClose,
  onFolderSelect,
  selectedFolderId,
  allowCreateFolder = true,
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#007AFF');

  const folderColors = [
    '#007AFF', '#FF3B30', '#FF9500', '#FFCC00',
    '#34C759', '#00C7BE', '#AF52DE', '#FF2D92'
  ];

  const folderIcons = ['📁', '📂', '🗂️', '📋', '📊', '💼', '🎯', '📝'];

  useEffect(() => {
    if (visible) {
      loadFolders();
    }
  }, [visible]);

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

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      await databaseService.createFolder({
        name: newFolderName.trim(),
        color: selectedColor,
        icon: '📁',
        created: new Date(),
        lastModified: new Date(),
      });

      setNewFolderName('');
      setShowCreateDialog(false);
      loadFolders();
    } catch (error) {
      console.error('Failed to create folder:', error);
      Alert.alert(t('common.error'), t('errors.createFolder'));
    }
  };

  const renderFolderItem = ({ item }: { item: Folder }) => (
    <TouchableOpacity
      style={[
        styles.folderItem,
        {
          backgroundColor: selectedFolderId === item.id ? theme.primary + '15' : 'transparent',
        },
      ]}
      onPress={() => {
        onFolderSelect(item.id);
        onClose();
      }}
    >
      <View style={styles.folderIcon}>
        <Text style={styles.folderIconText}>{item.icon || '📁'}</Text>
      </View>
      <View style={styles.folderInfo}>
        <Text style={[styles.folderName, { color: theme.text }]}>
          {item.name}
        </Text>
        <Text style={[styles.folderCount, { color: theme.textSecondary }]}>
          {item.noteCount} {item.noteCount === 1 ? t('folders.note') : t('folders.notes')}
        </Text>
      </View>
      {selectedFolderId === item.id && (
        <Text style={[styles.checkmark, { color: theme.primary }]}>✓</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {t('folders.selectFolder')}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: theme.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.folderItem,
              {
                backgroundColor: selectedFolderId === null ? theme.primary + '15' : 'transparent',
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: theme.border,
              },
            ]}
            onPress={() => {
              onFolderSelect(null);
              onClose();
            }}
          >
            <View style={styles.folderIcon}>
              <Text style={styles.folderIconText}>📋</Text>
            </View>
            <View style={styles.folderInfo}>
              <Text style={[styles.folderName, { color: theme.text }]}>
                {t('folders.allNotes')}
              </Text>
              <Text style={[styles.folderCount, { color: theme.textSecondary }]}>
                {t('folders.noFolder')}
              </Text>
            </View>
            {selectedFolderId === null && (
              <Text style={[styles.checkmark, { color: theme.primary }]}>✓</Text>
            )}
          </TouchableOpacity>

          <FlatList
            data={folders}
            keyExtractor={(item) => item.id}
            renderItem={renderFolderItem}
            style={styles.folderList}
            showsVerticalScrollIndicator={false}
          />

          {allowCreateFolder && (
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: theme.accent }]}
              onPress={() => setShowCreateDialog(true)}
            >
              <Text style={styles.createButtonText}>+ {t('folders.createNew')}</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Create Folder Dialog */}
      <Modal
        visible={showCreateDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateDialog(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCreateDialog(false)}
        >
          <TouchableOpacity
            style={[styles.createFolderModal, { backgroundColor: theme.surface, borderColor: theme.border }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.createFolderTitle, { color: theme.text }]}>
              {t('folders.createFolder')}
            </Text>

            <TextInput
              style={[
                styles.folderNameInput,
                {
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder={t('folders.folderName')}
              placeholderTextColor={theme.textSecondary}
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
            />

            <View style={styles.colorPicker}>
              <Text style={[styles.colorPickerLabel, { color: theme.text }]}>
                {t('folders.color')}
              </Text>
              <View style={styles.colorOptions}>
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

            <View style={styles.createFolderActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.border }]}
                onPress={() => {
                  setShowCreateDialog(false);
                  setNewFolderName('');
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  { backgroundColor: theme.primary },
                  !newFolderName.trim() && styles.disabledButton,
                ]}
                onPress={handleCreateFolder}
                disabled={!newFolderName.trim()}
              >
                <Text style={styles.confirmButtonText}>
                  {t('common.create')}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
  },
  folderList: {
    maxHeight: 300,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  folderIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  folderIconText: {
    fontSize: 20,
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    fontSize: 16,
    fontWeight: '500',
  },
  folderCount: {
    fontSize: 13,
    marginTop: 2,
  },
  checkmark: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  createButton: {
    margin: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  createFolderModal: {
    width: '90%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  createFolderTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  folderNameInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  colorPicker: {
    marginBottom: 20,
  },
  colorPickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColorOption: {
    borderColor: '#ffffff',
    transform: [{ scale: 1.1 }],
  },
  createFolderActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default FolderPicker;