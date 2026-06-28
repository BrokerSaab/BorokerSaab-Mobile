import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '@/src/api';
import { useAuth } from '@/src/auth';
import { colors, radius, spacing } from '@/src/theme';
import { StatusPill } from '@/src/ui';
import { SignInGate } from '@/src/auth-gate';

export default function ClientTickets() {
  const router = useRouter();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'tickets' | 'quotes'>('tickets');

  const load = useCallback(async () => {
    if (!user) return;
    setTickets(await api.get('/tickets'));
    setQuotes(await api.get('/quotes'));
  }, [user]);
  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (!user) return <SignInGate icon="document-text" title="Your Tickets & Quotes" message="Sign in to view escrow-protected service tickets and your quote requests." />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceSecondary }} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Tickets & Quotes</Text>
        <View style={styles.tabRow}>
          <Pressable testID="tab-tickets" onPress={() => setTab('tickets')} style={[styles.tab, tab === 'tickets' && styles.tabSel]}>
            <Text style={[styles.tabText, tab === 'tickets' && styles.tabTextSel]}>Tickets ({tickets.length})</Text>
          </Pressable>
          <Pressable testID="tab-quotes" onPress={() => setTab('quotes')} style={[styles.tab, tab === 'quotes' && styles.tabSel]}>
            <Text style={[styles.tabText, tab === 'quotes' && styles.tabTextSel]}>Quotes ({quotes.length})</Text>
          </Pressable>
        </View>
      </View>
      {tab === 'tickets' ? (
        <FlatList
          data={tickets}
          keyExtractor={(t) => t.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: spacing.lg }}
          ListEmptyComponent={<Empty icon="briefcase-outline" text="No active service tickets" />}
          renderItem={({ item }) => (
            <Pressable testID={`ticket-${item.id}`} onPress={() => router.push(`/ticket/${item.id}`)} style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.advisor_name}</Text>
                  <Text style={styles.sub}>{item.category}</Text>
                </View>
                <StatusPill status={item.status} />
              </View>
              <View style={styles.footer}>
                <Text style={styles.amount}>₹{item.total}</Text>
                <Text style={styles.meta}>{(item.stages || []).length} stages · Open</Text>
              </View>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={quotes}
          keyExtractor={(q) => q.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: spacing.lg }}
          ListEmptyComponent={<Empty icon="document-text-outline" text="No quotes requested yet" />}
          renderItem={({ item }) => (
            <Pressable testID={`quote-${item.id}`} onPress={() => router.push(`/quote/${item.id}`)} style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.advisor_name}</Text>
                  <Text style={styles.sub}>{item.category}</Text>
                </View>
                <StatusPill status={item.status} />
              </View>
              {item.status === 'QUOTED' && (
                <View style={styles.footer}>
                  <Text style={styles.amount}>₹{item.total}</Text>
                  <Text style={styles.meta}>Tap to review & accept</Text>
                </View>
              )}
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function Empty({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={{ alignItems: 'center', padding: 40 }}>
      <Ionicons name={icon} size={48} color={colors.surfaceTertiary} />
      <Text style={{ color: colors.textMuted, marginTop: 12 }}>{text}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  header: { padding: spacing.lg, paddingBottom: 0, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  title: { fontSize: 22, fontWeight: '700', color: colors.onSurface, marginBottom: spacing.md },
  tabRow: { flexDirection: 'row' },
  tab: { paddingHorizontal: 0, paddingVertical: 10, marginRight: 18, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabSel: { borderBottomColor: colors.brand },
  tabText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  tabTextSel: { color: colors.brand },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.divider },
  name: { fontSize: 15, fontWeight: '700', color: colors.onSurface },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.divider },
  amount: { fontSize: 16, fontWeight: '700', color: colors.brand },
  meta: { fontSize: 11, color: colors.textMuted },
});
