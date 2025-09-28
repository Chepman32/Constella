import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import IOSSwitch from '../components/IOSSwitch';

interface SettingsScreenProps {
  navigation: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { theme, themeName, setTheme, autoTheme, setAutoTheme } = useTheme();
  const { t, language, setLanguage, availableLanguages } = useLocalization();

  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);


  const themes = [
    { key: 'light', name: t('settings.themes.light'), icon: '☀️' },
    { key: 'dark', name: t('settings.themes.dark'), icon: '🌙' },
    { key: 'solar', name: t('settings.themes.solar'), icon: '🌅' },
    { key: 'mono', name: t('settings.themes.mono'), icon: '⚫' },
  ];

  const currentLanguage = availableLanguages.find(lang => lang.code === language);
  const currentTheme = themes.find(item => item.key === themeName);

  const cardDividerStyle = {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
    marginTop: 16,
  };

  const handleClearLocalData = () => {
    Alert.alert(
      t('settings.clearLocalDataTitle'),
      t('settings.clearLocalDataMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            // TODO: wire up real data clearing logic
          },
        },
      ]
    );
  };

  const renderThemeOption = ({ item }: { item: (typeof themes)[number] }) => (
    <TouchableOpacity
      style={[
        styles.modalItem,
        item.key === themeName && { backgroundColor: theme.primary + '15' },
      ]}
      onPress={() => {
        setTheme(item.key as any);
        setShowThemeModal(false);
      }}
    >
      <Text style={styles.modalItemIcon}>{item.icon}</Text>
      <Text
        style={[
          styles.modalItemText,
          { color: item.key === themeName ? theme.primary : theme.text },
        ]}
      >
        {item.name}
      </Text>
      {item.key === themeName && (
        <Text style={[styles.checkmark, { color: theme.primary }]}>✓</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={[styles.backIcon, { color: theme.primary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>{t('settings.title')}</Text>
        <TouchableOpacity style={styles.headerButton} activeOpacity={0.7}>
          <Text style={[styles.sparkleIcon, { color: theme.accent }]}>✦</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View
          style={[styles.card, styles.quickControlsCard, { backgroundColor: theme.surface }]}
        >
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {t('settings.quickControls')}
          </Text>
          <View style={styles.cardBody}>
            <Pressable
              style={({ pressed }) => [
                styles.row,
                styles.toggleRow,
                pressed && styles.rowPressed,
              ]}
              onPress={() => setSoundEnabled(value => !value)}
              accessibilityRole="switch"
              accessibilityState={{ checked: soundEnabled }}
              accessibilityLabel={t('settings.sound')}
              hitSlop={4}
            >
              <Text style={[styles.rowLabel, { color: theme.text }]}>
                {t('settings.sound')}
              </Text>
              <IOSSwitch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={soundEnabled ? '#ffffff' : '#f4f3f4'}
                accessible={false}
                style={styles.switchControl}
              />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.row,
                styles.toggleRow,
                cardDividerStyle,
                pressed && styles.rowPressed,
              ]}
              onPress={() => setHapticsEnabled(value => !value)}
              accessibilityRole="switch"
              accessibilityState={{ checked: hapticsEnabled }}
              accessibilityLabel={t('settings.haptics')}
              hitSlop={4}
            >
              <Text style={[styles.rowLabel, { color: theme.text }]}>
                {t('settings.haptics')}
              </Text>
              <IOSSwitch
                value={hapticsEnabled}
                onValueChange={setHapticsEnabled}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={hapticsEnabled ? '#ffffff' : '#f4f3f4'}
                accessible={false}
                style={styles.switchControl}
              />
            </Pressable>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.card, styles.singleRowCard, { backgroundColor: theme.surface }]}
          onPress={() => setShowThemeModal(true)}
          accessible
          accessibilityLabel={t('settings.appearance')}
        >
          <Text style={[styles.rowLabel, { color: theme.text }]}>
            {t('settings.appearance')}
          </Text>
          <View style={styles.rowRight}>
            <Text style={[styles.rowValue, { color: theme.textSecondary }]}>
              {currentTheme?.name}
            </Text>
            <Text style={[styles.rowChevron, { color: theme.textSecondary }]}>›</Text>
          </View>
        </TouchableOpacity>

        <View
          style={[
            styles.proCard,
            {
              backgroundColor: theme.accent + '25',
              borderColor: theme.accent + '35',
            },
          ]}
          accessible
          accessibilityLabel={t('settings.becomePro.title')}
        >
          <View style={styles.proCardContent}>
            <View style={styles.proTextContainer}>
              <Text style={[styles.proTitle, { color: theme.text }]}>
                {t('settings.becomePro.title')}
              </Text>
              <Text style={[styles.proSubtitle, { color: theme.text }]}
                numberOfLines={2}
              >
                {t('settings.becomePro.subtitle')}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.proButton, { backgroundColor: theme.accent }]}
            >
              <Text style={styles.proButtonText}>
                {t('settings.becomePro.cta')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.card, styles.singleRowCard, { backgroundColor: theme.surface }]}
          onPress={() => setShowLanguageModal(true)}
          accessible
          accessibilityLabel={t('settings.language')}
        >
          <Text style={[styles.rowLabel, { color: theme.text }]}>
            {t('settings.language')}
          </Text>
          <View style={styles.rowRight}>
            <Text style={[styles.rowValue, { color: theme.textSecondary }]}>
              {currentLanguage?.nativeName}
            </Text>
            <Text style={[styles.rowChevron, { color: theme.textSecondary }]}>›</Text>
          </View>
        </TouchableOpacity>

        <View style={[styles.card, { backgroundColor: theme.surface }]}
          accessible
          accessibilityLabel={t('settings.dataPrivacy')}
        >
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {t('settings.dataPrivacy')}
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.row, styles.rowWithValue]}
            onPress={() => {}}
          >
            <Text style={[styles.rowLabel, { color: theme.text }]}>
              {t('settings.exportZip')}
            </Text>
            <Text style={[styles.rowChevron, { color: theme.textSecondary }]}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.row, styles.rowWithValue, cardDividerStyle]}
            onPress={() => {}}
          >
            <Text style={[styles.rowLabel, { color: theme.text }]}>
              {t('settings.import')}
            </Text>
            <Text style={[styles.rowChevron, { color: theme.textSecondary }]}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.row, styles.clearRow, cardDividerStyle]}
            onPress={handleClearLocalData}
          >
            <Text style={[styles.clearText, { color: theme.error }]}>
              {t('settings.clearLocalData')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            {t('app.name')} v1.0.0
          </Text>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            {t('settings.madeWith')}
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={showThemeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowThemeModal(false)}
        >
          <TouchableOpacity
            style={[
              styles.modalContent,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {t('settings.theme')}
            </Text>
            <View style={[styles.modalSwitchRow, { borderColor: theme.border }]}
              accessible
              accessibilityLabel={t('settings.autoTheme')}
            >
              <Text style={[styles.modalSwitchLabel, { color: theme.text }]}>
                {t('settings.autoTheme')}
              </Text>
              <IOSSwitch
                value={autoTheme}
                onValueChange={setAutoTheme}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={autoTheme ? '#ffffff' : '#f4f3f4'}
              />
            </View>
            <FlatList
              data={themes}
              keyExtractor={item => item.key}
              renderItem={renderThemeOption}
              contentContainerStyle={styles.modalList}
              ItemSeparatorComponent={() => (
                <View style={[styles.modalSeparator, { backgroundColor: theme.border }]} />
              )}
              showsVerticalScrollIndicator={false}
            />
            <TouchableOpacity
              style={[styles.modalCancelButton, { backgroundColor: theme.border }]}
              onPress={() => setShowThemeModal(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.modalCancelText, { color: theme.text }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <TouchableOpacity
            style={[
              styles.modalContent,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {t('settings.language')}
            </Text>
            <FlatList
              data={availableLanguages}
              keyExtractor={item => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    item.code === language && { backgroundColor: theme.primary + '15' },
                  ]}
                  onPress={async () => {
                    await setLanguage(item.code);
                    setShowLanguageModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      { color: item.code === language ? theme.primary : theme.text },
                    ]}
                  >
                    {item.nativeName}
                  </Text>
                  <Text style={[styles.modalItemSubtext, { color: theme.textSecondary }]}>
                    {t(`settings.languages.${item.code}`)}
                  </Text>
                  {item.code === language && (
                    <Text style={[styles.checkmark, { color: theme.primary }]}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => (
                <View style={[styles.modalSeparator, { backgroundColor: theme.border }]} />
              )}
              contentContainerStyle={styles.modalList}
              showsVerticalScrollIndicator={false}
            />
            <TouchableOpacity
              style={[styles.modalCancelButton, { backgroundColor: theme.border }]}
              onPress={() => setShowLanguageModal(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.modalCancelText, { color: theme.text }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  headerButton: {
    padding: 8,
    borderRadius: 12,
  },
  backIcon: {
    fontSize: 22,
    fontWeight: '600',
  },
  sparkleIcon: {
    fontSize: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    paddingVertical: 20,
    paddingLeft: 20,
    paddingRight: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  quickControlsCard: {
    paddingRight: 24,
  },
  singleRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardBody: {
    marginTop: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingRight: 12,
  },
  toggleRow: {
    borderRadius: 16,
  },
  rowPressed: {
    opacity: 0.75,
  },
  rowWithValue: {
    marginTop: 4,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    paddingRight: 12,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  switchControl: {
    marginRight: 40,
  },
  rowChevron: {
    fontSize: 18,
    marginLeft: 8,
  },
  proCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  proCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  proTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  proSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  proButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 18,
  },
  proButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  clearRow: {
    justifyContent: 'flex-start',
  },
  clearText: {
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 12,
  },
  footerText: {
    fontSize: 13,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 20,
  },
  modalList: {
    paddingHorizontal: 20,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  modalItemIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 28,
    textAlign: 'center',
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  modalItemSubtext: {
    fontSize: 13,
    marginLeft: 8,
  },
  modalSeparator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  checkmark: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCancelButton: {
    marginHorizontal: 24,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalSwitchLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
});

export default SettingsScreen;
