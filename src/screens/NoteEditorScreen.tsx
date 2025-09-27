import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { databaseService } from '../services/DatabaseService';
import { Note, Drawing } from '../types';
import { generateId } from '../utils';
import DrawingCanvas from '../components/DrawingCanvas';

interface NoteEditorScreenProps {
  navigation: any;
  route: any;
}

const { width, height } = Dimensions.get('window');

const NoteEditorScreen: React.FC<NoteEditorScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { noteId } = route.params || {};

  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawings, setDrawings] = useState<Drawing[]>([]);

  const titleRef = useRef<TextInput>(null);
  const contentRef = useRef<TextInput>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  const toolbarOpacity = useSharedValue(1);
  const headerOpacity = useSharedValue(1);

  useEffect(() => {
    if (noteId) {
      loadNote(noteId);
    } else {
      setIsLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    // Auto-save functionality
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (noteId && (title || content)) {
        saveNote();
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, content, noteId]);

  const loadNote = async (id: string) => {
    try {
      const loadedNote = await databaseService.getNote(id);
      if (loadedNote) {
        setNote(loadedNote);
        setTitle(loadedNote.title);
        setContent(loadedNote.content);
      }
    } catch (error) {
      console.error('Failed to load note:', error);
      Alert.alert('Error', 'Failed to load note');
    } finally {
      setIsLoading(false);
    }
  };

  const saveNote = async () => {
    try {
      if (noteId) {
        await databaseService.updateNote(noteId, {
          title: title || 'Untitled',
          content,
        });
      } else {
        // Create new note if it doesn't exist
        const newNoteId = await databaseService.createNote({
          title: title || 'Untitled',
          content,
          tags: [],
          lastModified: new Date(),
          created: new Date(),
        });
        navigation.setParams({ noteId: newNoteId });
      }
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  };

  const toggleFocusMode = () => {
    setIsFocusMode(!isFocusMode);

    if (!isFocusMode) {
      // Entering focus mode
      toolbarOpacity.value = withTiming(0, { duration: 300 });
      headerOpacity.value = withTiming(0, { duration: 300 });
    } else {
      // Exiting focus mode
      toolbarOpacity.value = withTiming(1, { duration: 300 });
      headerOpacity.value = withTiming(1, { duration: 300 });
    }
  };

  const insertText = (textToInsert: string, cursorOffset: number = 0) => {
    if (!contentRef.current) return;

    const newText =
      content.slice(0, cursorPosition) +
      textToInsert +
      content.slice(cursorPosition);

    setContent(newText);

    // Set cursor position after inserted text
    setTimeout(() => {
      if (contentRef.current) {
        const newCursorPos = cursorPosition + textToInsert.length + cursorOffset;
        contentRef.current.setNativeProps({
          selection: { start: newCursorPos, end: newCursorPos }
        });
        setCursorPosition(newCursorPos);
      }
    }, 10);
  };

  const formatSelection = (prefix: string, suffix: string = '') => {
    if (!contentRef.current) return;

    const selection = contentRef.current._lastNativeSelection;
    if (!selection) return;

    const { start, end } = selection;
    const selectedText = content.slice(start, end);
    const formattedText = prefix + selectedText + suffix;

    const newText =
      content.slice(0, start) +
      formattedText +
      content.slice(end);

    setContent(newText);

    // Set cursor position after formatting
    setTimeout(() => {
      if (contentRef.current) {
        const newEnd = start + formattedText.length;
        contentRef.current.setNativeProps({
          selection: { start: newEnd, end: newEnd }
        });
      }
    }, 10);
  };

  const insertMarkdownElement = (element: string) => {
    switch (element) {
      case 'bold':
        formatSelection('**', '**');
        break;
      case 'italic':
        formatSelection('*', '*');
        break;
      case 'heading':
        insertText('\n# ', 0);
        break;
      case 'bullet':
        insertText('\n- ', 0);
        break;
      case 'number':
        insertText('\n1. ', 0);
        break;
      case 'checkbox':
        insertText('\n- [ ] ', 0);
        break;
      case 'quote':
        insertText('\n> ', 0);
        break;
      case 'drawing':
        setIsDrawingMode(true);
        break;
    }
  };

  const handleDrawingComplete = (drawing: Drawing) => {
    setDrawings((prev) => [...prev, drawing]);
    setIsDrawingMode(false);

    // Insert drawing reference in text
    insertText(`\n[Drawing: ${drawing.id}]\n`, 0);
  };

  const handleDrawingCancel = () => {
    setIsDrawingMode(false);
  };

  const handleBack = async () => {
    if (title || content) {
      await saveNote();
    }
    navigation.goBack();
  };

  const toolbarAnimatedStyle = useAnimatedStyle(() => ({
    opacity: toolbarOpacity.value,
    transform: [
      {
        translateY: withTiming(isFocusMode ? 100 : 0, { duration: 300 }),
      },
    ],
  }));

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [
      {
        translateY: withTiming(isFocusMode ? -100 : 0, { duration: 300 }),
      },
    ],
  }));

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[styles.header, headerAnimatedStyle]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={[styles.backIcon, { color: theme.primary }]}>←</Text>
          </TouchableOpacity>

          <View style={styles.headerActions}>
            <TouchableOpacity onPress={toggleFocusMode} style={styles.actionButton}>
              <Text style={[styles.actionIcon, { color: theme.primary }]}>
                {isFocusMode ? '👁️' : '🎯'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
          <TextInput
            ref={titleRef}
            style={[
              styles.titleInput,
              { color: theme.text, borderBottomColor: theme.border }
            ]}
            placeholder="Note title..."
            placeholderTextColor={theme.textSecondary}
            value={title}
            onChangeText={setTitle}
            multiline
            fontSize={24}
            fontWeight="bold"
          />

          <TextInput
            ref={contentRef}
            style={[styles.contentInput, { color: theme.text }]}
            placeholder="Start writing..."
            placeholderTextColor={theme.textSecondary}
            value={content}
            onChangeText={setContent}
            onSelectionChange={(e) => setCursorPosition(e.nativeEvent.selection.start)}
            multiline
            scrollEnabled={false}
            textAlignVertical="top"
          />
        </ScrollView>

        <Animated.View style={[styles.toolbar, toolbarAnimatedStyle, { backgroundColor: theme.surface }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarContent}>
            <ToolbarButton
              icon="B"
              onPress={() => insertMarkdownElement('bold')}
              theme={theme}
              style={styles.boldButton}
            />
            <ToolbarButton
              icon="I"
              onPress={() => insertMarkdownElement('italic')}
              theme={theme}
              style={styles.italicButton}
            />
            <ToolbarButton
              icon="H"
              onPress={() => insertMarkdownElement('heading')}
              theme={theme}
            />
            <ToolbarButton
              icon="•"
              onPress={() => insertMarkdownElement('bullet')}
              theme={theme}
            />
            <ToolbarButton
              icon="1."
              onPress={() => insertMarkdownElement('number')}
              theme={theme}
            />
            <ToolbarButton
              icon="☐"
              onPress={() => insertMarkdownElement('checkbox')}
              theme={theme}
            />
            <ToolbarButton
              icon="❝"
              onPress={() => insertMarkdownElement('quote')}
              theme={theme}
            />
            <ToolbarButton
              icon="✏️"
              onPress={() => insertMarkdownElement('drawing')}
              theme={theme}
            />
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
      {isDrawingMode && (
        <DrawingCanvas
          onDrawingComplete={handleDrawingComplete}
          onClose={handleDrawingCancel}
        />
      )}
    </SafeAreaView>
  );
};

interface ToolbarButtonProps {
  icon: string;
  onPress: () => void;
  theme: any;
  style?: any;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ icon, onPress, theme, style }) => {
  const scale = useSharedValue(1);

  const handlePress = () => {
    scale.value = withSpring(0.8, {}, () => {
      scale.value = withSpring(1);
    });
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[
          styles.toolbarButton,
          { backgroundColor: theme.background, borderColor: theme.border },
          style,
        ]}
        onPress={handlePress}
      >
        <Text style={[styles.toolbarButtonText, { color: theme.text }]}>{icon}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  actionIcon: {
    fontSize: 20,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingVertical: 16,
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  contentInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: height * 0.6,
    textAlignVertical: 'top',
  },
  toolbar: {
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  toolbarContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  toolbarButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 40,
    alignItems: 'center',
  },
  toolbarButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  boldButton: {
    fontWeight: 'bold',
  },
  italicButton: {
    fontStyle: 'italic',
  },
});

export default NoteEditorScreen;