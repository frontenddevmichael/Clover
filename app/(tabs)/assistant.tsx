// AI Planning Assistant — connected to Convex AI mutations
import React, { useState, useRef, useEffect as useEffectCompat } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useMutation, useAction, useQuery } from 'convex/react';
import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
  interpolate,
  useReducedMotion,
} from 'react-native-reanimated';
import { api } from '../../convex/_generated/api';
import { useTheme, useStyles, type Theme } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { Button } from '@/components/Button';
import { IconSparkle } from '@/components/Illustrations';
import { useAuth } from '@/lib/auth';
import { ProfileButton } from '@/components/ProfileButton';
import { HeaderBar } from '@/components/HeaderBar';
import { SideDrawer } from '@/components/SideDrawer';
import { ThickFrame, OffsetShadow, CornerStamp, BoldDivider } from '@/components/neoBrutalist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Proposal = {
  proposalId: string;
  explanation: string;
  changes: Array<{
    action: string;
    courseCode: string;
    type: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
  status: 'proposed' | 'accepted' | 'rejected';
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Styles ─────────────────────────────────────────────────────────────────
const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.canvas },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: theme.spacing[5], paddingTop: theme.spacing[12], paddingBottom: theme.spacing[3],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  headerTitleBlock: {
    flex: 1,
    marginRight: theme.spacing[2],
  },
  title: { fontSize: theme.typography.display, fontWeight: theme.typography.bold, color: theme.colors.ink },
  subtitle: { fontSize: theme.typography.caption, color: theme.colors.inkSecondary, marginTop: theme.spacing[0.5] },
  ratePill: {
    backgroundColor: theme.colors.subtleFill, borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing[3], paddingVertical: theme.spacing[1.5],
    borderWidth: 1, borderColor: theme.colors.hairline,
  },
  rateText: { fontSize: theme.typography.caption, fontWeight: theme.typography.semibold, color: theme.colors.inkSecondary },
  content: { padding: theme.spacing[5], paddingBottom: theme.spacing[30] },
  skeletonWrap: {
    marginTop: theme.spacing[5],
    opacity: 0.7,
  },
  generateFrame: { borderRadius: 4, marginBottom: theme.spacing[4] },
  generateStamp: { position: 'absolute', top: -8, left: 12, zIndex: 10 },
  generateSection: { alignItems: 'center', paddingVertical: theme.spacing[12] },
  generateMark: {
    width: 56, height: 56, borderRadius: theme.radii.pill, backgroundColor: theme.colors.fill,
    alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing[5],
  },
  generateTitle: { fontSize: theme.typography.title, fontWeight: theme.typography.bold, color: theme.colors.ink, marginBottom: theme.spacing[2] },
  generateSubtitle: {
    fontSize: theme.typography.secondary, color: theme.colors.inkSecondary,
    textAlign: 'center', lineHeight: 22, paddingHorizontal: theme.spacing[5], marginBottom: theme.spacing[6],
  },
  generateButton: { alignSelf: 'stretch', marginHorizontal: theme.spacing[5] },
  proposalFrame: { borderRadius: 4 },
  proposalStamp: { position: 'absolute', top: -8, right: 12, zIndex: 10 },
  proposalSheet: {
    backgroundColor: theme.colors.glassSurface, borderRadius: theme.radii.sheet,
    padding: theme.spacing[5], borderWidth: 1, borderColor: theme.colors.hairline,
  },
  dragHandle: { width: 36, height: 4, borderRadius: theme.radii.pill, backgroundColor: theme.colors.hairline, alignSelf: 'center', marginBottom: theme.spacing[4] },
  proposalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[4] },
  proposalTitle: { fontSize: theme.typography.title, fontWeight: theme.typography.bold, color: theme.colors.ink },
  explanationCard: { marginBottom: theme.spacing[4] },
  explanationText: { fontSize: theme.typography.body, color: theme.colors.ink, lineHeight: 24 },
  changesSection: { marginBottom: theme.spacing[4] },
  sectionLabel: {
    fontSize: theme.typography.caption, fontWeight: theme.typography.semibold, color: theme.colors.inkSecondary,
    textTransform: 'uppercase', letterSpacing: 0.04, marginBottom: theme.spacing[2.5],
  },
  changeCard: { marginBottom: theme.spacing[2] },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2.5] },
  changeAction: { width: 28, height: 28, borderRadius: theme.radii.pill, alignItems: 'center', justifyContent: 'center' },
  changeActionText: { fontSize: theme.typography.secondary, fontWeight: theme.typography.bold, color: theme.colors.fillInk },
  changeInfo: { flex: 1 },
  changeCode: { fontSize: theme.typography.secondary, fontWeight: theme.typography.semibold, color: theme.colors.ink },
  changeDetail: { fontSize: theme.typography.caption, color: theme.colors.inkSecondary, marginTop: theme.spacing[0.5] },
  proposalActions: { flexDirection: 'row', gap: theme.spacing[3], marginBottom: theme.spacing[4] },
  actionButton: { flex: 1 },
  reproposeSection: { borderTopWidth: 1, borderTopColor: theme.colors.hairline, paddingTop: theme.spacing[4], marginBottom: theme.spacing[4] },
  reproposeInputField: {
    fontSize: theme.typography.body,
    color: theme.colors.ink,
    backgroundColor: theme.colors.elevated,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    borderRadius: theme.radii.chip,
    paddingHorizontal: theme.spacing[3.5],
    paddingVertical: theme.spacing[3],
    marginBottom: theme.spacing[2.5],
  },
  reproposeButton: { width: '100%' },
  startOverButton: { marginTop: theme.spacing[2] },
  chatSection: { marginTop: theme.spacing[5] },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  clearChatText: {
    fontSize: theme.typography.caption,
    color: theme.colors.inkSecondary,
  },
  chatBubble: {
    padding: theme.spacing[3],
    borderRadius: theme.radii.card,
    marginBottom: theme.spacing[2],
    maxWidth: '90%',
  },
  chatBubbleUser: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  chatBubbleAssistant: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  chatText: {
    fontSize: theme.typography.secondary,
    lineHeight: 20,
  },
  chatInputRow: {
    flexDirection: 'row',
    gap: theme.spacing[2],
    marginTop: theme.spacing[4],
    alignItems: 'flex-end',
  },
  chatInput: {
    flex: 1,
    backgroundColor: theme.colors.elevated,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    borderRadius: theme.radii.card,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2.5],
    fontSize: theme.typography.secondary,
    color: theme.colors.ink,
    maxHeight: 100,
  },
  chatSendBtn: {
    minWidth: 60,
  },
});

// ─── Plan skeleton animation ────────────────────────────────────────────────
const AnimatedPath = Animated.createAnimatedComponent(Path);

function SkeletonRow({
  y,
  offset,
  p,
  ink,
}: {
  y: number;
  offset: number;
  p: ReturnType<typeof useSharedValue<number>>;
  ink: string;
}) {
  const pillProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(p.value, [offset, offset + 0.16], [150, 0]),
    opacity: interpolate(p.value, [offset, offset + 0.02], [0, 1]),
  }));
  const timeProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(p.value, [offset + 0.1, offset + 0.2], [60, 0]),
    opacity: interpolate(p.value, [offset + 0.1, offset + 0.12], [0, 1]),
  }));
  const titleProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(p.value, [offset + 0.16, offset + 0.28], [190, 0]),
    opacity: interpolate(p.value, [offset + 0.16, offset + 0.18], [0, 1]),
  }));

  return (
    <>
      <AnimatedPath
        d={`M 14 ${y + 12} C 16 ${y + 2}, 44 ${y - 2}, 74 ${y + 2} C 100 ${y + 5}, 102 ${y + 16}, 76 ${y + 21} C 46 ${y + 25}, 13 ${y + 22}, 14 ${y + 12} Z`}
        stroke={ink}
        strokeWidth={1.4}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={150}
        animatedProps={pillProps}
      />
      <AnimatedPath
        d={`M 122 ${y + 10} C 138 ${y + 8}, 158 ${y + 12}, 174 ${y + 10}`}
        stroke={ink}
        strokeWidth={1.4}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={60}
        animatedProps={timeProps}
      />
      <AnimatedPath
        d={`M 122 ${y + 22} C 160 ${y + 19}, 210 ${y + 24}, 250 ${y + 20} C 272 ${y + 18}, 292 ${y + 22}, 306 ${y + 21}`}
        stroke={ink}
        strokeWidth={1.4}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={190}
        animatedProps={titleProps}
      />
    </>
  );
}

function PlanSkeleton() {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const reduced = useReducedMotion() ?? false;
  const p = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      p.value = 1;
      return;
    }
    p.value = withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) });
  }, [reduced]);

  const rows = [24, 82, 140];

  return (
    <View style={styles.skeletonWrap} pointerEvents="none">
      <Svg viewBox="0 0 320 190" width="100%" height={190}>
        {rows.map((y, i) => (
          <SkeletonRow key={y} y={y} offset={i * 0.28} p={p} ink={t.colors.inkFaint} />
        ))}
      </Svg>
    </View>
  );
}

// ─── Main screen ────────────────────────────────────────────────────────────
export default function AssistantScreen() {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { userId } = useAuth();
  const router = useRouter();
  const { action } = useLocalSearchParams<{ action?: string }>();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(false);
  const [changeDesc, setChangeDesc] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<ScrollView>(null);

  const generatePlan = useAction(api.aiAssistant.generatePlan);
  const repropose = useAction(api.aiAssistant.repropose);
  const chat = useAction(api.aiAssistant.chat);
  const acceptProposal = useMutation(api.aiAssistant.acceptProposal);
  const rejectProposal = useMutation(api.aiAssistant.rejectProposal);
  const rateLimit = useQuery(api.aiAssistant.getRateLimit, userId ? { userId } : 'skip');
  const conversationHistory = useQuery(
    api.conversations.listRecent,
    userId ? { userId } : 'skip'
  );
  const clearHistory = useMutation(api.conversations.clearHistory);

  const handleGenerate = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const result = await generatePlan({ userId });
      setProposal(result as Proposal);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to generate plan.');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (action === 'new-plan') {
      handleGenerate();
      router.setParams({ action: undefined });
    }
  }, [action, handleGenerate, router]);

  const handleRepropose = async () => {
    if (!changeDesc.trim()) {
      Alert.alert('Describe the change', 'Tell the assistant what changed.');
      return;
    }
    if (!userId) return;
    setLoading(true);
    try {
      const result = await repropose({ userId, changeDescription: changeDesc });
      setProposal(result as Proposal);
      setChangeDesc('');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to re-propose.');
    }
    setLoading(false);
  };

  const handleAccept = async () => {
    if (!userId || !proposal) return;
    setLoading(true);
    try {
      await acceptProposal({ userId, proposalId: proposal.proposalId, changes: proposal.changes });
      setProposal({ ...proposal, status: 'accepted' });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to accept plan.');
    }
    setLoading(false);
  };

  const handleReject = async () => {
    if (!userId || !proposal) return;
    try {
      await rejectProposal({ userId, proposalId: proposal.proposalId });
      setProposal({ ...proposal, status: 'rejected' });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to reject plan.');
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim() || !userId) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatLoading(true);
    try {
      await chat({ userId, message: msg });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send message.');
    }
    setChatLoading(false);
  };

  const handleClearChat = async () => {
    if (!userId) return;
    Alert.alert('Clear chat?', 'This will remove your conversation history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearHistory({ userId });
          } catch {}
        },
      },
    ]);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (conversationHistory && conversationHistory.length > 0) {
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [conversationHistory?.length]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.title}>Assistant</Text>
            <Text style={styles.subtitle}>Plan my week</Text>
          </View>
          <HeaderBar
            onMenuPress={() => setDrawerOpen(true)}
            onSettingsPress={() => router.push('/(tabs)/settings')}
          />
        </View>
        {rateLimit && (
          <View style={styles.ratePill}>
            <Text style={styles.rateText}>{rateLimit.limit - rateLimit.used} of {rateLimit.limit} left today</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {!proposal && (
            <View style={styles.generateFrame}>
              <View style={styles.generateSection}>
                <CornerStamp label="AI" color={t.colors.fill} textColor={t.colors.fillInk} style={styles.generateStamp} />
                <View style={styles.generateMark}>
                  <IconSparkle size={26} color={t.colors.fillInk} strokeWidth={1.8} />
                </View>
                <Text style={styles.generateTitle}>Plan your week</Text>
                <Text style={styles.generateSubtitle}>
                  I'll read your timetable and deadlines, then propose a weekly plan you can accept, change, or reject.
                </Text>
                <Button label={loading ? 'Thinking…' : 'Generate plan'} onPress={handleGenerate} loading={loading} style={styles.generateButton} />
                {loading && <PlanSkeleton />}
              </View>
            </View>
        )}

        {proposal && (
          <View style={styles.proposalSheet}>
            <CornerStamp label="PROPOSAL" color={t.colors.workloadBalancedBg} style={styles.proposalStamp} />
            <View style={styles.dragHandle} />
              <View style={styles.proposalHeader}>
                <Text style={styles.proposalTitle}>Weekly plan proposal</Text>
                <Chip
                label={proposal.status}
                color={
                  proposal.status === 'accepted' ? t.colors.successBg :
                  proposal.status === 'rejected' ? t.colors.workloadOverloadedBg : t.colors.workloadBalancedBg
                }
              />
            </View>

            <Card style={styles.explanationCard}>
              <Text style={styles.explanationText}>{proposal.explanation}</Text>
            </Card>

            {proposal.changes.length > 0 && (
              <View style={styles.changesSection}>
                <Text style={styles.sectionLabel}>Proposed changes</Text>
                {proposal.changes.map((change, i) => (
                  <Card key={i} style={styles.changeCard}>
                    <View style={styles.changeRow}>
                      <View style={[styles.changeAction, { backgroundColor: change.action === 'add' ? t.colors.successBg : t.colors.warningText }]}>
                        <Text style={styles.changeActionText}>{change.action === 'add' ? '+' : '→'}</Text>
                      </View>
                      <View style={styles.changeInfo}>
                        <Text style={styles.changeCode}>{change.courseCode}</Text>
                        <Text style={styles.changeDetail}>{change.type} · {DAYS[change.dayOfWeek]} {change.startTime}–{change.endTime}</Text>
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            )}

            {proposal.status === 'proposed' && (
              <View style={styles.proposalActions}>
                <Button label="Accept plan" onPress={handleAccept} loading={loading} style={styles.actionButton} />
                <Button label="Reject" onPress={handleReject} variant="secondary" style={styles.actionButton} />
              </View>
            )}

            {proposal.status !== 'rejected' && (
              <View style={styles.reproposeSection}>
                <Text style={styles.sectionLabel}>Something changed?</Text>
                <TextInput
                  style={styles.reproposeInputField}
                  value={changeDesc}
                  onChangeText={setChangeDesc}
                  placeholder='e.g. "I have a test on Thursday now"'
                  placeholderTextColor={t.colors.neutral300}
                  accessibilityLabel="Describe what changed in your schedule"
                />
                <Button label="Re-propose" onPress={handleRepropose} loading={loading} style={styles.reproposeButton} />
              </View>
            )}

            <Button label="Start over" onPress={() => setProposal(null)} variant="secondary" style={styles.startOverButton} />
          </View>
        )}

        {/* Conversation history */}
        {conversationHistory && conversationHistory.length > 0 && (
          <View style={styles.chatSection}>
            <View style={styles.chatHeader}>
              <Text style={styles.sectionLabel}>Conversation</Text>
              <TouchableOpacity onPress={handleClearChat} accessibilityLabel="Clear chat history">
                <Text style={styles.clearChatText}>Clear</Text>
              </TouchableOpacity>
            </View>
            {conversationHistory.map((msg) => (
              <View
                key={msg._id}
                style={[
                  styles.chatBubble,
                  msg.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAssistant,
                  { backgroundColor: msg.role === 'user' ? t.colors.fill : t.colors.elevated },
                ]}
              >
                <Text
                  style={[
                    styles.chatText,
                    { color: msg.role === 'user' ? t.colors.fillInk : t.colors.ink },
                  ]}
                >
                  {msg.content}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Chat input */}
        <View style={styles.chatInputRow}>
          <TextInput
            style={styles.chatInput}
            value={chatInput}
            onChangeText={setChatInput}
            placeholder="Ask anything about your schedule..."
            placeholderTextColor={t.colors.neutral300}
            multiline
            maxLength={500}
            accessibilityLabel="Type a message"
          />
          <Button
            label={chatLoading ? '...' : 'Send'}
            onPress={handleChat}
            loading={chatLoading}
            style={styles.chatSendBtn}
          />
        </View>
      </ScrollView>
      <SideDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </View>
  );
}
