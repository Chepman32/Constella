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
  Keyboard,
  Image,
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
import DocumentPicker from 'react-native-document-picker';
import { launchImageLibrary } from 'react-native-image-picker';

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
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [lastInsertedImage, setLastInsertedImage] = useState<string | null>(null);
  const [showImageContextMenu, setShowImageContextMenu] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);

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

  const IMAGE_CONTEXT_MENU_ACTIONS = [
    { id: 'edit', label: 'Edit', icon: 'pencil', destructive: false },
    { id: 'copy', label: 'Copy', icon: 'content-copy', destructive: false },
    { id: 'cut', label: 'Cut', icon: 'content-cut', destructive: false },
    { id: 'remove', label: 'Remove', icon: 'delete-outline', destructive: true },
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

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
      }
    );
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

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



  const handleDrawingComplete = async (drawing: Drawing) => {
    setDrawings((prev) => [...prev, drawing]);
    setIsDrawingMode(false);

    if (!drawing.thumbnail) return;

    // If there was a background image, we need to replace it with the annotated version
    if (lastInsertedImage) {
      // Remove the last inserted image from content
      let updatedContent = content;

      // Find and remove the last occurrence of the image
      const imgRegex = new RegExp(
        `<img[^>]*src="${lastInsertedImage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`,
        'g'
      );

      // Get all matches
      const matches = updatedContent.match(imgRegex);
      if (matches && matches.length > 0) {
        // Remove the last match
        const lastMatch = matches[matches.length - 1];
        const lastIndex = updatedContent.lastIndexOf(lastMatch);
        updatedContent =
          updatedContent.substring(0, lastIndex) +
          updatedContent.substring(lastIndex + lastMatch.length);
      }

      // Add the annotated image
      updatedContent += `<img src="${drawing.thumbnail}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;" />`;

      // Update the content
      setContent(updatedContent);
      richEditorRef.current?.setContentHTML(updatedContent);

      HapticFeedback.trigger('impactLight');

      // Clear the last inserted image reference
      setLastInsertedImage(null);
    } else {
      // No background image, just insert the drawing
      richEditorRef.current?.insertHTML(
        `<img src="${drawing.thumbnail}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;" />`
      );
      HapticFeedback.trigger('impactLight');
    }
  };

  const handleDrawingCancel = () => {
    setIsDrawingMode(false);
    // Clear the last inserted image reference when canceling
    setLastInsertedImage(null);
  };

  

  const handleImageContextMenuAction = async (actionId: string) => {
    if (!selectedImageSrc) return;

    setShowImageContextMenu(false);

    switch (actionId) {
      case 'edit':
        // Set the selected image as the last inserted image and open drawing canvas
        setLastInsertedImage(selectedImageSrc);
        setIsDrawingMode(true);
        HapticFeedback.trigger('impactLight');
        break;
      case 'copy':
        try {
          Clipboard.setString(selectedImageSrc);
          HapticFeedback.trigger('impactLight');
        } catch (error) {
          console.error('Failed to copy image:', error);
        }
        break;
      case 'cut':
        try {
          Clipboard.setString(selectedImageSrc);
          // Remove the image from content
          const updatedContent = content.replace(
            new RegExp(`<img[^>]*src="${selectedImageSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`, 'g'),
            ''
          );
          setContent(updatedContent);
          richEditorRef.current?.setContentHTML(updatedContent);
          HapticFeedback.trigger('impactLight');
        } catch (error) {
          console.error('Failed to cut image:', error);
        }
        break;
      case 'remove':
        // Remove the image from content
        const updatedContent = content.replace(
          new RegExp(`<img[^>]*src="${selectedImageSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`, 'g'),
          ''
        );
        setContent(updatedContent);
        richEditorRef.current?.setContentHTML(updatedContent);
        HapticFeedback.trigger('impactLight');
        break;
    }

    setSelectedImageSrc(null);
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

                /* Checklist styles */
                ul.checklist {
                  list-style: none;
                  padding-left: 0;
                }
                ul.checklist li {
                  position: relative;
                  padding-left: 40px;
                  margin: 12px 0;
                  cursor: pointer;
                  user-select: none;
                }
                ul.checklist li input[type="checkbox"] {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 28px;
                  height: 28px;
                  cursor: pointer;
                  margin: 0;
                  transform: scale(1.3);
                }
                ul.checklist li.checked {
                  text-decoration: line-through;
                  opacity: 0.6;
                }
                ul.checklist li .delete-btn {
                  position: absolute;
                  right: 0;
                  top: 0;
                  padding: 4px 8px;
                  background: #ff3b30;
                  color: white;
                  border: none;
                  border-radius: 4px;
                  font-size: 12px;
                  cursor: pointer;
                  opacity: 0;
                  transition: opacity 0.2s;
                }
                ul.checklist li:hover .delete-btn {
                  opacity: 1;
                }
              `
            }}
            initialContentHTML={content}
            placeholder="Start writing..."
            onChange={(html: string) => setContent(html)}
            onPaste={() => {
              // Handle paste events if needed
            }}
            injectedJavaScript={`
              (function() {
                // Handle checkbox clicks
                document.addEventListener('click', function(e) {
                  if (e.target.type === 'checkbox' && e.target.closest('ul.checklist')) {
                    const li = e.target.closest('li');
                    if (e.target.checked) {
                      li.classList.add('checked');
                    } else {
                      li.classList.remove('checked');
                    }
                  }

                  // Handle delete button clicks
                  if (e.target.classList.contains('delete-btn')) {
                    const li = e.target.closest('li');
                    if (li) {
                      li.remove();
                    }
                  }
                });

                // Add context menu styling to images
                const images = document.querySelectorAll('img');
                images.forEach(function(img) {
                  img.style.cursor = 'pointer';
                  img.style.userSelect = 'none';
                  img.style.webkitUserSelect = 'none';
                });
              })();
            `}
          />
        </ScrollView>

        {isKeyboardVisible && !isFocusMode && (
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
              }}
              onPressAddImage={() => {
                // Handle image insertion if needed
              }}
            />
          </Animated.View>
        )}

        {!isKeyboardVisible && !isFocusMode && (
          <View style={[styles.bottomMenu, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={styles.bottomMenuButton}
              onPress={() => {
                richEditorRef.current?.insertHTML(
                  '<ul class="checklist"><li><input type="checkbox" /><span contenteditable="true">New task</span><button class="delete-btn">Delete</button></li></ul>'
                );
                HapticFeedback.trigger('impactLight');
              }}
            >
              <Icon name="checkbox-marked-outline" size={24} color={theme.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bottomMenuButton}
              onPress={async () => {
                Alert.alert(
                  'Add Attachment',
                  'Choose attachment type',
                  [
                    {
                      text: 'Image',
                      onPress: async () => {
                        try {
                          const result = await launchImageLibrary({
                            mediaType: 'photo',
                            quality: 0.8,
                            includeBase64: true,
                          });

                          if (!result.didCancel && result.assets && result.assets[0]) {
                            const asset = result.assets[0];
                            let imageUri = asset.uri;

                            // If we have base64, use data URI for better compatibility
                            if (asset.base64) {
                              const mimeType = asset.type || 'image/jpeg';
                              imageUri = `data:${mimeType};base64,${asset.base64}`;
                            }

                            // Save the image URI for drawing canvas
                            setLastInsertedImage(imageUri || asset.uri || null);

                            // Insert image with proper styling
                            richEditorRef.current?.insertHTML(
                              `<img src="${imageUri}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;" />`
                            );
                            HapticFeedback.trigger('impactLight');
                          }
                        } catch (error) {
                          console.error('Image picker error:', error);
                          Alert.alert('Error', 'Failed to select image');
                        }
                      },
                    },
                    {
                      text: 'Document',
                      onPress: async () => {
                        try {
                          const result = await DocumentPicker.pick({
                            type: [DocumentPicker.types.pdf, DocumentPicker.types.doc, DocumentPicker.types.docx],
                          });
                          if (result && result[0]) {
                            const fileName = result[0].name || 'Document';
                            richEditorRef.current?.insertHTML(
                              `<a href="${result[0].uri}" target="_blank">📎 ${fileName}</a>`
                            );
                            HapticFeedback.trigger('impactLight');
                          }
                        } catch (err) {
                          if (!DocumentPicker.isCancel(err)) {
                            console.error('Document picker error:', err);
                            Alert.alert('Error', 'Failed to select document');
                          }
                        }
                      },
                    },
                    {
                      text: 'Cancel',
                      style: 'cancel',
                    },
                  ]
                );
              }}
            >
              <Icon name="paperclip" size={24} color={theme.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bottomMenuButton}
              onPress={() => setIsDrawingMode(true)}
            >
              <Icon name="draw" size={24} color={theme.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bottomMenuButton}
              onPress={async () => {
                try {
                  // Save current note
                  await saveNote();

                  // Navigate to create a new note
                  navigation.push('Editor', { noteId: undefined, folderId: note?.folderId });
                  HapticFeedback.trigger('impactLight');
                } catch (error) {
                  console.error('Failed to create new note:', error);
                  Alert.alert(t('common.error'), 'Failed to create new note');
                }
              }}
            >
              <Icon name="note-plus-outline" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
      {isDrawingMode && (
        <Modal
          visible={isDrawingMode}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={handleDrawingCancel}
        >
          <DrawingCanvas
            onDrawingComplete={handleDrawingComplete}
            onClose={handleDrawingCancel}
            backgroundImage={lastInsertedImage || undefined}
          />
        </Modal>
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
                    <Icon
                      name={action.icon}
                      size={22}
                      style={styles.contextMenuIcon}
                      color={action.destructive ? '#d62d20' : theme.text}
                    />
                    <Text
                      style={[
                        styles.contextMenuActionLabel,
                        action.destructive ? styles.destructiveText : { color: theme.text },
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

      {/* Image Context Menu Modal */}
      <Modal
        visible={showImageContextMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImageContextMenu(false)}
      >
        <View style={styles.contextMenuWrapper}>
          <TouchableWithoutFeedback onPress={() => setShowImageContextMenu(false)}>
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
                Image Options
              </Text>

              <View style={[styles.contextMenuActions, { borderColor: theme.border }]}>
                {IMAGE_CONTEXT_MENU_ACTIONS.map((action) => (
                  <TouchableOpacity
                    key={action.id}
                    onPress={() => handleImageContextMenuAction(action.id)}
                    style={[
                      styles.contextMenuAction,
                      action.destructive && { borderColor: theme.border }
                    ]}
                  >
                    <Icon
                      name={action.icon}
                      size={22}
                      style={styles.contextMenuIcon}
                      color={action.destructive ? '#d62d20' : theme.text}
                    />
                    <Text
                      style={[
                        styles.contextMenuActionLabel,
                        action.destructive ? styles.destructiveText : { color: theme.text },
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
    top: 90,
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
  destructiveText: {
    color: '#d62d20',
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
  bottomMenu: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  bottomMenuButton: {
    padding: 12,
    borderRadius: 8,
  },
});

export default NoteEditorScreen;