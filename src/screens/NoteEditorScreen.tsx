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
  Modal,
  TouchableWithoutFeedback,
  Share,
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
import { useLocalization } from '../contexts/LocalizationContext';
import { databaseService } from '../services/DatabaseService';
import { Note, Drawing } from '../types';
import { generateId } from '../utils';
import DrawingCanvas from '../components/DrawingCanvas';
import Clipboard from '@react-native-clipboard/clipboard';
import HapticFeedback from 'react-native-haptic-feedback';

interface NoteEditorScreenProps {
  navigation: any;
  route: any;
}

const { width, height } = Dimensions.get('window');

const NoteEditorScreen: React.FC<NoteEditorScreenProps> = ({ navigation, route }) => {
  const { theme, themeName } = useTheme();
  const { t } = useLocalization();
  const { noteId } = route.params || {};

  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [showContextMenu, setShowContextMenu] = useState(false);

  const titleRef = useRef<TextInput>(null);
  const contentRef = useRef<TextInput>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  const toolbarOpacity = useSharedValue(1);
  const headerOpacity = useSharedValue(1);

  const CONTEXT_MENU_ACTIONS = [
    { id: 'focus', label: t('editor.actions.focusMode'), icon: '👁️', destructive: false },
    { id: 'copy', label: t('notes.actions.copy'), icon: '📋', destructive: false },
    { id: 'share', label: t('notes.actions.share'), icon: '📤', destructive: false },
    { id: 'delete', label: t('notes.actions.delete'), icon: '🗑️', destructive: true },
  ] as const;

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

    // Set cursor position after inserted text and refocus
    setTimeout(() => {
      if (contentRef.current) {
        const newCursorPos = cursorPosition + textToInsert.length + cursorOffset;
        contentRef.current.focus();
        contentRef.current.setNativeProps({
          selection: { start: newCursorPos, end: newCursorPos }
        });
        setCursorPosition(newCursorPos);
      }
    }, 10);
  };

  const formatSelection = (prefix: string, suffix: string = '') => {
    // Formatting functionality disabled
    return;
  };

  const insertMarkdownElement = (element: string) => {
    // All formatting functionality disabled
    return;
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

  const handleContextMenuAction = async (actionId: string) => {
    setShowContextMenu(false);

    switch (actionId) {
      case 'focus':
        toggleFocusMode();
        break;
      case 'copy':
        try {
          const textContent = title + '\n\n' + content;
          Clipboard.setString(textContent);
          HapticFeedback.trigger('impactLight');
        } catch (error) {
          console.error('Failed to copy note:', error);
        }
        break;
      case 'share':
        try {
          const textContent = title + '\n\n' + content;
          await Share.share({
            message: textContent,
            title: title || t('notes.untitled'),
          });
        } catch (error) {
          console.error('Failed to share note:', error);
        }
        break;
      case 'delete':
        if (noteId) {
          Alert.alert(
            t('notes.delete.title'),
            t('notes.delete.message'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('common.delete'),
                style: 'destructive',
                onPress: async () => {
                  try {
                    await databaseService.deleteNote(noteId);
                    navigation.goBack();
                  } catch (error) {
                    console.error('Failed to delete note:', error);
                    Alert.alert(t('common.error'), t('errors.deleteNote'));
                  }
                },
              },
            ]
          );
        }
        break;
    }
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
            <TouchableOpacity
              onPress={() => setShowContextMenu(true)}
              style={styles.actionButton}
            >
              <Text style={[styles.actionIcon, { color: theme.primary }]}>⋯</Text>
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
          />

          <TextInput
            ref={contentRef}
            style={[styles.contentInput, { color: theme.text }]}
            placeholder="Start writing..."
            placeholderTextColor={theme.textSecondary}
            value={content}
            onChangeText={setContent}
            onSelectionChange={(e) => {
              const { start, end } = e.nativeEvent.selection;
              setCursorPosition(start);
              setSelection({ start, end });
            }}
            multiline
            scrollEnabled={false}
            textAlignVertical="top"
          />
        </ScrollView>

        <Animated.View style={[styles.toolbar, toolbarAnimatedStyle, { backgroundColor: theme.surface }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.toolbarContent}
            keyboardShouldPersistTaps="always"
          >
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

      <Modal
        visible={showContextMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowContextMenu(false)}
      >
        <View style={styles.contextMenuWrapper}>
          <TouchableWithoutFeedback onPress={() => setShowContextMenu(false)}>
            <View style={[StyleSheet.absoluteFillObject, styles.contextMenuBackdrop]} />
          </TouchableWithoutFeedback>

          <View style={styles.contextMenuContainer}>
            <Animated.View
              style={[
                styles.contextMenuContent,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.contextMenuTitle, { color: theme.text }]}>
                {title || t('notes.untitled')}
              </Text>

              <View style={[styles.contextMenuActions, { borderColor: theme.border }]}>
                {CONTEXT_MENU_ACTIONS.map((action) => (
                  <TouchableOpacity
                    key={action.id}
                    onPress={() => handleContextMenuAction(action.id)}
                    style={[
                      styles.contextMenuAction,
                      action.destructive && { borderColor: theme.border }
                    ]}
                  >
                    <Text style={styles.contextMenuIcon}>{action.icon}</Text>
                    <Text
                      style={[
                        styles.contextMenuActionLabel,
                        { color: action.destructive ? '#d62d20' : theme.text },
                      ]}
                    >
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          </View>
        </View>
      </Modal>
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
    scale.value = withSpring(0.8, { duration: 100 });
    setTimeout(() => {
      scale.value = withSpring(1, { duration: 100 });
    }, 100);

    // Prevent keyboard from dismissing by not calling onPress immediately
    setTimeout(() => {
      onPress();
    }, 0);
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
        activeOpacity={0.7}
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
  contextMenuWrapper: {
    flex: 1,
  },
  contextMenuBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  contextMenuContainer: {
    position: 'absolute',
    top: 130,
    right: 20,
    width: 250,
  },
  contextMenuContent: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  contextMenuTitle: {
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    textAlign: 'center',
  },
  contextMenuActions: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  contextMenuAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  contextMenuIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  contextMenuActionLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default NoteEditorScreen;