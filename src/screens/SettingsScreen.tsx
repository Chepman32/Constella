import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

interface SettingsScreenProps {
  navigation: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { theme, themeName, toggleTheme } = useTheme();

  const settingsItems = [
    {
      id: 'theme',
      title: 'Dark Mode',
      icon: '🌙',
      type: 'toggle',
      value: themeName === 'dark',
      onToggle: toggleTheme,
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: '🔔',
      type: 'toggle',
      value: true,
      onToggle: () => {},
    },
    {
      id: 'backup',
      title: 'Backup & Sync',
      icon: '☁️',
      type: 'action',
      onPress: () => {},
    },
    {
      id: 'export',
      title: 'Export Notes',
      icon: '📤',
      type: 'action',
      onPress: () => {},
    },
    {
      id: 'about',
      title: 'About',
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
        <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
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
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          {settingsItems.map(renderSettingItem)}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            Constella v1.0.0
          </Text>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            Made with ❤️ for note-taking
          </Text>
        </View>
      </ScrollView>
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
});

export default SettingsScreen;