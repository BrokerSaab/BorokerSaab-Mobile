import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/api';
import { colors, radius, spacing } from '@/src/theme';
import { StatusPill } from '@/src/ui';

export default function Bookings() {
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => setItems(await api.get('/bookings')), []);
  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceSecondary }} edges={['top']}>
      <View style={styles.header}><Text style={styles.title}>My Bookings</Text></View>
      <FlatList
        data={items}
        keyExtractor={(b) => b.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: spacing.lg }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Ionicons name="calendar-outline" size={48} color={colors.surfaceTertiary} />
            <Text style={{ color: colors.textMuted, marginTop: 12 }}>No bookings yet</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>Discover advisors and book a consultation</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View testID={`booking-${item.id}`} style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.advisor_name}</Text>
                <Text style={styles.sub}>{item.slot_date} · {item.slot_time} · {item.mode}</Text>
              </View>
              <StatusPill status={item.status} />
            </View>
            <View style={styles.footer}>
              <Text style={styles.amount}>₹{item.amount}</Text>
              <Text style={styles.meta}>{item.payment_method}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  header: { padding: spacing.lg, paddingBottom: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  title: { fontSize: 22, fontWeight: '700', color: colors.onSurface },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.divider },
  name: { fontSize: 15, fontWeight: '700', color: colors.onSurface },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.divider },
  amount: { fontSize: 16, fontWeight: '700', color: colors.brand },
  meta: { fontSize: 11, color: colors.textMuted },
});
