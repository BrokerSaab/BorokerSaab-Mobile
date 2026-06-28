import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '@/src/api';
import { useAuth } from '@/src/auth';
import { colors, radius, spacing } from '@/src/theme';
import { StatusPill } from '@/src/ui';

export default function Dashboard() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setBookings(await api.get('/bookings'));
    setQuotes(await api.get('/quotes'));
    setTickets(await api.get('/tickets'));
  }, []);
  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await refresh(); await load(); setRefreshing(false); };

  const pendingQuotes = quotes.filter(q => q.status === 'REQUESTED').length;
  const activeTickets = tickets.filter(t => t.status !== 'CLOSED').length;
  const upcomingBookings = bookings.filter(b => b.status === 'ACCEPTED').length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceSecondary }} edges={['top']}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 30 }}>
        <Text style={styles.greet}>Hello, {user?.full_name}</Text>
        <Text style={styles.sub}>Here's what's happening today</Text>

        <View style={styles.grid}>
          <Kpi icon="cash" label="Wallet" value={`₹${(user?.wallet_balance || 0).toFixed(0)}`} color={colors.success} />
          <Kpi icon="calendar" label="Upcoming" value={String(upcomingBookings)} color={colors.brand} />
          <Kpi icon="document-text" label="New Quotes" value={String(pendingQuotes)} color={colors.warning} />
          <Kpi icon="briefcase" label="Active Tickets" value={String(activeTickets)} color={colors.brandSecondary} />
        </View>

        {pendingQuotes > 0 && (
          <Pressable testID="quotes-pending" onPress={() => router.push('/(advisor)/quotes')} style={styles.cta}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{pendingQuotes} pending quote request{pendingQuotes > 1 ? 's' : ''}</Text>
              <Text style={{ color: '#9DB2D0', fontSize: 12, marginTop: 2 }}>Tap to respond with a fee breakdown</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.brandSecondary} />
          </Pressable>
        )}

        <Text style={styles.section}>UPCOMING BOOKINGS</Text>
        {bookings.filter(b => b.status === 'ACCEPTED').length === 0 && <Text style={styles.empty}>No upcoming bookings</Text>}
        {bookings.filter(b => b.status === 'ACCEPTED').map(b => (
          <View key={b.id} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{b.client_name}</Text>
              <Text style={styles.cardSub}>{b.slot_date} · {b.slot_time} · {b.mode}</Text>
            </View>
            <Pressable testID={`complete-${b.id}`} onPress={async () => { await api.post(`/bookings/${b.id}/complete`); await load(); await refresh(); }} style={styles.completeBtn}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Mark Done</Text>
            </Pressable>
          </View>
        ))}

        <Text style={styles.section}>ACTIVE TICKETS</Text>
        {tickets.filter(t => t.status !== 'CLOSED').length === 0 && <Text style={styles.empty}>No active tickets</Text>}
        {tickets.filter(t => t.status !== 'CLOSED').map(t => (
          <Pressable key={t.id} onPress={() => router.push(`/ticket/${t.id}`)} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t.client_name}</Text>
              <Text style={styles.cardSub}>{t.category} · ₹{t.total}</Text>
            </View>
            <StatusPill status={t.status} />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Kpi({ icon, label, value, color }: any) {
  return <View style={styles.kpi}>
    <View style={[styles.kpiIcon, { backgroundColor: color + '20' }]}><Ionicons name={icon} size={18} color={color} /></View>
    <Text style={styles.kpiVal}>{value}</Text>
    <Text style={styles.kpiLbl}>{label}</Text>
  </View>;
}

const styles = StyleSheet.create({
  greet: { fontSize: 22, fontWeight: '700', color: colors.onSurface },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.lg },
  kpi: { width: '48%', backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider },
  kpiIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiVal: { fontSize: 20, fontWeight: '800', color: colors.onSurface },
  kpiLbl: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  cta: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.brand, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.lg },
  section: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, marginTop: spacing.xl, marginBottom: spacing.sm },
  empty: { color: colors.textMuted, textAlign: 'center', padding: 14 },
  card: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.onSurface },
  cardSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  completeBtn: { backgroundColor: colors.success, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm },
});
