import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image, Dimensions } from 'react-native';
import { Canvas, Path, Skia, useCanvasRef } from '@shopify/react-native-skia';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ViewShot from 'react-native-view-shot';
import { useTheme } from '../contexts/ThemeContext';
import { Stroke, Point, Drawing } from '../types';
import { generateId } from '../utils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DrawingCanvasProps {
  onDrawingComplete: (drawing: Drawing) => void;
  onClose: () => void;
  existingDrawing?: Drawing;
  backgroundImage?: string;
}

type DrawingTool = 'pen' | 'highlighter' | 'eraser';

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  onDrawingComplete,
  onClose,
  existingDrawing,
  backgroundImage,
}) => {
  const { theme } = useTheme();
  const canvasRef = useCanvasRef();
  const viewShotRef = useRef<ViewShot>(null);

  const [strokes, setStrokes] = useState<Stroke[]>(existingDrawing?.strokes || []);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [currentTool, setCurrentTool] = useState<DrawingTool>('pen');
  const [currentColor, setCurrentColor] = useState(theme.text);
  const [currentWidth, setCurrentWidth] = useState(3);

  const toolbarOpacity = useSharedValue(1);

  const handleTouchStart = useCallback((x: number, y: number, force?: number) => {
    const newPoint: Point = {
      x,
      y,
      pressure: force ?? 1,
      timestamp: Date.now(),
    };
    setCurrentStroke([newPoint]);
  }, []);

  const handleTouchActive = useCallback((x: number, y: number, force?: number) => {
    const newPoint: Point = {
      x,
      y,
      pressure: force ?? 1,
      timestamp: Date.now(),
    };
    setCurrentStroke((prev) => [...prev, newPoint]);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setCurrentStroke((prevStroke) => {
      if (prevStroke.length > 1) {
        const newStroke: Stroke = {
          points: prevStroke,
          color: currentColor,
          width: currentWidth,
          tool: currentTool,
        };
        setStrokes((prev) => [...prev, newStroke]);
      }
      return [];
    });
  }, [currentColor, currentTool, currentWidth]);

  const drawingGesture = Gesture.Pan()
    .runOnJS(true)
    .onBegin((event) => {
      handleTouchStart(event.x, event.y);
    })
    .onUpdate((event) => {
      handleTouchActive(event.x, event.y);
    })
    .onEnd(() => {
      handleTouchEnd();
    });

  const paths = useMemo(() => {
    const allStrokes = [...strokes];

    // Add current stroke if it exists
    if (currentStroke.length > 1) {
      allStrokes.push({
        points: currentStroke,
        color: currentColor,
        width: currentWidth,
        tool: currentTool,
      });
    }

    return allStrokes.map((stroke, index) => {
      const path = Skia.Path.Make();

      if (stroke.points.length < 2) return null;

      const firstPoint = stroke.points[0];
      path.moveTo(firstPoint.x, firstPoint.y);

      // Create smooth curves using quadratic bezier curves
      for (let i = 1; i < stroke.points.length - 1; i++) {
        const currentPoint = stroke.points[i];
        const nextPoint = stroke.points[i + 1];

        const cpx = (currentPoint.x + nextPoint.x) / 2;
        const cpy = (currentPoint.y + nextPoint.y) / 2;

        path.quadTo(currentPoint.x, currentPoint.y, cpx, cpy);
      }

      // Add the last point
      const lastPoint = stroke.points[stroke.points.length - 1];
      path.lineTo(lastPoint.x, lastPoint.y);

      return {
        path,
        color: stroke.color,
        width: stroke.width,
        tool: stroke.tool,
        key: `stroke-${index}`,
      };
    }).filter(Boolean);
  }, [strokes, currentStroke, currentColor, currentWidth, currentTool]);

  const handleToolChange = (tool: DrawingTool) => {
    setCurrentTool(tool);

    // Adjust color and width based on tool
    switch (tool) {
      case 'pen':
        setCurrentColor(theme.text);
        setCurrentWidth(3);
        break;
      case 'highlighter':
        setCurrentColor(theme.accent + '40'); // Semi-transparent
        setCurrentWidth(8);
        break;
      case 'eraser':
        setCurrentColor(theme.background);
        setCurrentWidth(10);
        break;
    }
  };

  const handleUndo = () => {
    if (strokes.length > 0) {
      setStrokes((prev) => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    setStrokes([]);
    setCurrentStroke([]);
  };

  const handleSave = async () => {
    if (strokes.length === 0 && !backgroundImage) {
      onClose();
      return;
    }

    try {
      // Capture the entire view including background image and drawings
      const uri = await viewShotRef.current?.capture?.();
      let thumbnail: string | undefined;

      if (uri) {
        // Convert to base64 data URI
        thumbnail = `data:image/png;base64,${uri}`;
      }

      const drawing: Drawing = {
        id: existingDrawing?.id || generateId(),
        strokes,
        thumbnail,
      };

      onDrawingComplete(drawing);
    } catch (error) {
      console.error('Failed to capture view:', error);
      onDrawingComplete({
        id: existingDrawing?.id || generateId(),
        strokes,
        thumbnail: undefined,
      });
    }
  };

  const handleColorChange = (color: string) => {
    setCurrentColor(color);
  };

  const toggleToolbar = () => {
    toolbarOpacity.value = withSpring(toolbarOpacity.value === 1 ? 0 : 1);
  };

  const toolbarAnimatedStyle = useAnimatedStyle(() => ({
    opacity: toolbarOpacity.value,
    transform: [
      {
        translateY: toolbarOpacity.value === 1 ? 0 : 100,
      },
    ],
  }));

  const colors = [
    { id: 'text', value: theme.text },
    { id: 'primary', value: theme.primary },
    { id: 'accent', value: theme.accent },
    { id: 'red', value: '#FF3B30' },
    { id: 'green', value: '#34C759' },
    { id: 'blue', value: '#007AFF' },
    { id: 'orange', value: '#FF9500' }
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: theme.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleToolbar} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: theme.primary }]}>🎨</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: theme.primary }]}>Done</Text>
        </TouchableOpacity>
      </View>

      <ViewShot
        ref={viewShotRef}
        options={{
          format: 'png',
          quality: 0.9,
          result: 'base64',
        }}
        style={styles.canvasContainer}
      >
        {backgroundImage && (
          <Image
            source={{ uri: backgroundImage }}
            style={styles.backgroundImage}
            resizeMode="contain"
          />
        )}
        <GestureDetector gesture={drawingGesture}>
          <Canvas
            ref={canvasRef}
            style={styles.canvasOverlay}
          >
            {paths.map((pathData) => {
              if (!pathData) return null;

              return (
                <Path
                  key={pathData.key}
                  path={pathData.path}
                  style="stroke"
                  strokeWidth={pathData.width}
                  strokeCap="round"
                  strokeJoin="round"
                  color={pathData.color}
                  opacity={pathData.tool === 'highlighter' ? 0.5 : 1}
                />
              );
            })}
          </Canvas>
        </GestureDetector>
      </ViewShot>

      <Animated.View style={[styles.toolbar, toolbarAnimatedStyle, { backgroundColor: theme.surface }]}>
        <View style={styles.toolSection}>
          <Text style={[styles.toolLabel, { color: theme.textSecondary }]}>Tools</Text>
          <View style={styles.toolButtons}>
            {(['pen', 'highlighter', 'eraser'] as DrawingTool[]).map((tool) => (
              <TouchableOpacity
                key={tool}
                style={[
                  styles.toolButton,
                  {
                    backgroundColor: currentTool === tool ? theme.primary : theme.background,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => handleToolChange(tool)}
              >
                <Text style={[
                  styles.toolButtonText,
                  { color: currentTool === tool ? '#fff' : theme.text }
                ]}>
                  {tool === 'pen' ? <Icon name="pencil" size={20} color={currentTool === tool ? '#fff' : theme.text} /> : tool === 'highlighter' ? <Icon name="grease-pencil" size={20} color={currentTool === tool ? '#fff' : theme.text} /> : <Icon name="broom" size={20} color={currentTool === tool ? '#fff' : theme.text} />}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.toolSection}>
          <Text style={[styles.toolLabel, { color: theme.textSecondary }]}>Colors</Text>
          <View style={styles.colorPalette}>
            {colors.map((color) => (
              <TouchableOpacity
                key={color.id}
                style={[
                  styles.colorButton,
                  {
                    backgroundColor: color.value,
                    borderColor: currentColor === color.value ? theme.primary : theme.border,
                    borderWidth: currentColor === color.value ? 3 : 1,
                  },
                ]}
                onPress={() => handleColorChange(color.value)}
              />
            ))}
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.background, borderColor: theme.border }]}
            onPress={handleUndo}
          >
            <Text style={[styles.actionButtonText, { color: theme.text }]}>Undo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.background, borderColor: theme.border }]}
            onPress={handleClear}
          >
            <Text style={[styles.actionButtonText, { color: theme.error }]}>Clear</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
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
    paddingTop: 50, // Account for status bar
  },
  headerButton: {
    padding: 8,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  canvas: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  canvasOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  toolbar: {
    padding: 20,
    borderTopWidth: 1,
  },
  toolSection: {
    marginBottom: 20,
  },
  toolLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  toolButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  toolButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  toolButtonText: {
    fontSize: 20,
  },
  colorPalette: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DrawingCanvas;
