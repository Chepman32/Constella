import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { databaseService } from '../services/DatabaseService';
import { Note } from '../types';
import { formatDate, truncateText } from '../utils';

interface SpatialCanvasScreenProps {
  navigation: any;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const GRID_LINE_COUNT = 80;
const GRID_SPACING = 120;
const GRID_EXTENT = (GRID_LINE_COUNT / 2) * GRID_SPACING;

interface NoteNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  note: Note;
  scale: number;
}

const SpatialCanvasScreen: React.FC<SpatialCanvasScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();

  const [notes, setNotes] = useState<Note[]>([]);
  const [noteNodes, setNoteNodes] = useState<NoteNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const lastTranslateX = useSharedValue(0);
  const lastTranslateY = useSharedValue(0);
  const lastScale = useSharedValue(1);


  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const allNotes = await databaseService.getAllNotes();
      setNotes(allNotes);

      // Convert notes to canvas nodes
      const nodes: NoteNode[] = allNotes.map((note, index) => ({
        id: note.id,
        x: note.position?.x || (Math.random() * 2000) - 1000,
        y: note.position?.y || (Math.random() * 2000) - 1000,
        width: 200,
        height: 150,
        note,
        scale: 1,
      }));

      setNoteNodes(nodes);
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      lastTranslateX.value = translateX.value;
      lastTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
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
      // Create note at current viewport center
      const centerX = -translateX.value / scale.value;
      const centerY = -translateY.value / scale.value;

      const noteId = await databaseService.createNote({
        title: 'New Note',
        content: '',
        tags: [],
        lastModified: new Date(),
        created: new Date(),
        position: { x: centerX, y: centerY },
      });

      // Reload notes to show the new one
      await loadNotes();

      // Navigate to editor
      navigation.navigate('Editor', { noteId });
    } catch (error) {
      console.error('Failed to create note:', error);
    }
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

            {noteNodes.map((node) => (
              <TouchableOpacity
                key={node.id}
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
            ))}
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={createNewNote}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

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
