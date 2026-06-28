import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '@/src/api';
import { colors, radius, spacing } from '@/src/theme';
import { StatusPill } from '@/src/ui';

export default function AdvisorTickets() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => setItems(await api.get('/tickets')), []);
  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceSecondary }} edges={['top']}>
      <View style={styles.header}><Text style={styles.title}>Service Tickets</Text></View>
      <FlatList
        data={items}
        keyExtractor={(t) => t.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: spacing.lg }}
        ListEmptyComponent={<View style={{ alignItems: 'center', padding: 40 }}><Ionicons name="briefcase-outline" size={48} color={colors.surfaceTertiary} /><Text style={{ color: colors.textMuted, marginTop: 12 }}>No tickets yet</Text></View>}
        renderItem={({ item }) => (
          <Pressable testID={`adv-ticket-${item.id}`} onPress={() => router.push(`/ticket/${item.id}`)} style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.client_name}</Text>
                <Text style={styles.sub}>{item.category} · {(item.stages || []).length} stages</Text>
              </View>
              <StatusPill status={item.status} />
            </View>
            <View style={styles.footer}>
              <Text style={styles.amount}>₹{item.total}</Text>
              <Text style={styles.meta}>Tap to manage</Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  header: { padding: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  title: { fontSize: 22, fontWeight: '700' },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.divider },
  name: { fontSize: 15, fontWeight: '700', color: colors.onSurface },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.divider },
  amount: { fontSize: 16, fontWeight: '700', color: colors.brand },
  meta: { fontSize: 11, color: colors.textMuted },
});
