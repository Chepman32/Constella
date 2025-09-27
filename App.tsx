import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { databaseService } from './src/services/DatabaseService';
import SplashScreen from './src/screens/SplashScreen';
import NotesListScreen from './src/screens/NotesListScreen';
import NoteEditorScreen from './src/screens/NoteEditorScreen';
import SpatialCanvasScreen from './src/screens/SpatialCanvasScreen';

const Stack = createStackNavigator();

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

  return (
    <GestureHandlerRootView style={containerStyle}>
      <SafeAreaProvider>
        <ThemeProvider>
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
          <NavigationContainer>
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                gestureEnabled: true,
              }}
            >
              <Stack.Screen name="Notes" component={NotesListScreen} />
              <Stack.Screen name="Editor" component={NoteEditorScreen} />
              <Stack.Screen name="Canvas" component={SpatialCanvasScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};


export default App;
