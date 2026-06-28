import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/src/api';
import { useAuth } from '@/src/auth';
import { colors, radius, spacing } from '@/src/theme';
import { StatusPill } from '@/src/ui';

export default function TicketDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [ticket, setTicket] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [addStageOpen, setAddStageOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [stageTitle, setStageTitle] = useState('');
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');

  const load = useCallback(async () => setTicket(await api.get(`/tickets/${id}`)), [id]);
  useEffect(() => { load(); }, [load]);

  if (!ticket) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.brand} /></View>;
  const isAdvisor = user?.role === 'advisor';
  const otherName = isAdvisor ? ticket.client_name : ticket.advisor_name;

  const addStage = async () => {
    if (!stageTitle.trim()) return;
    await api.post(`/tickets/${id}/stages`, { title: stageTitle });
    setStageTitle(''); setAddStageOpen(false); await load();
  };
  const updateStage = async (sid: string, status: string) => { await api.patch(`/tickets/${id}/stages/${sid}`, { status }); await load(); };
  const confirmStage = async (sid: string) => { await api.post(`/tickets/${id}/stages/${sid}/confirm`); await load(); };
  const send = async () => { if (!comment.trim()) return; await api.post(`/tickets/${id}/comments`, { text: comment }); setComment(''); await load(); };
  const close = async () => { await api.post(`/tickets/${id}/close`, { rating, review_text: review }); setCloseOpen(false); await refresh(); await load(); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceSecondary }} edges={['top']}>
      <View style={styles.header}>
        <Pressable testID="ticket-back" onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color={colors.brand} /></Pressable>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.title}>Service Ticket</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>with {otherName}</Text>
        </View>
        <StatusPill status={ticket.status} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>TOTAL ESCROW</Text>
          <Text style={styles.summaryAmt}>₹{ticket.total}</Text>
          <Text style={styles.summarySub}>{ticket.category}</Text>
        </View>

        <Text style={styles.section}>WORK STAGES</Text>
        {(ticket.stages || []).length === 0 && <Text style={{ color: colors.textMuted, padding: spacing.md }}>{isAdvisor ? 'Add the first stage to begin work' : 'Advisor will add work stages soon'}</Text>}
        {(ticket.stages || []).map((s: any, idx: number) => (
          <View key={s.id} style={styles.stage}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.stageDot, { backgroundColor: s.status === 'CONFIRMED' ? colors.success : s.status === 'AWAITING_CONFIRM' ? colors.warning : colors.surfaceTertiary }]}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.stageTitle}>{s.title}</Text>
                <StatusPill status={s.status} />
              </View>
            </View>
            {isAdvisor && s.status === 'PENDING' && <Pressable testID={`stage-start-${s.id}`} onPress={() => updateStage(s.id, 'IN_PROGRESS')} style={styles.smallBtn}><Text style={styles.smallBtnText}>Start</Text></Pressable>}
            {isAdvisor && s.status === 'IN_PROGRESS' && <Pressable testID={`stage-await-${s.id}`} onPress={() => updateStage(s.id, 'AWAITING_CONFIRM')} style={styles.smallBtn}><Text style={styles.smallBtnText}>Mark for Client Review</Text></Pressable>}
            {!isAdvisor && s.status === 'AWAITING_CONFIRM' && <Pressable testID={`stage-confirm-${s.id}`} onPress={() => confirmStage(s.id)} style={[styles.smallBtn, { backgroundColor: colors.success }]}><Text style={[styles.smallBtnText, { color: '#fff' }]}>✓ Confirm Stage</Text></Pressable>}
          </View>
        ))}
        {isAdvisor && ticket.status !== 'CLOSED' && (
          <Pressable testID="add-stage-btn" onPress={() => setAddStageOpen(true)} style={styles.addStage}><Ionicons name="add" size={16} color={colors.brand} /><Text style={{ color: colors.brand, fontWeight: '600' }}>Add Stage</Text></Pressable>
        )}

        <Text style={styles.section}>CONVERSATION</Text>
        {(ticket.comments || []).map((c: any) => (
          <View key={c.id} style={[styles.comment, c.author_id === user?.id && { alignSelf: 'flex-end', backgroundColor: colors.brand }]}>
            <Text style={[styles.commentAuthor, c.author_id === user?.id && { color: '#9DB2D0' }]}>{c.author_name}</Text>
            <Text style={[styles.commentText, c.author_id === user?.id && { color: '#fff' }]}>{c.text}</Text>
          </View>
        ))}

        {!isAdvisor && ticket.status !== 'CLOSED' && (
          <Pressable testID="close-ticket-btn" onPress={() => setCloseOpen(true)} style={[styles.closeBtn]}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Close Ticket & Release Payment</Text>
          </Pressable>
        )}
      </ScrollView>

      {ticket.status !== 'CLOSED' && (
        <View style={styles.commentBar}>
          <TextInput testID="comment-input" value={comment} onChangeText={setComment} placeholder="Add a comment..." style={styles.commentInput} />
          <Pressable testID="send-comment-btn" onPress={send} style={styles.sendBtn}><Ionicons name="send" size={18} color="#fff" /></Pressable>
        </View>
      )}

      <Modal visible={addStageOpen} transparent animationType="slide">
        <View style={styles.modalBg}><View style={styles.modalCard}>
          <Text style={{ fontWeight: '700', fontSize: 16 }}>Add Work Stage</Text>
          <TextInput testID="stage-title-input" value={stageTitle} onChangeText={setStageTitle} placeholder="Stage title" style={[styles.input, { marginTop: 12 }]} />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <Pressable onPress={() => setAddStageOpen(false)} style={[styles.modalBtn, { backgroundColor: colors.surfaceSecondary, flex: 1 }]}><Text>Cancel</Text></Pressable>
            <Pressable testID="confirm-add-stage" onPress={addStage} style={[styles.modalBtn, { backgroundColor: colors.brand, flex: 1 }]}><Text style={{ color: '#fff', fontWeight: '700' }}>Add</Text></Pressable>
          </View>
        </View></View>
      </Modal>

      <Modal visible={closeOpen} transparent animationType="slide">
        <View style={styles.modalBg}><View style={styles.modalCard}>
          <Text style={{ fontWeight: '700', fontSize: 16 }}>Rate this service</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
            {[1, 2, 3, 4, 5].map(n => <Pressable testID={`star-${n}`} key={n} onPress={() => setRating(n)}><Ionicons name={n <= rating ? 'star' : 'star-outline'} size={32} color={colors.brandSecondary} /></Pressable>)}
          </View>
          <TextInput testID="review-input" value={review} onChangeText={setReview} placeholder="Review (optional)" multiline style={[styles.input, { marginTop: 12, height: 80, textAlignVertical: 'top' }]} />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <Pressable onPress={() => setCloseOpen(false)} style={[styles.modalBtn, { backgroundColor: colors.surfaceSecondary, flex: 1 }]}><Text>Cancel</Text></Pressable>
            <Pressable testID="confirm-close-btn" onPress={close} style={[styles.modalBtn, { backgroundColor: colors.brand, flex: 1 }]}><Text style={{ color: '#fff', fontWeight: '700' }}>Release Payment</Text></Pressable>
          </View>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  title: { fontSize: 16, fontWeight: '700' },
  summary: { backgroundColor: colors.brand, padding: spacing.lg, borderRadius: radius.lg },
  summaryLabel: { color: '#9DB2D0', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  summaryAmt: { color: colors.brandSecondary, fontSize: 30, fontWeight: '800', marginTop: 4 },
  summarySub: { color: '#9DB2D0', fontSize: 13, marginTop: 2 },
  section: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, marginTop: spacing.lg, marginBottom: spacing.sm },
  stage: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.divider },
  stageDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stageTitle: { fontSize: 14, fontWeight: '600', color: colors.onSurface, marginBottom: 4 },
  smallBtn: { backgroundColor: colors.brandSecondaryLight, padding: 10, borderRadius: radius.sm, alignItems: 'center', marginTop: 8 },
  smallBtnText: { color: colors.brand, fontWeight: '700', fontSize: 12 },
  addStage: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.brand, borderRadius: radius.md, gap: 4 },
  comment: { backgroundColor: colors.surface, padding: 10, borderRadius: radius.md, marginBottom: 6, maxWidth: '80%', alignSelf: 'flex-start' },
  commentAuthor: { fontSize: 10, color: colors.textMuted, fontWeight: '700' },
  commentText: { fontSize: 13, color: colors.onSurface, marginTop: 2 },
  closeBtn: { backgroundColor: colors.success, padding: 14, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.lg },
  commentBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider, gap: 8 },
  commentInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 10 },
  sendBtn: { backgroundColor: colors.brand, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, padding: spacing.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingBottom: 32 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10 },
  modalBtn: { padding: 12, borderRadius: radius.md, alignItems: 'center' },
});
