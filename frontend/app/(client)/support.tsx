import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, RefreshControl,
  TextInput, Modal, ActivityIndicator, ScrollView, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api, getToken } from '@/src/api';
import { useAuth } from '@/src/auth';
import { colors, radius, spacing } from '@/src/theme';
import { SignInGate } from '@/src/auth-gate';

const API_BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  OPEN:        { bg: '#FEF3C7', fg: '#92400E' },
  IN_PROGRESS: { bg: '#EEF0FF', fg: '#3730A3' },
  RESOLVED:    { bg: '#D1FAE5', fg: '#065F46' },
  CLOSED:      { bg: '#E5E7EB', fg: '#374151' },
};

const CATEGORIES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'BILLING', label: 'Billing' },
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'BOOKING_ISSUE', label: 'Booking Issue' },
  { value: 'ADVISOR_ISSUE', label: 'Advisor Issue' },
  { value: 'OTHER', label: 'Other' },
];

const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

interface Attachment {
  uri: string;
  name: string;
  type: string;
}

export default function SupportScreen() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Create ticket form
  const [formOpen, setFormOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [priority, setPriority] = useState('MEDIUM');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.get('/support/tickets');
      setTickets(Array.isArray(data) ? data : []);
    } catch { setTickets([]); }
  }, [user]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (!user) return <SignInGate icon="chatbubble-ellipses" title="Support" message="Sign in to raise and view your support tickets." />;

  const resetForm = () => {
    setSubject(''); setDescription(''); setCategory('GENERAL'); setPriority('MEDIUM');
    setAttachments([]); setFormError('');
  };

  const cancelForm = () => { resetForm(); setFormOpen(false); };

  const pickFiles = async () => {
    if (attachments.length >= 3) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 3 - attachments.length,
        quality: 0.8,
      });
      if (!result.canceled && result.assets) {
        const picked = result.assets.map(a => ({
          uri: a.uri,
          name: a.fileName || `image_${Date.now()}.jpg`,
          type: a.mimeType || 'image/jpeg',
        }));
        setAttachments(prev => [...prev, ...picked].slice(0, 3));
      }
    } catch { /* user cancelled */ }
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!subject.trim() || subject.trim().length < 3) {
      setFormError('Subject must be at least 3 characters.');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setFormError('Description must be at least 10 characters. Please provide more details about your issue.');
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      const form = new FormData();
      form.append('subject', subject.trim());
      form.append('description', description.trim());
      form.append('category', category);
      form.append('priority', priority);
      attachments.forEach(att => {
        form.append('attachments', {
          uri: att.uri,
          name: att.name,
          type: att.type,
        } as any);
      });

      const res = await fetch(`${API_BASE}/support/tickets`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: subject.trim(),
          description: description.trim(),
          category,
          priority,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Ticket Created', `Your ticket ${data.ticket_number} has been created. Our team will respond within 24 hours.`);
        resetForm();
        setFormOpen(false);
        await load();
      } else {
        setFormError(data.detail || data.message || 'Failed to create ticket.');
      }
    } catch {
      setFormError('Could not connect to the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const sc = (status: string) => STATUS_COLORS[status] || STATUS_COLORS.OPEN;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceSecondary }} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Support</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>Raise & track support tickets</Text>
        </View>
        <Pressable onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Create ticket button */}
      <Pressable onPress={() => setFormOpen(true)} style={styles.createBtn}>
        <View style={styles.createIcon}>
          <Ionicons name="add" size={20} color={colors.brandIndigo} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.brandIndigo }}>Raise New Ticket</Text>
          <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>Tap to describe your issue</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>

      {/* Ticket list */}
      <FlatList
        data={tickets}
        keyExtractor={(t) => t.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.surfaceTertiary} />
            <Text style={{ color: colors.textMuted, marginTop: 12, textAlign: 'center' }}>No support tickets yet{'\n'}Tap above to raise your first ticket</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isExpanded = expanded === item.id;
          const s = sc(item.status);
          return (
            <Pressable onPress={() => setExpanded(isExpanded ? null : item.id)} style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.brandIndigo, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>{item.ticket_number}</Text>
                  <Text style={styles.cardSubject} numberOfLines={isExpanded ? undefined : 1}>{item.subject}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <View style={[styles.badge, { backgroundColor: '#EEF0FF' }]}>
                      <Text style={{ fontSize: 10, color: colors.brandIndigo, fontWeight: '600' }}>{item.category?.replace('_', ' ')}</Text>
                    </View>
                    <Text style={{ fontSize: 10, color: colors.textMuted }}>{new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
                  </View>
                </View>
                <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: s.fg }}>{item.status.replace('_', ' ')}</Text>
                </View>
              </View>

              {isExpanded && (
                <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 12 }}>
                  <Text style={{ fontSize: 13, color: colors.onSurface, lineHeight: 20 }}>{item.description}</Text>

                  {/* Closing notes */}
                  {item.closing_notes && (
                    <View style={styles.closingNotes}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.success, marginBottom: 4 }}>Admin Response</Text>
                      <Text style={{ fontSize: 12, color: '#065F46', lineHeight: 18 }}>{item.closing_notes}</Text>
                    </View>
                  )}

                  {/* Activity timeline */}
                  {item.activities?.length > 0 && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 8 }}>TIMELINE</Text>
                      {item.activities.map((act: any, idx: number) => (
                        <View key={idx} style={styles.timelineItem}>
                          <View style={styles.timelineDot} />
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={{ fontSize: 11, color: colors.onSurface }}>
                              {act.action === 'COMMENT' ? 'Comment added' : act.to_status ? `Status → ${act.to_status.replace('_', ' ')}` : act.action.replace('_', ' ')}
                            </Text>
                            {act.note && act.action === 'COMMENT' && (
                              <View style={styles.commentBubble}>
                                <Text style={{ fontSize: 11, color: colors.brandIndigo }}>{act.note}</Text>
                              </View>
                            )}
                            {act.note && act.action !== 'STATUS_CHANGED' && act.action !== 'COMMENT' && (
                              <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 1 }}>{act.note}</Text>
                            )}
                            <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>
                              {act.performed_by_name} · {new Date(act.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {(item.status === 'RESOLVED' || item.status === 'CLOSED') && (
                    <View style={styles.resolvedBanner}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                      <Text style={{ fontSize: 11, color: '#065F46', marginLeft: 6 }}>
                        Ticket {item.status.toLowerCase()} on {new Date(item.closed_at || item.resolved_at || item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <View style={{ alignItems: 'center', marginTop: 8 }}>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
              </View>
            </Pressable>
          );
        }}
      />

      {/* Create Ticket Modal */}
      <Modal visible={formOpen} transparent animationType="slide" onRequestClose={cancelForm}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.onSurface }}>Raise New Ticket</Text>
                <Pressable onPress={cancelForm} hitSlop={12}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </Pressable>
              </View>

              <Text style={styles.label}>Subject</Text>
              <TextInput
                value={subject}
                onChangeText={setSubject}
                placeholder="e.g. Payment issue, Profile not approved…"
                maxLength={200}
                style={styles.input}
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                value={description}
                onChangeText={(t) => { setDescription(t); setFormError(''); }}
                placeholder="Describe your issue in detail (min. 10 characters)…"
                maxLength={2000}
                multiline
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                placeholderTextColor={colors.textMuted}
              />
              {description.trim().length > 0 && description.trim().length < 10 && (
                <Text style={styles.charHint}>
                  {10 - description.trim().length} more character{10 - description.trim().length !== 1 ? 's' : ''} needed
                </Text>
              )}

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Category</Text>
                  <View style={styles.pickerRow}>
                    {CATEGORIES.map(c => (
                      <Pressable key={c.value} onPress={() => setCategory(c.value)}
                        style={[styles.chip, category === c.value && styles.chipSelected]}>
                        <Text style={[styles.chipText, category === c.value && styles.chipTextSelected]}>{c.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={styles.label}>Priority</Text>
              <View style={styles.priorityRow}>
                {PRIORITIES.map(p => (
                  <Pressable key={p.value} onPress={() => setPriority(p.value)}
                    style={[styles.prioChip, priority === p.value && styles.prioChipSelected]}>
                    <Text style={[styles.chipText, priority === p.value && styles.chipTextSelected]}>{p.label}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Attachments */}
              <Text style={styles.label}>Attachments (optional)</Text>
              <Pressable onPress={pickFiles} disabled={attachments.length >= 3} style={[styles.attachBtn, attachments.length >= 3 && { opacity: 0.4 }]}>
                <Ionicons name="attach" size={16} color={colors.textMuted} />
                <Text style={{ fontSize: 12, color: colors.textMuted, marginLeft: 6 }}>Attach files (images / PDF, max 3)</Text>
              </Pressable>
              {attachments.map((att, i) => (
                <View key={i} style={styles.attachItem}>
                  <Ionicons name={att.type.startsWith('image') ? 'image' : 'document'} size={14} color={colors.brandIndigo} />
                  <Text style={{ fontSize: 12, color: colors.onSurface, flex: 1, marginLeft: 6 }} numberOfLines={1}>{att.name}</Text>
                  <Pressable onPress={() => setAttachments(prev => prev.filter((_, j) => j !== i))} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color={colors.error} />
                  </Pressable>
                </View>
              ))}

              {/* Error */}
              {formError !== '' && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={14} color={colors.error} />
                  <Text style={{ fontSize: 12, color: colors.error, flex: 1, marginLeft: 6 }}>{formError}</Text>
                </View>
              )}

              {/* Buttons */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, paddingBottom: 8 }}>
                <Pressable onPress={cancelForm} style={[styles.modalBtn, { backgroundColor: colors.surfaceSecondary, flex: 1 }]}>
                  <Text style={{ color: colors.onSurface, fontWeight: '600' }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSubmit}
                  disabled={submitting || !subject.trim() || !description.trim()}
                  style={[styles.modalBtn, { backgroundColor: colors.brandIndigo, flex: 2, opacity: (submitting || !subject.trim() || !description.trim()) ? 0.4 : 1 }]}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <><Ionicons name="send" size={14} color="#fff" /><Text style={{ color: '#fff', fontWeight: '700', marginLeft: 6 }}>Submit Ticket</Text></>
                  }
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  title: { fontSize: 22, fontWeight: '700', color: colors.onSurface },
  refreshBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
  createBtn: { flexDirection: 'row', alignItems: 'center', margin: spacing.lg, padding: spacing.md, backgroundColor: colors.brandIndigoLight, borderRadius: radius.md, borderWidth: 1, borderColor: '#C7D2FE', gap: 10 },
  createIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.divider },
  cardSubject: { fontSize: 14, fontWeight: '600', color: colors.onSurface, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  closingNotes: { marginTop: 12, backgroundColor: '#D1FAE5', borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: '#A7F3D0' },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brandIndigo, marginTop: 4 },
  commentBubble: { marginTop: 4, backgroundColor: colors.brandIndigoLight, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#C7D2FE' },
  resolvedBanner: { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: '#D1FAE5', borderRadius: radius.md, padding: 10, borderWidth: 1, borderColor: '#A7F3D0' },

  // Modal styles
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, padding: spacing.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: '90%', paddingBottom: 16 },
  label: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.3, marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.onSurface },
  charHint: { fontSize: 11, color: '#F59E0B', marginTop: 4 },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  chipSelected: { backgroundColor: colors.brandIndigoLight, borderColor: colors.brandIndigo },
  chipText: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  chipTextSelected: { color: colors.brandIndigo },
  priorityRow: { flexDirection: 'row', gap: 8 },
  prioChip: { flex: 1, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  prioChipSelected: { backgroundColor: colors.brandIndigoLight, borderColor: colors.brandIndigo },
  attachBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, borderRadius: radius.md },
  attachItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceSecondary, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 8, marginTop: 6 },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FEE2E2', borderRadius: radius.md, padding: 10, marginTop: 10, borderWidth: 1, borderColor: '#FECACA' },
  modalBtn: { flexDirection: 'row', paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
