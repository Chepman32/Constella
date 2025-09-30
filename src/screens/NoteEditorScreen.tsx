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
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { databaseService } from '../services/DatabaseService';
import { Note, Drawing } from '../types';

import DrawingCanvas from '../components/DrawingCanvas';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import Clipboard from '@react-native-clipboard/clipboard';
import HapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface NoteEditorScreenProps {
  navigation: any;
  route: any;
}

const { width, height } = Dimensions.get('window');

const NoteEditorScreen: React.FC<NoteEditorScreenProps> = ({ navigation, route }) => {
  const { theme, themeName } = useTheme();
  const { t } = useLocalization();
  const { noteId, folderId } = route.params || {};

  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [showContextMenu, setShowContextMenu] = useState(false);

  const titleRef = useRef<TextInput>(null);
  const richEditorRef = useRef<RichEditor>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  const toolbarOpacity = useSharedValue(1);
  const headerOpacity = useSharedValue(1);

  const CONTEXT_MENU_ACTIONS = [
    { id: 'focus', label: t('editor.actions.focusMode'), icon: 'eye-outline', destructive: false },
    { id: 'copy', label: t('notes.actions.copy'), icon: 'content-copy', destructive: false },
    { id: 'share', label: t('notes.actions.share'), icon: 'share-variant-outline', destructive: false },
    { id: 'delete', label: t('notes.actions.delete'), icon: 'delete-outline', destructive: true },
  ] as const;

  const saveNote = useCallback(async () => {
    try {
      if (noteId) {
        await databaseService.updateNote(noteId, {
          title: title,
          content,
        });
      }
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  }, [noteId, title, content]);

  const loadNote = useCallback(async (id: string) => {
    try {
      const loadedNote = await databaseService.getNote(id);
      if (loadedNote) {
        setNote(loadedNote);
        setTitle(loadedNote.title);
        setContent(loadedNote.content);
        // Update rich editor content
        if (richEditorRef.current) {
          richEditorRef.current.setContentHTML(loadedNote.content || '');
        }
      }
    } catch (error) {
      console.error('Failed to load note:', error);
      Alert.alert('Error', 'Failed to load note');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initializeNewNote = async () => {
      try {
        const newNoteId = await databaseService.createNote({
          title: '',
          content: '',
          tags: [],
          lastModified: new Date(),
          created: new Date(),
          folderId: folderId || undefined,
        });
        navigation.setParams({ noteId: newNoteId, folderId: undefined });
        loadNote(newNoteId);
      } catch (error) {
        console.error('Failed to initialize new note:', error);
        Alert.alert('Error', 'Failed to create a new note.');
        navigation.goBack();
      }
    };

    if (noteId) {
      loadNote(noteId);
    } else {
      initializeNewNote();
    }
  }, [noteId, folderId, navigation, loadNote]);

  useEffect(() => {
    // Auto-save functionality
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveNote();
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, content, saveNote]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setShowContextMenu(true)}
          style={styles.actionButton}
        >
          <Text style={[styles.actionIcon, { color: theme.primary }]}>⋯</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, theme]);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', () => {
        saveNote();
      }),
    [navigation, saveNote]
  );

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



  const handleDrawingComplete = (drawing: Drawing) => {
    setDrawings((prev) => [...prev, drawing]);
    setIsDrawingMode(false);

    
  };

  const handleDrawingCancel = () => {
    setIsDrawingMode(false);
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
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
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

          <RichEditor
            ref={richEditorRef}
            style={[styles.richEditor, { backgroundColor: theme.background }]}
            containerStyle={styles.richEditorContainer}
            editorStyle={{
              backgroundColor: theme.background,
              color: theme.text,
              contentCSSText: `
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  font-size: 16px;
                  line-height: 1.5;
                  color: ${theme.text};
                  background-color: ${theme.background};
                  margin: 0;
                  padding: 12px;
                }
                * { box-sizing: border-box; }
                h1, h2, h3, h4, h5, h6 { margin: 16px 0 8px 0; }
                p { margin: 8px 0; }
                ul, ol { margin: 8px 0; padding-left: 24px; }
                blockquote {
                  margin: 8px 0;
                  padding: 8px 16px;
                  border-left: 3px solid ${theme.accent};
                  font-style: italic;
                  background-color: ${theme.surface};
                }
              `
            }}
            initialContentHTML={content}
            placeholder="Start writing..."
            onChange={(html: string) => setContent(html)}
            onPaste={() => {
              // Handle paste events if needed
            }}
          />
        </ScrollView>

        <Animated.View style={[styles.toolbar, toolbarAnimatedStyle]}>
          <RichToolbar
            editor={richEditorRef}
            style={[styles.richToolbar, { backgroundColor: theme.surface }]}
            iconTint={theme.text}
            selectedIconTint={theme.primary}
            selectedButtonStyle={{ backgroundColor: theme.primary + '20' }}
            actions={[
              actions.setBold,
              actions.setItalic,
              actions.heading1,
              actions.heading2,
              actions.heading3,
              actions.insertBulletsList,
              actions.insertOrderedList,
              actions.blockquote,
              'insertDrawing'
            ]}
            iconMap={{
              [actions.setBold]: ({ tintColor }: any) => <Text style={[styles.toolbarIcon, { color: tintColor }]}>B</Text>,
              [actions.setItalic]: ({ tintColor }: any) => <Text style={[styles.toolbarIcon, { color: tintColor, fontStyle: 'italic' }]}>I</Text>,
              [actions.heading1]: ({ tintColor }: any) => <Text style={[styles.toolbarIcon, { color: tintColor }]}>H1</Text>,
              [actions.heading2]: ({ tintColor }: any) => <Text style={[styles.toolbarIcon, { color: tintColor }]}>H2</Text>,
              [actions.heading3]: ({ tintColor }: any) => <Text style={[styles.toolbarIcon, { color: tintColor }]}>H3</Text>,
              [actions.insertBulletsList]: ({ tintColor }: any) => <Text style={[styles.toolbarIcon, { color: tintColor }]}>•</Text>,
              [actions.insertOrderedList]: ({ tintColor }: any) => <Text style={[styles.toolbarIcon, { color: tintColor }]}>1.</Text>,
              [actions.blockquote]: ({ tintColor }: any) => <Text style={[styles.toolbarIcon, { color: tintColor }]}>❝</Text>,
              insertDrawing: ({ tintColor }: any) => <Text style={[styles.toolbarIcon, { color: tintColor }]}>✏️</Text>,
            }}
            onPressAddImage={() => {
              // Handle image insertion if needed
            }}
            insertDrawing={() => setIsDrawingMode(true)}
          />
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
                    <Icon name={action.icon} size={22} style={styles.contextMenuIcon} color={action.destructive ? '#d62d20' : theme.text} />
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
  toolbar: {
    paddingVertical: 12,
    borderTopWidth: 1,
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
  richEditor: {
    flex: 1,
    minHeight: height * 0.6,
  },
  richEditorContainer: {
    flex: 1,
  },
  richToolbar: {
    borderTopWidth: 1,
    paddingVertical: 8,
  },
  toolbarIcon: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    minWidth: 24,
  },
});

export default NoteEditorScreen;