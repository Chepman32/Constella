import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { databaseService } from '../services/DatabaseService';
import { Folder } from '../types';

const CustomDrawerContent: React.FC<DrawerContentComponentProps> = (props) => {
  const { theme, themeName } = useTheme();
  const { t } = useLocalization();
  const { navigation, state } = props;
  const [folders, setFolders] = useState<Folder[]>([]);
  const [foldersExpanded, setFoldersExpanded] = useState(true);

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      const allFolders = await databaseService.getAllFolders();
      setFolders(allFolders);
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };

  const menuItems = [
    {
      id: 'Notes',
      label: t('navigation.notes'),
      icon: '📝',
      screen: 'Notes',
    },
    {
      id: 'Favorites',
      label: t('navigation.favorites'),
      icon: '⭐️',
      screen: 'Favorites',
    },
    {
      id: 'Canvas',
      label: t('navigation.canvas'),
      icon: '🗺️',
      screen: 'Canvas',
    },
    {
      id: 'Settings',
      label: t('navigation.settings'),
      icon: '⚙️',
      screen: 'Settings',
    },
  ];

  const navigateToScreen = (screenName: string, params?: any) => {
    if (screenName === 'Notes') {
      // Navigate to MainStack for Notes screen, explicitly showing All Notes
      navigation.navigate('MainStack', {
        screen: 'Notes',
        params: {
          folderId: null,
          folderName: t('folders.allNotes'),
          ...params
        }
      });
    } else {
      navigation.navigate(screenName, params);
    }
    navigation.closeDrawer();
  };

  const navigateToFolder = (folderId: string | null, folderName: string) => {
    navigation.navigate('MainStack', {
      screen: 'Notes',
      params: { folderId, folderName }
    });
    navigation.closeDrawer();
  };

  const currentRoute = state.routes[state.index].name;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.appName, { color: theme.text }]}>{t('app.name')}</Text>
        <Text style={[styles.appSubtitle, { color: theme.textSecondary }]}>
          {t('app.subtitle')}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.menuSection}>
          {menuItems.map((item) => {
            const isActive = currentRoute === item.screen;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  isActive && { backgroundColor: theme.primary + '15' },
                ]}
                onPress={() => navigateToScreen(item.screen)}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text
                  style={[
                    styles.menuLabel,
                    { color: isActive ? theme.primary : theme.text },
                    isActive && { fontWeight: '600' },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Folders Section */}
        <View style={styles.foldersSection}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setFoldersExpanded(!foldersExpanded)}
            activeOpacity={0.7}
          >
            <Text style={[styles.sectionHeaderText, { color: theme.text }]}>
              {t('folders.title')}
            </Text>
            <Text style={[styles.expandIcon, { color: theme.textSecondary }]}>
              {foldersExpanded ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {foldersExpanded && (
            <View style={styles.foldersContainer}>
              {/* All Notes */}
              <TouchableOpacity
                style={styles.folderItem}
                onPress={() => navigateToFolder(null, t('folders.allNotes'))}
                activeOpacity={0.7}
              >
                <Text style={styles.folderIcon}>📋</Text>
                <Text style={[styles.folderLabel, { color: theme.text }]}>
                  {t('folders.allNotes')}
                </Text>
              </TouchableOpacity>

              {/* Folders */}
              {folders.map((folder) => (
                <TouchableOpacity
                  key={folder.id}
                  style={styles.folderItem}
                  onPress={() => navigateToFolder(folder.id, folder.name)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.folderIcon}>{folder.icon || '📁'}</Text>
                  <View style={styles.folderInfo}>
                    <Text style={[styles.folderLabel, { color: theme.text }]}>
                      {folder.name}
                    </Text>
                    <Text style={[styles.folderCount, { color: theme.textSecondary }]}>
                      {folder.noteCount} {folder.noteCount === 1 ? t('folders.note') : t('folders.notes')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              {folders.length === 0 && (
                <View style={styles.emptyFolders}>
                  <Text style={[styles.emptyFoldersText, { color: theme.textSecondary }]}>
                    {t('folders.empty')}
                  </Text>
                </View>
              )}

              {/* Manage Folders Button */}
              <TouchableOpacity
                style={[styles.manageFoldersButton, { backgroundColor: theme.accent + '15' }]}
                onPress={() => navigateToScreen('FolderManagement')}
                activeOpacity={0.7}
              >
                <Text style={styles.manageIcon}>⚙️</Text>
                <Text style={[styles.manageLabel, { color: theme.accent }]}>
                  {t('folders.manage')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Text style={[styles.version, { color: theme.textSecondary }]}>
          v1.0.0 • {themeName === 'dark' ? '🌙' : '☀️'}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  menuSection: {
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  menuLabel: {
    fontSize: 16,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  version: {
    fontSize: 12,
  },
  foldersSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
  },
  expandIcon: {
    fontSize: 12,
  },
  foldersContainer: {
    marginTop: 8,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 2,
  },
  folderIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
    textAlign: 'center',
  },
  folderInfo: {
    flex: 1,
  },
  folderLabel: {
    fontSize: 15,
  },
  folderCount: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyFolders: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  emptyFoldersText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  manageFoldersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  manageIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
    textAlign: 'center',
  },
  manageLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default CustomDrawerContent;