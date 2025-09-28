import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';

interface SettingsScreenProps {
  navigation: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { theme, themeName, setTheme, autoTheme, setAutoTheme } = useTheme();
  const { t, language, setLanguage, availableLanguages } = useLocalization();
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const themes = [
    { key: 'light', name: t('settings.themes.light'), icon: '☀️' },
    { key: 'dark', name: t('settings.themes.dark'), icon: '🌙' },
    { key: 'solar', name: t('settings.themes.solar'), icon: '🌅' },
    { key: 'mono', name: t('settings.themes.mono'), icon: '⚫' },
  ];

  const currentLanguage = availableLanguages.find(lang => lang.code === language);
  const currentTheme = themes.find(theme => theme.key === themeName);

  const settingsItems = [
    {
      id: 'theme',
      title: t('settings.theme'),
      icon: currentTheme?.icon || '🎨',
      type: 'action',
      value: currentTheme?.name,
      onPress: () => setShowThemeModal(true),
    },
    {
      id: 'autoTheme',
      title: t('settings.autoTheme'),
      icon: '🔄',
      type: 'toggle',
      value: autoTheme,
      onToggle: setAutoTheme,
    },
    {
      id: 'language',
      title: t('settings.language'),
      icon: '🌐',
      type: 'action',
      value: currentLanguage?.nativeName,
      onPress: () => setShowLanguageModal(true),
    },
    {
      id: 'notifications',
      title: t('settings.notifications'),
      icon: '🔔',
      type: 'toggle',
      value: true,
      onToggle: () => {},
    },
    {
      id: 'backup',
      title: t('settings.backup'),
      icon: '☁️',
      type: 'action',
      onPress: () => {},
    },
    {
      id: 'export',
      title: t('settings.export'),
      icon: '📤',
      type: 'action',
      onPress: () => {},
    },
    {
      id: 'about',
      title: t('settings.about'),
      icon: 'ℹ️',
      type: 'action',
      onPress: () => {},
    },
  ];

  const renderSettingItem = (item: any) => {
    if (item.type === 'toggle') {
      return (
        <View key={item.id} style={[styles.settingItem, { borderBottomColor: theme.border }]}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>{item.icon}</Text>
            <Text style={[styles.settingTitle, { color: theme.text }]}>{item.title}</Text>
          </View>
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{ false: theme.surface, true: theme.primary }}
            thumbColor={item.value ? '#fff' : theme.textSecondary}
          />
        </View>
      );
    }

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.settingItem, { borderBottomColor: theme.border }]}
        onPress={item.onPress}
      >
        <View style={styles.settingLeft}>
          <Text style={styles.settingIcon}>{item.icon}</Text>
          <Text style={[styles.settingTitle, { color: theme.text }]}>{item.title}</Text>
        </View>
        <View style={styles.settingRight}>
          {item.value && (
            <Text style={[styles.settingValue, { color: theme.textSecondary }]}>{item.value}</Text>
          )}
          <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backIcon, { color: theme.primary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>{t('settings.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          {settingsItems.map(renderSettingItem)}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            {t('app.name')} v1.0.0
          </Text>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            {t('settings.madeWith')}
          </Text>
        </View>
      </ScrollView>

      {/* Theme Selection Modal */}
      <Modal
        visible={showThemeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t('settings.theme')}</Text>
            <FlatList
              data={themes}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    item.key === themeName && { backgroundColor: theme.primary + '15' }
                  ]}
                  onPress={async () => {
                    await setTheme(item.key as any);
                    setShowThemeModal(false);
                  }}
                >
                  <Text style={styles.modalItemIcon}>{item.icon}</Text>
                  <Text style={[
                    styles.modalItemText,
                    { color: item.key === themeName ? theme.primary : theme.text }
                  ]}>
                    {item.name}
                  </Text>
                  {item.key === themeName && (
                    <Text style={[styles.checkmark, { color: theme.primary }]}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={[styles.modalCancelButton, { backgroundColor: theme.border }]}
              onPress={() => setShowThemeModal(false)}
            >
              <Text style={[styles.modalCancelText, { color: theme.text }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t('settings.language')}</Text>
            <FlatList
              data={availableLanguages}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    item.code === language && { backgroundColor: theme.primary + '15' }
                  ]}
                  onPress={async () => {
                    await setLanguage(item.code);
                    setShowLanguageModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    { color: item.code === language ? theme.primary : theme.text }
                  ]}>
                    {item.nativeName}
                  </Text>
                  <Text style={[styles.modalItemSubtext, { color: theme.textSecondary }]}>
                    {item.name}
                  </Text>
                  {item.code === language && (
                    <Text style={[styles.checkmark, { color: theme.primary }]}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={[styles.modalCancelButton, { backgroundColor: theme.border }]}
              onPress={() => setShowLanguageModal(false)}
            >
              <Text style={[styles.modalCancelText, { color: theme.text }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 14,
    marginRight: 8,
  },
  settingIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxHeight: '70%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    padding: 20,
    textAlign: 'center',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalItemIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  modalItemSubtext: {
    fontSize: 14,
    marginLeft: 8,
  },
  checkmark: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    margin: 16,
    borderRadius: 12,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default SettingsScreen;