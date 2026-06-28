import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/api';
import { colors, radius, spacing } from '@/src/theme';
import { StatusPill } from '@/src/ui';

export default function AdvisorQuotes() {
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState<any>(null);
  const [lines, setLines] = useState<{ description: string; amount: string }[]>([{ description: '', amount: '' }]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => setItems(await api.get('/quotes')), []);
  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const submit = async () => {
    const validItems = lines.filter(l => l.description.trim() && parseFloat(l.amount) > 0)
      .map(l => ({ description: l.description, amount: parseFloat(l.amount) }));
    if (validItems.length === 0) return;
    setBusy(true);
    try {
      await api.post(`/quotes/${open.id}/submit`, { line_items: validItems, note });
      setOpen(null); setLines([{ description: '', amount: '' }]); setNote(''); await load();
    } finally { setBusy(false); }
  };

  const total = lines.reduce((a, l) => a + (parseFloat(l.amount) || 0), 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceSecondary }} edges={['top']}>
      <View style={styles.header}><Text style={styles.title}>Quote Requests</Text></View>
      <FlatList
        data={items}
        keyExtractor={(q) => q.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: spacing.lg }}
        ListEmptyComponent={<View style={{ alignItems: 'center', padding: 40 }}><Ionicons name="document-text-outline" size={48} color={colors.surfaceTertiary} /><Text style={{ color: colors.textMuted, marginTop: 12 }}>No quote requests yet</Text></View>}
        renderItem={({ item }) => (
          <View testID={`q-${item.id}`} style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.client_name}</Text>
                <Text style={styles.sub}>{item.category}</Text>
              </View>
              <StatusPill status={item.status} />
            </View>
            <Text style={styles.msg}>"{item.message}"</Text>
            {item.status === 'REQUESTED' && (
              <Pressable testID={`reply-${item.id}`} onPress={() => setOpen(item)} style={styles.replyBtn}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Submit Quote</Text>
              </Pressable>
            )}
            {item.status !== 'REQUESTED' && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.divider }}>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>Total quoted</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.brand }}>₹{item.total}</Text>
              </View>
            )}
          </View>
        )}
      />

      <Modal visible={!!open} transparent animationType="slide" onRequestClose={() => setOpen(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 18, fontWeight: '700' }}>Submit Fee Quote</Text>
              <Pressable onPress={() => setOpen(null)}><Ionicons name="close" size={24} /></Pressable>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>For {open?.client_name} · {open?.category}</Text>
            <Text style={styles.lbl}>Line Items</Text>
            {lines.map((l, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
                <TextInput testID={`line-desc-${i}`} value={l.description} onChangeText={t => { const n = [...lines]; n[i].description = t; setLines(n); }} placeholder="Description" style={[styles.input, { flex: 2 }]} />
                <TextInput testID={`line-amt-${i}`} value={l.amount} onChangeText={t => { const n = [...lines]; n[i].amount = t.replace(/[^0-9.]/g, ''); setLines(n); }} placeholder="₹" keyboardType="decimal-pad" style={[styles.input, { flex: 1 }]} />
              </View>
            ))}
            <Pressable testID="add-line-btn" onPress={() => setLines([...lines, { description: '', amount: '' }])} style={styles.addLine}><Ionicons name="add" size={16} color={colors.brand} /><Text style={{ color: colors.brand, fontWeight: '600' }}>Add Item</Text></Pressable>
            <TextInput value={note} onChangeText={setNote} placeholder="Note (optional)" multiline style={[styles.input, { height: 70, textAlignVertical: 'top', marginTop: 10 }]} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.divider }}>
              <Text style={{ fontSize: 14, color: colors.textMuted }}>Total</Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.brand }}>₹{total.toFixed(0)}</Text>
            </View>
            <Pressable testID="submit-quote-btn" onPress={submit} disabled={busy || total <= 0} style={[styles.payBtn, (busy || total <= 0) && { opacity: 0.5 }]}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Send Quote</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { padding: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  title: { fontSize: 22, fontWeight: '700' },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.divider },
  name: { fontSize: 15, fontWeight: '700', color: colors.onSurface },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  msg: { fontSize: 13, color: colors.onSurfaceSecondary, fontStyle: 'italic', marginTop: 10, padding: 10, backgroundColor: colors.surfaceSecondary, borderRadius: radius.sm },
  replyBtn: { backgroundColor: colors.brand, padding: 12, borderRadius: radius.md, alignItems: 'center', marginTop: 10 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, padding: spacing.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingBottom: 32, maxHeight: '85%' },
  lbl: { fontSize: 12, fontWeight: '700', color: colors.onSurfaceSecondary, letterSpacing: 0.5, marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 10, fontSize: 14 },
  addLine: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 10, borderRadius: radius.sm, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.brand, gap: 4 },
  payBtn: { backgroundColor: colors.brand, padding: 14, borderRadius: radius.md, alignItems: 'center', marginTop: 14 },
});
