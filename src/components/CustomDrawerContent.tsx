import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

const CustomDrawerContent: React.FC<DrawerContentComponentProps> = (props) => {
  const { theme, themeName } = useTheme();
  const { navigation, state } = props;

  const menuItems = [
    {
      id: 'Notes',
      label: 'Notes',
      icon: '📝',
      screen: 'Notes',
    },
    {
      id: 'Favorites',
      label: 'Favorites',
      icon: '⭐️',
      screen: 'Favorites',
    },
    {
      id: 'Canvas',
      label: 'Spatial Canvas',
      icon: '🗺️',
      screen: 'Canvas',
    },
    {
      id: 'Settings',
      label: 'Settings',
      icon: '⚙️',
      screen: 'Settings',
    },
  ];

  const navigateToScreen = (screenName: string) => {
    navigation.navigate(screenName);
    navigation.closeDrawer();
  };

  const currentRoute = state.routes[state.index].name;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.appName, { color: theme.text }]}>Constella</Text>
        <Text style={[styles.appSubtitle, { color: theme.textSecondary }]}>
          Your digital notebook
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
});

export default CustomDrawerContent;