import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
import CustomDrawerContent from './src/components/CustomDrawerContent';

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

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
      </Stack.Navigator>
    );
  };

  return (
    <GestureHandlerRootView style={containerStyle}>
      <SafeAreaProvider>
        <LocalizationProvider>
          <ThemeProvider>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <NavigationContainer>
              <Drawer.Navigator
                drawerContent={(props) => <CustomDrawerContent {...props} />}
                screenOptions={{
                  headerShown: false,
                  drawerType: 'slide',
                  overlayColor: 'rgba(0, 0, 0, 0.5)',
                }}
              >
                <Drawer.Screen name="MainStack" component={MainStackNavigator} />
                <Drawer.Screen name="Favorites" component={FavoritesScreen} />
                <Drawer.Screen name="Canvas" component={SpatialCanvasScreen} />
                <Drawer.Screen name="FolderManagement" component={FolderManagementScreen} />
                <Drawer.Screen name="Settings" component={SettingsScreen} />
              </Drawer.Navigator>
            </NavigationContainer>
          </ThemeProvider>
        </LocalizationProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};


export default App;