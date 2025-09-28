import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
} from 'react-native';
import type {
  PressableProps,
  PressableStateCallbackType,
  StyleProp,
  ViewStyle,
} from 'react-native';

const TRACK_WIDTH = 52;
const TRACK_HEIGHT = 32;
const TRACK_PADDING = 2;
const THUMB_SIZE = TRACK_HEIGHT - TRACK_PADDING * 2;
const DEFAULT_TRACK_OFF = '#E5E5EA';
const DEFAULT_TRACK_ON = '#007AFF';
const DEFAULT_THUMB_OFF = '#f4f3f4';
const DEFAULT_THUMB_ON = '#ffffff';

interface TrackColorProps {
  false?: string;
  true?: string;
}

interface ThumbColorProps {
  false?: string;
  true?: string;
}

type IOSSwitchProps = {
  value: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  trackColor?: TrackColorProps;
  thumbColor?: string | ThumbColorProps;
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
} & Omit<PressableProps, 'onPress' | 'style'>;

const IOSSwitch: React.FC<IOSSwitchProps> = ({
  value,
  onValueChange,
  disabled = false,
  trackColor,
  thumbColor,
  style,
  accessibilityState,
  accessibilityRole,
  ...pressableProps
}) => {
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.circle),
      useNativeDriver: false,
    }).start();
  }, [progress, value]);

  const trackOffColor = trackColor?.false ?? DEFAULT_TRACK_OFF;
  const trackOnColor = trackColor?.true ?? DEFAULT_TRACK_ON;

  const resolvedThumbColor = useMemo(() => {
    if (typeof thumbColor === 'string') {
      return thumbColor;
    }

    if (thumbColor) {
      return value ? thumbColor.true ?? DEFAULT_THUMB_ON : thumbColor.false ?? DEFAULT_THUMB_OFF;
    }

    return value ? DEFAULT_THUMB_ON : DEFAULT_THUMB_OFF;
  }, [thumbColor, value]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [TRACK_PADDING, TRACK_WIDTH - TRACK_PADDING - THUMB_SIZE],
  });

  const backgroundColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [trackOffColor, trackOnColor],
  });

  const mergedAccessibilityState = {
    ...accessibilityState,
    disabled: disabled || accessibilityState?.disabled,
    checked: value,
  };

  const resolveStyle = (state: PressableStateCallbackType) => {
    const baseStyle = typeof style === 'function' ? style(state) : style;

    return [
      styles.container,
      baseStyle,
      disabled && styles.disabled,
      state.pressed && !disabled && styles.pressed,
    ];
  };

  const handlePress: NonNullable<PressableProps['onPress']> = event => {
    event.stopPropagation?.();
    if (disabled) {
      return;
    }
    onValueChange?.(!value);
  };

  return (
    <Pressable
      {...pressableProps}
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole={accessibilityRole ?? 'switch'}
      accessibilityState={mergedAccessibilityState}
      style={resolveStyle}
    >
      <Animated.View style={[styles.track, { backgroundColor }]} pointerEvents="none">
        <Animated.View
          style={[
            styles.thumb,
            {
              transform: [{ translateX }],
              backgroundColor: resolvedThumbColor,
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  track: {
    flex: 1,
    borderRadius: TRACK_HEIGHT / 2,
    justifyContent: 'center',
    paddingHorizontal: TRACK_PADDING,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 1.5,
    elevation: 2,
  },
});

export default IOSSwitch;
