import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '@/src/api';
import { colors, radius, spacing } from '@/src/theme';

export default function Unlocks() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => setItems(await api.get('/contact-unlocks/me')), []);
  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceSecondary }} edges={['top']}>
      <View style={styles.head}>
        <Pressable testID="ul-back" onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color={colors.brand} /></Pressable>
        <Text style={styles.title}>Unlock History</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(u) => u.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: spacing.lg }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Ionicons name="lock-open-outline" size={48} color={colors.surfaceTertiary} />
            <Text style={{ color: colors.textMuted, marginTop: 12 }}>No advisor contacts unlocked yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/advisor/${item.advisor_id}`)} style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: item.is_free ? colors.brandSecondaryLight : colors.brandIndigoLight }]}>
              <Ionicons name="key" size={18} color={item.is_free ? colors.brandSecondary : colors.brandIndigo} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.name}>{item.advisor_name}</Text>
              <Text style={styles.sub}>{item.is_free ? '🎁 Free intro' : '1 credit used'} · {new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  title: { fontSize: 16, fontWeight: '700', color: colors.onSurface },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, marginBottom: 6, borderWidth: 1, borderColor: colors.divider },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14, fontWeight: '600', color: colors.onSurface },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
