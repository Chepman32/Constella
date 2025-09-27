import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {
  PanGestureHandler,
  PinchGestureHandler,
  State,
} from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Canvas, Group, Rect } from '@shopify/react-native-skia';
import { useTheme } from '../contexts/ThemeContext';
import { databaseService } from '../services/DatabaseService';
import { Note } from '../types';
import { formatDate, truncateText } from '../utils';

interface SpatialCanvasScreenProps {
  navigation: any;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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

  const panGestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      lastTranslateX.value = translateX.value;
      lastTranslateY.value = translateY.value;
    },
    onActive: (event) => {
      translateX.value = lastTranslateX.value + event.translationX;
      translateY.value = lastTranslateY.value + event.translationY;
    },
    onEnd: () => {
      // Optional: add momentum or snap to bounds
    },
  });

  const pinchGestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      lastScale.value = scale.value;
    },
    onActive: (event) => {
      scale.value = Math.max(0.1, Math.min(5, lastScale.value * event.scale));
    },
    onEnd: () => {
      // Optionally snap to certain zoom levels
      if (scale.value < 0.5) {
        scale.value = withSpring(0.5);
      } else if (scale.value > 3) {
        scale.value = withSpring(3);
      }
    },
  });

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
      <PinchGestureHandler onGestureEvent={pinchGestureHandler}>
        <Animated.View style={styles.canvasContainer}>
          <PanGestureHandler onGestureEvent={panGestureHandler}>
            <Animated.View style={[styles.canvas, canvasAnimatedStyle]}>
              {/* Background Grid */}
              <Canvas style={styles.backgroundCanvas}>
                <Group>
                  {/* Draw grid lines */}
                  {Array.from({ length: 100 }, (_, i) => (
                    <React.Fragment key={`grid-${i}`}>
                      <Rect
                        x={(i - 50) * 100}
                        y={-5000}
                        width={1}
                        height={10000}
                        color={theme.border + '20'}
                      />
                      <Rect
                        x={-5000}
                        y={(i - 50) * 100}
                        width={10000}
                        height={1}
                        color={theme.border + '20'}
                      />
                    </React.Fragment>
                  ))}
                </Group>
              </Canvas>

              {/* Note Nodes */}
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

              {/* Constellation Effects */}
              <Canvas style={styles.effectsCanvas}>
                <Group>
                  {/* TODO: Add particle effects, connections between notes */}
                </Group>
              </Canvas>
            </Animated.View>
          </PanGestureHandler>
        </Animated.View>
      </PinchGestureHandler>

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
  backgroundCanvas: {
    position: 'absolute',
    top: -5000,
    left: -5000,
    width: 10000,
    height: 10000,
  },
  effectsCanvas: {
    position: 'absolute',
    top: -5000,
    left: -5000,
    width: 10000,
    height: 10000,
    pointerEvents: 'none',
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