# Constella - Mobile Note-Taking Application

## Project Description

Constella is an innovative offline-first note-taking mobile application built with React Native. The app's core purpose is to let users create, organize, and visualize notes entirely offline, while delivering a delightful user experience filled with rich animations and unique features.

### Key Features

- **Offline-First Architecture**: All data is stored locally with no internet requirement, ensuring quick access and user privacy
- **Rich Animations**: Powered by React Native Reanimated and React Native Skia for smooth 60-120fps animations
- **Spatial Canvas**: Infinite 2D workspace for organizing notes visually with simulated 3D effects
- **Knowledge Graph**: Interactive visualization of note relationships and connections
- **Time Travel**: Version history with cinematic timeline scrubbing
- **Intelligent Auto-formatting**: Smart templates and formatting based on content patterns
- **Focus Mode**: Distraction-free writing with ambient effects
- **Multiple Themes**: Light, Dark, Solar, and Mono themes with adaptive switching
- **Localization**: Support for 10+ languages (en, ru, es, de, fr, pt, ja, zh, ko, uk)
- **Gesture-Based Interactions**: Draw shapes to trigger actions and commands
- **Premium Features**: In-app purchases for advanced functionality

### Tech Stack

- **Framework**: React Native (iOS focus, cross-platform compatible)
- **Animation**: React Native Reanimated v3+ for high-performance animations
- **Graphics**: React Native Skia for custom 2D graphics and drawing
- **Database**: SQLite with encryption for offline storage
- **Navigation**: React Navigation for screen management
- **State Management**: React Context + hooks
- **Language**: TypeScript for type safety and maintainability

## Development Progress

### ✅ Completed Tasks

- [x] Set up React Native project structure and core dependencies
- [x] Implement database schema and offline storage with SQLite
- [x] Create theme system with Light, Dark, Solar, and Mono themes
- [x] Build animated splash screen with physics-based logo animation
- [x] Implement main notes list screen with search functionality
- [x] Create rich text note editor with formatting toolbar

### 🚧 In Progress

Currently working on: Drawing and handwriting support using React Native Skia

### 📋 Upcoming Tasks

- [ ] Add drawing and handwriting support using React Native Skia
- [ ] Implement spatial canvas mode with infinite 2D space
- [ ] Build knowledge graph visualization with auto-layout
- [ ] Create time travel mode with version history timeline
- [ ] Add focus mode with ambient sounds and distraction-free UI
- [ ] Implement intelligent auto-formatting and templates
- [ ] Add gesture-based interactions and micro-animations
- [ ] Implement settings screen with theme, sound, and haptics controls
- [ ] Add localization support for 10+ languages
- [ ] Implement in-app purchases and premium features
- [ ] Add delightful details, easter eggs, and achievements

## Installation & Setup

```bash
# Install dependencies
npm install

# Install iOS dependencies (macOS only)
cd ios && pod install && cd ..

# Run on iOS
npm run ios

# Run on Android
npm run android

# Start Metro bundler
npm start
```

## Project Structure

```
src/
├── components/          # Reusable UI components
├── screens/            # Screen components
├── services/           # Business logic and database
├── contexts/           # React contexts for state management
├── types/              # TypeScript type definitions
├── utils/              # Utility functions and helpers
├── assets/             # Images, fonts, sounds
└── locales/            # Internationalization files
```

## Core Architecture

- **Offline Database**: SQLite with encrypted storage for privacy
- **Theme System**: Dynamic theming with automatic day/night switching
- **Animation Engine**: Reanimated + Skia for complex visual effects
- **Navigation**: Stack-based navigation with gesture support
- **State Management**: Context-based global state with local component state

## Features in Detail

### Notes Management
- Create, edit, and delete notes with rich text formatting
- Auto-save functionality with version history
- Full-text search across all notes
- Tag-based organization and filtering

### Visual Organization
- **Spatial Canvas**: Arrange notes in infinite 2D space
- **Knowledge Graph**: Automatic relationship visualization
- **Smart Linking**: Proximity-based note connections

### Advanced Editing
- Markdown support with live preview
- Drawing and handwriting integration
- Voice memos and file attachments
- Gesture-based shortcuts

### User Experience
- **Focus Mode**: Distraction-free writing environment
- **Adaptive Themes**: Content-aware visual effects
- **Micro-interactions**: Delightful animations throughout
- **Haptic Feedback**: Tactile responses for actions

## Privacy & Security

- All data stored locally on device
- Optional database encryption
- No cloud sync or data collection
- Export/import for manual backup

## Monetization

- Free tier with core functionality
- Premium unlock via in-app purchase
- No ads, subscription-based revenue model
- Advanced features gated behind premium

---

*This README is maintained as a living document and updated with each development milestone.*