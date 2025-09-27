import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { databaseService } from '../services/DatabaseService';
import { Note } from '../types';
import { formatDate, truncateText } from '../utils';
import HapticFeedback from 'react-native-haptic-feedback';

interface SpatialCanvasScreenProps {
  navigation: any;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const GRID_LINE_COUNT = 80;
const GRID_SPACING = 120;
const GRID_EXTENT = (GRID_LINE_COUNT / 2) * GRID_SPACING;
const NOTE_NODE_WIDTH = 200;
const NOTE_NODE_HEIGHT = 150;

interface CanvasContextMenuAction {
  id: 'layer-up' | 'layer-down' | 'pin' | 'remove';
  label: string;
  icon: string;
  destructive?: boolean;
}

const CANVAS_CONTEXT_MENU_ACTIONS: readonly CanvasContextMenuAction[] = [
  { id: 'layer-up', label: 'Layer', icon: '⬆️' },
  { id: 'layer-down', label: 'Layer down', icon: '⬇️' },
  { id: 'pin', label: 'Pin', icon: '📌' },
  { id: 'remove', label: 'Remove from canvas', icon: '🗑️', destructive: true },
];

type CanvasContextMenuActionId = CanvasContextMenuAction['id'];

interface CanvasContextMenuState {
  node: NoteNode;
  position: { x: number; y: number };
}

interface NoteNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  note: Note;
  scale: number;
  isPinned: boolean;
}

const SpatialCanvasScreen: React.FC<SpatialCanvasScreenProps> = ({ navigation }) => {
  const { theme, themeName } = useTheme();

  const [notes, setNotes] = useState<Note[]>([]);
  const [noteNodes, setNoteNodes] = useState<NoteNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isNotePickerVisible, setNotePickerVisible] = useState(false);
  const [contextMenuState, setContextMenuState] = useState<CanvasContextMenuState | null>(null);
  const [menuLayout, setMenuLayout] = useState({ width: 0, height: 0 });

  const canvasPanEnabled = useSharedValue(true);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const lastTranslateX = useSharedValue(0);
  const lastTranslateY = useSharedValue(0);
  const lastScale = useSharedValue(1);

  const dragStartRef = useRef<Record<string, { x: number; y: number }>>({});
  const noteNodesRef = useRef<NoteNode[]>([]);
  const windowDimensions = useWindowDimensions();

  useEffect(() => {
    noteNodesRef.current = noteNodes;
  }, [noteNodes]);


  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const allNotes = await databaseService.getAllNotes();
      setNotes(allNotes);

      const positionedNotes = allNotes.filter((note) => note.position);

      const nodes: NoteNode[] = positionedNotes.map((note) => ({
        id: note.id,
        x: note.position!.x,
        y: note.position!.y,
        width: NOTE_NODE_WIDTH,
        height: NOTE_NODE_HEIGHT,
        note,
        scale: 1,
        isPinned: false,
      }));

      setNoteNodes(nodes);
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      if (!canvasPanEnabled.value) {
        return;
      }
      lastTranslateX.value = translateX.value;
      lastTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      if (!canvasPanEnabled.value) {
        return;
      }
      translateX.value = lastTranslateX.value + event.translationX;
      translateY.value = lastTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      // Optional: add momentum or snap to bounds
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      lastScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = Math.max(0.1, Math.min(5, lastScale.value * event.scale));
    })
    .onEnd(() => {
      // Optionally snap to certain zoom levels
      if (scale.value < 0.5) {
        scale.value = withSpring(0.5);
      } else if (scale.value > 3) {
        scale.value = withSpring(3);
      }
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const canvasAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const availableNotes = useMemo(
    () => notes.filter((note) => !noteNodes.some((node) => node.id === note.id)),
    [notes, noteNodes]
  );

  const handleNodeDragStartJS = useCallback((nodeId: string) => {
    const node = noteNodesRef.current.find((n) => n.id === nodeId);
    if (!node) return;
    dragStartRef.current[nodeId] = { x: node.x, y: node.y };
    setSelectedNode(nodeId);
  }, []);

  const handleNodeDragUpdateJS = useCallback((nodeId: string, deltaX: number, deltaY: number) => {
    const start = dragStartRef.current[nodeId];
    if (!start) return;

    const newX = start.x + deltaX;
    const newY = start.y + deltaY;

    setNoteNodes((prev) =>
      prev.map((node) => (node.id === nodeId ? { ...node, x: newX, y: newY } : node))
    );
  }, []);

  const persistNotePosition = useCallback((noteId: string, position: { x: number; y: number }) => {
    void databaseService.updateNotePosition(noteId, position).catch((error) => {
      console.error('Failed to update note position:', error);
    });
  }, []);

  const handleNodeDragEndJS = useCallback(
    (nodeId: string, deltaX: number, deltaY: number) => {
      const start = dragStartRef.current[nodeId];
      if (!start) return;

      const newX = start.x + deltaX;
      const newY = start.y + deltaY;

      dragStartRef.current[nodeId] = { x: newX, y: newY };

      setNoteNodes((prev) =>
        prev.map((node) => (node.id === nodeId ? { ...node, x: newX, y: newY } : node))
      );

      const updatedPosition = { x: newX, y: newY };

      setNotes((prev) =>
        prev.map((note) =>
          note.id === nodeId
            ? { ...note, position: updatedPosition, lastModified: new Date() }
            : note
        )
      );

      persistNotePosition(nodeId, updatedPosition);
    },
    [persistNotePosition]
  );

  const handleNodeDragFinalizeJS = useCallback((nodeId: string) => {
    delete dragStartRef.current[nodeId];
  }, []);

  const contextMenuStateRef = useRef<CanvasContextMenuState | null>(null);

  useEffect(() => {
    contextMenuStateRef.current = contextMenuState;
  }, [contextMenuState]);

  const closeContextMenu = useCallback(() => {
    setContextMenuState(null);
    canvasPanEnabled.value = true;
  }, [canvasPanEnabled]);

  const openNodeContextMenu = useCallback((nodeId: string, x: number, y: number) => {
    const node = noteNodesRef.current.find((n) => n.id === nodeId);
    if (!node) {
      return;
    }

    canvasPanEnabled.value = false;
    HapticFeedback.trigger('impactMedium');
    setSelectedNode(nodeId);
    setContextMenuState({
      node,
      position: { x, y },
    });
  }, [canvasPanEnabled]);

  const handleLongPressFinalize = useCallback(() => {
    if (!contextMenuStateRef.current) {
      canvasPanEnabled.value = true;
    }
  }, [canvasPanEnabled]);

  const handleCanvasMenuAction = useCallback(
    async (actionId: CanvasContextMenuActionId) => {
      if (!contextMenuState) {
        return;
      }

      const { node } = contextMenuState;
      closeContextMenu();
      HapticFeedback.trigger('impactLight');

      switch (actionId) {
        case 'layer-up':
          setNoteNodes((prev) => {
            const index = prev.findIndex((item) => item.id === node.id);
            if (index === -1 || index === prev.length - 1) {
              return prev;
            }

            const updated = [...prev];
            const [target] = updated.splice(index, 1);
            updated.push(target);
            return updated;
          });
          break;

        case 'layer-down':
          setNoteNodes((prev) => {
            const index = prev.findIndex((item) => item.id === node.id);
            if (index <= 0) {
              return prev;
            }

            const updated = [...prev];
            const [target] = updated.splice(index, 1);
            updated.unshift(target);
            return updated;
          });
          break;

        case 'pin':
          setNoteNodes((prev) =>
            prev.map((item) =>
              item.id === node.id ? { ...item, isPinned: !item.isPinned } : item
            )
          );
          break;

        case 'remove':
          setNoteNodes((prev) => prev.filter((item) => item.id !== node.id));
          const removalTimestamp = new Date();
          setNotes((prev) =>
            prev.map((item) =>
              item.id === node.id
                ? { ...item, position: undefined, lastModified: removalTimestamp }
                : item
            )
          );
          if (selectedNode === node.id) {
            setSelectedNode(null);
          }
          delete dragStartRef.current[node.id];

          try {
            await databaseService.updateNotePosition(node.id, null);
          } catch (error) {
            console.error('Failed to remove note from canvas:', error);
          }
          break;
      }
    },
    [closeContextMenu, contextMenuState, selectedNode]
  );

  const computeInsertionPoint = () => {
    const safeScale = Math.max(scale.value, 0.1);
    const currentTranslateX = translateX.value;
    const currentTranslateY = translateY.value;

    const x = screenWidth / (2 * safeScale) - currentTranslateX - NOTE_NODE_WIDTH / 2;
    const y = screenHeight / (2 * safeScale) - currentTranslateY - NOTE_NODE_HEIGHT / 2;

    return { x, y };
  };

  const derivedContextMenuActions = useMemo(() => {
    if (!contextMenuState) {
      return CANVAS_CONTEXT_MENU_ACTIONS;
    }

    return CANVAS_CONTEXT_MENU_ACTIONS.map((action): CanvasContextMenuAction => {
      if (action.id === 'pin') {
        const isPinned = contextMenuState.node.isPinned;
        return {
          ...action,
          label: isPinned ? 'Unpin' : 'Pin',
          icon: isPinned ? '📍' : '📌',
        };
      }
      return action;
    });
  }, [contextMenuState]);

  const menuPosition = useMemo(() => {
    if (!contextMenuState) {
      return { top: 0, left: 0 };
    }

    const { width: screenWidth, height: screenHeight } = windowDimensions;
    const estimatedWidth = menuLayout.width || 220;
    const estimatedHeight = menuLayout.height || 200;
    const margin = 16;

    const preferredTop = contextMenuState.position.y + 12;
    const preferredLeft = contextMenuState.position.x - estimatedWidth / 2;

    const maxTop = screenHeight - margin - estimatedHeight;
    const maxLeft = screenWidth - margin - estimatedWidth;

    const top = Math.min(Math.max(preferredTop, margin), Math.max(margin, maxTop));
    const left = Math.min(Math.max(preferredLeft, margin), Math.max(margin, maxLeft));

    return { top, left };
  }, [contextMenuState, menuLayout, windowDimensions]);

  const handleNodePress = async (nodeId: string) => {
    const node = noteNodes.find(n => n.id === nodeId);
    if (node) {
      // Animate to center the node
      translateX.value = withSpring(-node.x + screenWidth / 2);
      translateY.value = withSpring(-node.y + screenHeight / 2);
      scale.value = withSpring(1.5);

      setSelectedNode(nodeId);

      // Open note after animation
      setTimeout(() => {
        navigation.navigate('Editor', { noteId: nodeId });
      }, 500);
    }
  };

  const createNewNote = async () => {
    try {
      const position = computeInsertionPoint();

      const noteId = await databaseService.createNote({
        title: 'New Note',
        content: '',
        tags: [],
        lastModified: new Date(),
        created: new Date(),
        position,
      });

      // Reload notes to show the new one
      await loadNotes();

      // Navigate to editor
      navigation.navigate('Editor', { noteId });
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const handleAddNoteToCanvas = async (note: Note) => {
    if (noteNodes.some((node) => node.id === note.id)) {
      setNotePickerVisible(false);
      return;
    }

    const position = computeInsertionPoint();

    const updatedNote: Note = {
      ...note,
      position,
      lastModified: new Date(),
    };

    setNoteNodes((prev) => [
      ...prev,
      {
        id: note.id,
        x: position.x,
        y: position.y,
        width: NOTE_NODE_WIDTH,
        height: NOTE_NODE_HEIGHT,
        note: updatedNote,
        scale: 1,
        isPinned: false,
      },
    ]);

    setNotes((prev) => prev.map((n) => (n.id === note.id ? updatedNote : n)));
    setSelectedNode(note.id);
    setNotePickerVisible(false);

    try {
      await databaseService.updateNotePosition(note.id, position);
    } catch (error) {
      console.error('Failed to update note position:', error);
    }
  };

  const handleCreateNoteFromPicker = async () => {
    setNotePickerVisible(false);
    await createNewNote();
  };

  const resetView = () => {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    scale.value = withSpring(1);
  };

  const zoomToFitAll = () => {
    if (noteNodes.length === 0) return;

    // Calculate bounding box of all notes
    const bounds = noteNodes.reduce(
      (acc, node) => ({
        minX: Math.min(acc.minX, node.x),
        maxX: Math.max(acc.maxX, node.x + node.width),
        minY: Math.min(acc.minY, node.y),
        maxY: Math.max(acc.maxY, node.y + node.height),
      }),
      {
        minX: Infinity,
        maxX: -Infinity,
        minY: Infinity,
        maxY: -Infinity,
      }
    );

    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    // Calculate scale to fit with padding
    const padding = 100;
    const scaleX = (screenWidth - padding * 2) / contentWidth;
    const scaleY = (screenHeight - padding * 2) / contentHeight;
    const newScale = Math.min(Math.min(scaleX, scaleY), 1);

    // Animate to center and scale
    scale.value = withSpring(newScale);
    translateX.value = withSpring(-centerX * newScale + screenWidth / 2);
    translateY.value = withSpring(-centerY * newScale + screenHeight / 2);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: theme.primary }]}>← Back</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: theme.text }]}>Canvas</Text>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={resetView} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, { color: theme.primary }]}>🎯</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={zoomToFitAll} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, { color: theme.primary }]}>🔍</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Canvas */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={styles.canvasContainer}>
          <Animated.View style={[styles.canvas, canvasAnimatedStyle]}>
            <View style={styles.backgroundGrid} pointerEvents="none">
              {Array.from({ length: GRID_LINE_COUNT }, (_, i) => {
                const offset = (i - GRID_LINE_COUNT / 2) * GRID_SPACING;
                const color = theme.border + '20';

                return (
                  <React.Fragment key={`grid-${i}`}>
                    <View
                      style={[
                        styles.gridLineVertical,
                        { left: offset, backgroundColor: color },
                      ]}
                    />
                    <View
                      style={[
                        styles.gridLineHorizontal,
                        { top: offset, backgroundColor: color },
                      ]}
                    />
                  </React.Fragment>
                );
              })}
            </View>

            {noteNodes.map((node) => {
              const notePanGesture = Gesture.Pan()
                .onBegin(() => {
                  canvasPanEnabled.value = false;
                  runOnJS(handleNodeDragStartJS)(node.id);
                })
                .onUpdate((event) => {
                  const currentScale = scale.value;
                  runOnJS(handleNodeDragUpdateJS)(
                    node.id,
                    event.translationX / currentScale,
                    event.translationY / currentScale,
                  );
                })
                .onEnd((event) => {
                  const currentScale = scale.value;
                  canvasPanEnabled.value = true;
                  runOnJS(handleNodeDragEndJS)(
                    node.id,
                    event.translationX / currentScale,
                    event.translationY / currentScale,
                  );
                })
                .onFinalize(() => {
                  canvasPanEnabled.value = true;
                  runOnJS(handleNodeDragFinalizeJS)(node.id);
                })
                .enabled(!node.isPinned)
                .minDistance(1);

              const noteLongPressGesture = Gesture.LongPress()
                .minDuration(450)
                .onStart((event) => {
                  runOnJS(openNodeContextMenu)(node.id, event.absoluteX, event.absoluteY);
                })
                .onFinalize(() => {
                  runOnJS(handleLongPressFinalize)();
                });

              const noteGesture = Gesture.Race(notePanGesture, noteLongPressGesture);

              return (
                <GestureDetector key={node.id} gesture={noteGesture}>
                  <TouchableOpacity
                    style={[
                      styles.noteNode,
                      {
                        left: node.x,
                        top: node.y,
                        width: node.width,
                        height: node.height,
                        backgroundColor: theme.surface,
                        borderColor: selectedNode === node.id ? theme.primary : theme.border,
                        transform: [{ scale: node.scale }],
                      },
                    ]}
                    onPress={() => handleNodePress(node.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.noteTitle, { color: theme.text }]}>
                      {node.note.title || 'Untitled'}
                    </Text>

                    <Text style={[styles.notePreview, { color: theme.textSecondary }]}>
                      {truncateText(node.note.content || '', 100)}
                    </Text>

                    <Text style={[styles.noteDate, { color: theme.textSecondary }]}>
                      {formatDate(node.note.lastModified)}
                    </Text>

                    {/* Connection Lines (if any) */}
                    {/* TODO: Implement based on note links */}
                  </TouchableOpacity>
                </GestureDetector>
              );
            })}
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => setNotePickerVisible(true)}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <Modal
        visible={isNotePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotePickerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContainer, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add note to canvas</Text>
              <TouchableOpacity onPress={() => setNotePickerVisible(false)} style={styles.modalCloseButton}>
                <Text style={[styles.modalCloseText, { color: theme.textSecondary }]}>×</Text>
              </TouchableOpacity>
            </View>

            {availableNotes.length === 0 ? (
              <View style={styles.modalEmptyState}>
                <Text style={[styles.modalEmptyText, { color: theme.textSecondary }]}>No more notes to add.</Text>
              </View>
            ) : (
              <FlatList
                data={availableNotes}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.notePickerItem, { borderColor: theme.border }]}
                    onPress={() => handleAddNoteToCanvas(item)}
                  >
                    <Text
                      style={[styles.notePickerTitle, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {item.title || 'Untitled'}
                    </Text>
                    <Text
                      style={[styles.notePickerPreview, { color: theme.textSecondary }]}
                      numberOfLines={1}
                    >
                      {truncateText(item.content || '', 80)}
                    </Text>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => (
                  <View style={[styles.notePickerDivider, { backgroundColor: theme.border + '40' }]} />
                )}
                style={styles.notePickerList}
              />
            )}

            <TouchableOpacity
              style={[styles.modalCreateButton, { backgroundColor: theme.primary }]}
              onPress={handleCreateNoteFromPicker}
            >
              <Text style={styles.modalCreateButtonText}>Create new note</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!contextMenuState}
        transparent
        animationType="fade"
        onRequestClose={closeContextMenu}
      >
        <View style={styles.contextMenuOverlay}>
          <TouchableWithoutFeedback onPress={closeContextMenu}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          {contextMenuState && (
            <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
              <Animated.View
                style={[
                  styles.contextMenuContainer,
                  {
                    top: menuPosition.top,
                    left: menuPosition.left,
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                  },
                ]}
                onLayout={(event) => {
                  const { width, height } = event.nativeEvent.layout;
                  if (
                    menuLayout.width !== width ||
                    menuLayout.height !== height
                  ) {
                    setMenuLayout({ width, height });
                  }
                }}
              >
                <View style={styles.contextMenuHeader}>
                  <Text
                    style={[styles.contextMenuTitle, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {contextMenuState.node.note.title || 'Untitled'}
                  </Text>
                  <Text style={[styles.contextMenuDate, { color: theme.textSecondary }]}
                    numberOfLines={1}
                  >
                    {formatDate(contextMenuState.node.note.lastModified)}
                  </Text>
                </View>

                <View style={[styles.contextMenuActions, { borderColor: theme.border }]}
                >
                  {derivedContextMenuActions.map((action) => (
                    <Pressable
                      key={action.id}
                      onPress={() => handleCanvasMenuAction(action.id)}
                      style={({ pressed }) => [
                        styles.contextMenuAction,
                        pressed && {
                          backgroundColor:
                            themeName === 'dark'
                              ? 'rgba(255, 255, 255, 0.08)'
                              : 'rgba(0, 0, 0, 0.06)',
                        },
                      ]}
                    >
                      <Text style={styles.contextMenuActionIcon}>{action.icon}</Text>
                      <Text
                        style={[
                          styles.contextMenuActionLabel,
                          {
                            color:
                              action.destructive
                                ? '#d62d20'
                                : theme.text,
                          },
                        ]}
                      >
                        {action.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Animated.View>
            </View>
          )}
        </View>
      </Modal>

      {/* Instructions */}
      {noteNodes.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
            Welcome to Canvas Mode
          </Text>
          <Text style={[styles.emptyStateSubtitle, { color: theme.textSecondary }]}>
            Create notes and organize them spatially{'\n'}
            Pinch to zoom, drag to pan
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerButton: {
    padding: 8,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  canvasContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
    position: 'relative',
  },
  backgroundGrid: {
    position: 'absolute',
    top: -GRID_EXTENT,
    left: -GRID_EXTENT,
    width: GRID_EXTENT * 2,
    height: GRID_EXTENT * 2,
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
  },
  gridLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  noteNode: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  notePreview: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
    marginBottom: 8,
  },
  noteDate: {
    fontSize: 10,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '70%',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 22,
    fontWeight: '600',
  },
  modalEmptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 14,
  },
  notePickerList: {
    marginBottom: 16,
  },
  notePickerItem: {
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  notePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notePickerPreview: {
    fontSize: 12,
  },
  notePickerDivider: {
    height: 8,
  },
  modalCreateButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCreateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  contextMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  contextMenuContainer: {
    position: 'absolute',
    width: 240,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 12,
  },
  contextMenuHeader: {
    marginBottom: 12,
  },
  contextMenuTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  contextMenuDate: {
    fontSize: 12,
    marginTop: 4,
  },
  contextMenuActions: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  contextMenuAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  contextMenuActionIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  contextMenuActionLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    transform: [{ translateY: -50 }],
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default SpatialCanvasScreen;
