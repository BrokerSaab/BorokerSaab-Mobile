import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/src/api';
import { useAuth } from '@/src/auth';
import { colors, radius, spacing } from '@/src/theme';
import { StatusPill } from '@/src/ui';

export default function QuoteDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [quote, setQuote] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => {
    const all = await api.get('/quotes');
    setQuote(all.find((q: any) => q.id === id));
  };
  useEffect(() => { load(); }, [id]);

  if (!quote) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.brand} /></View>;

  const accept = async () => {
    setBusy(true); setErr('');
    try {
      const ticket = await api.post(`/quotes/${id}/accept`, { payment_method: 'WALLET' });
      await refresh();
      router.replace(`/ticket/${ticket.id}`);
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceSecondary }} edges={['top']}>
      <View style={styles.header}>
        <Pressable testID="qd-back" onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color={colors.brand} /></Pressable>
        <Text style={styles.title}>Quote Details</Text>
        <StatusPill status={quote.status} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={styles.card}>
          <Text style={styles.label}>FROM</Text>
          <Text style={styles.name}>{quote.advisor_name}</Text>
          <Text style={styles.sub}>{quote.category}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>YOUR REQUEST</Text>
          <Text style={styles.msg}>"{quote.message}"</Text>
        </View>
        {quote.status === 'QUOTED' && (
          <View style={styles.card}>
            <Text style={styles.label}>FEE BREAKDOWN</Text>
            {(quote.line_items || []).map((l: any, i: number) => (
              <View key={i} style={styles.line}>
                <Text style={{ flex: 1, fontSize: 13 }}>{l.description}</Text>
                <Text style={{ fontWeight: '700' }}>₹{l.amount}</Text>
              </View>
            ))}
            {!!quote.advisor_note && (
              <View style={{ marginTop: 10, padding: 10, backgroundColor: colors.surfaceSecondary, borderRadius: radius.sm }}>
                <Text style={{ fontSize: 12, color: colors.onSurfaceSecondary }}>{quote.advisor_note}</Text>
              </View>
            )}
            <View style={[styles.line, { borderTopWidth: 1, borderTopColor: colors.divider, marginTop: 8, paddingTop: 12 }]}>
              <Text style={{ fontSize: 15, fontWeight: '700' }}>Total</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.brand }}>₹{quote.total}</Text>
            </View>
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 8 }}>Paid amount will be held in escrow and released to advisor only after you confirm work completion.</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>Your wallet: ₹{(user?.wallet_balance || 0).toFixed(0)}</Text>
            {err ? <Text style={{ color: colors.error, marginTop: 8 }}>{err}</Text> : null}
            <Pressable testID="accept-quote-btn" onPress={accept} disabled={busy} style={[styles.acceptBtn, busy && { opacity: 0.5 }]}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Accept & Pay ₹{quote.total}</Text>}
            </Pressable>
          </View>
        )}
        {quote.status === 'REQUESTED' && (
          <View style={[styles.card, { alignItems: 'center' }]}>
            <Ionicons name="hourglass-outline" size={36} color={colors.brandSecondary} />
            <Text style={{ color: colors.textMuted, marginTop: 10, textAlign: 'center' }}>Awaiting advisor's fee breakdown. You'll be notified when ready.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: colors.surface, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
  title: { fontSize: 16, fontWeight: '700', flex: 1 },
  card: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.divider },
  label: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 6 },
  name: { fontSize: 16, fontWeight: '700' },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  msg: { fontSize: 13, color: colors.onSurfaceSecondary, fontStyle: 'italic' },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  acceptBtn: { backgroundColor: colors.brand, padding: 14, borderRadius: radius.md, alignItems: 'center', marginTop: 14 },
});
