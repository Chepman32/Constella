import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { LocalizationProvider, useLocalization } from './src/contexts/LocalizationContext';
import { databaseService } from './src/services/DatabaseService';
import SplashScreen from './src/screens/SplashScreen';
import NotesListScreen from './src/screens/NotesListScreen';
import NoteEditorScreen from './src/screens/NoteEditorScreen';
import SpatialCanvasScreen from './src/screens/SpatialCanvasScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import FolderManagementScreen from './src/screens/FolderManagementScreen';
import AttachmentsScreen from './src/screens/AttachmentsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [dbInitialized, setDbInitialized] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      await databaseService.init();
      setDbInitialized(true);
    } catch (error) {
      console.error('Failed to initialize app:', error);
    } finally {
      // Keep splash screen for minimum duration
      setTimeout(() => {
        setIsLoading(false);
      }, 2000);
    }
  };

  if (isLoading || !dbInitialized) {
    return <SplashScreen />;
  }

  const containerStyle = { flex: 1 };

  const MainStackNavigator = () => {
    const { theme } = useTheme();
    const { t } = useLocalization();
    return (
      <Stack.Navigator
        screenOptions={{
          gestureEnabled: true,
          headerStyle: {
            backgroundColor: theme.background,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTintColor: theme.primary,
          headerTitleStyle: {
            color: theme.text,
          },
        }}
      >
        <Stack.Screen
          name="Notes"
          component={NotesListScreen}
          options={({ route }) => ({
            title: route.params?.folderName || t('folders.allNotes'),
          })}
        />
        <Stack.Screen name="Editor" component={NoteEditorScreen} />
        <Stack.Screen name="Attachments" component={AttachmentsScreen} />
      </Stack.Navigator>
    );
  };

  const MainTabNavigator = () => {
    const { theme } = useTheme();
    const { t } = useLocalization();

    return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarStyle: {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
          },
          tabBarIcon: ({ color, size }) => {
            const iconNameByRoute: Record<string, string> = {
              MainStack: 'note-multiple-outline',
              Favorites: 'star-outline',
              Canvas: 'vector-polyline',
              FolderManagement: 'folder-outline',
              Settings: 'cog-outline',
            };

            return (
              <Icon
                name={iconNameByRoute[route.name] || 'circle-outline'}
                size={size}
                color={color}
              />
            );
          },
        })}
      >
        <Tab.Screen
          name="MainStack"
          component={MainStackNavigator}
          options={{ tabBarLabel: t('folders.allNotes') }}
        />
        <Tab.Screen
          name="Favorites"
          component={FavoritesScreen}
          options={{ tabBarLabel: t('favorites.title') }}
        />
        <Tab.Screen
          name="Canvas"
          component={SpatialCanvasScreen}
          options={{ tabBarLabel: 'Canvas' }}
        />
        <Tab.Screen
          name="FolderManagement"
          component={FolderManagementScreen}
          options={{ tabBarLabel: t('folders.manage') }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ tabBarLabel: t('settings.title') }}
        />
      </Tab.Navigator>
    );
  };

  return (
    <GestureHandlerRootView style={containerStyle}>
      <SafeAreaProvider>
        <LocalizationProvider>
          <ThemeProvider>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <NavigationContainer>
              <MainTabNavigator />
            </NavigationContainer>
          </ThemeProvider>
        </LocalizationProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};


export default App;
