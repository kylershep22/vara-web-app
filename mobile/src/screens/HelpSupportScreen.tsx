/**
 * Help & Support Screen
 * FAQs, contact info, and support resources
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing } from '../constants';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'How do I track my habits?',
    answer: 'Go to the Track tab and tap the + button to add a new habit. You can then check off habits daily from your dashboard.',
  },
  {
    question: 'How does the AI coaching work?',
    answer: 'Vara uses AI to provide personalized wellness suggestions based on your goals, habits, and journal entries. Tap the brain icon to chat with your AI wellness coach.',
  },
  {
    question: 'Can I export my data?',
    answer: 'Data export is coming soon. We\'re working on allowing you to download your journal entries and habit history.',
  },
  {
    question: 'How do I delete my account?',
    answer: 'Go to Settings > Account > Delete Account. Please note this action is permanent and cannot be undone.',
  },
  {
    question: 'Is my data private?',
    answer: 'Yes, your data is encrypted and stored securely. We never share your personal information with third parties. See our Privacy Policy for details.',
  },
];

const HelpSupportScreen: React.FC = () => {
  const navigation = useNavigation();
  const [expandedFAQ, setExpandedFAQ] = React.useState<number | null>(null);

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@varawellness.co?subject=Vara App Support');
  };

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="arrow-left" size={24} color={Colors.evergreenTeal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CONTACT US</Text>
          <View style={styles.cardGroup}>
            <TouchableOpacity
              style={styles.contactItem}
              onPress={handleEmailSupport}
              activeOpacity={0.7}
            >
              <View style={styles.contactIconContainer}>
                <Icon name="email-outline" size={22} color={Colors.evergreenTeal} />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactTitle}>Email Support</Text>
                <Text style={styles.contactSubtitle}>support@varawellness.co</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#d0d0d0" />
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FREQUENTLY ASKED QUESTIONS</Text>
          <View style={styles.cardGroup}>
            {FAQ_ITEMS.map((item, index) => (
              <React.Fragment key={index}>
                <TouchableOpacity
                  style={styles.faqItem}
                  onPress={() => toggleFAQ(index)}
                  activeOpacity={0.7}
                >
                  <View style={styles.faqQuestion}>
                    <Text style={styles.faqQuestionText}>{item.question}</Text>
                    <Icon
                      name={expandedFAQ === index ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={Colors.mutedSageGray}
                    />
                  </View>
                  {expandedFAQ === index && (
                    <Text style={styles.faqAnswer}>{item.answer}</Text>
                  )}
                </TouchableOpacity>
                {index < FAQ_ITEMS.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Resources Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>RESOURCES</Text>
          <View style={styles.cardGroup}>
            <TouchableOpacity
              style={styles.resourceItem}
              onPress={() => Linking.openURL('https://varawellness.co/privacy')}
              activeOpacity={0.7}
            >
              <Icon name="shield-check-outline" size={20} color={Colors.mutedSageGray} />
              <Text style={styles.resourceText}>Privacy Policy</Text>
              <Icon name="open-in-new" size={16} color="#d0d0d0" />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.resourceItem}
              onPress={() => Linking.openURL('https://varawellness.co/terms')}
              activeOpacity={0.7}
            >
              <Icon name="file-document-outline" size={20} color={Colors.mutedSageGray} />
              <Text style={styles.resourceText}>Terms of Service</Text>
              <Icon name="open-in-new" size={16} color="#d0d0d0" />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Vara Wellness</Text>
          <Text style={styles.appInfoVersion}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mistWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.mistWhite,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.softCharcoal,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  section: {
    marginTop: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.mutedSageGray,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  cardGroup: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
    overflow: 'hidden',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  contactIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: Colors.dewSage,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.softCharcoal,
  },
  contactSubtitle: {
    fontSize: 12,
    color: Colors.mutedSageGray,
    marginTop: 2,
  },
  faqItem: {
    padding: 16,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.softCharcoal,
    paddingRight: 12,
  },
  faqAnswer: {
    fontSize: 14,
    color: Colors.mutedSageGray,
    lineHeight: 20,
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(27, 94, 87, 0.06)',
    marginLeft: 16,
    marginRight: 18,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  resourceText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.softCharcoal,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  appInfoText: {
    fontSize: 14,
    color: Colors.mutedSageGray,
  },
  appInfoVersion: {
    fontSize: 12,
    color: Colors.mutedSageGray,
    marginTop: 4,
    opacity: 0.7,
  },
});

export default HelpSupportScreen;
