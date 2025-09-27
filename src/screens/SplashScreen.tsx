import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
  withTiming,
  withRepeat,
  runOnJS,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const SplashScreen: React.FC = () => {
  const logoScale = useSharedValue(0);
  const logoRotate = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);

  useEffect(() => {
    // Animate logo entrance
    logoScale.value = withSpring(1, {
      damping: 8,
      stiffness: 100,
    });

    // Animate logo rotation
    logoRotate.value = withDelay(
      500,
      withSequence(
        withTiming(360, { duration: 1000 }),
        withRepeat(withTiming(360, { duration: 2000 }), -1, false)
      )
    );

    // Animate title
    titleOpacity.value = withDelay(800, withTiming(1, { duration: 600 }));

    // Animate subtitle
    subtitleOpacity.value = withDelay(1200, withTiming(1, { duration: 600 }));
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { rotate: `${logoRotate.value}deg` },
    ],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, logoStyle]}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>✨</Text>
        </View>
      </Animated.View>

      <Animated.Text style={[styles.title, titleStyle]}>
        Constella
      </Animated.Text>

      <Animated.Text style={[styles.subtitle, subtitleStyle]}>
        Your thoughts, beautifully organized
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  logoContainer: {
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  logoText: {
    fontSize: 40,
    color: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
});

export default SplashScreen;