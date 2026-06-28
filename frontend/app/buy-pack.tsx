import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '@/src/api';
import { useAuth } from '@/src/auth';
import { colors, radius, spacing } from '@/src/theme';

export default function BuyPack() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [packs, setPacks] = useState<any[]>([]);
  const [subs, setSubs] = useState<any>({ subscriptions: [], credits_available: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [p, s] = await Promise.all([api.get('/packs'), api.get('/contact-subscriptions/me')]);
    setPacks(p); setSubs(s);
  }, []);
  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); await refresh(); setRefreshing(false); };

  const buy = async (pack: any) => {
    if ((user?.wallet_balance || 0) < pack.price) {
      Alert.alert('Insufficient wallet', `Pack costs ₹${pack.price}. Please add money to your wallet first.`, [
        { text: 'Cancel' }, { text: 'Add Money', onPress: () => router.push('/(client)/profile') }
      ]);
      return;
    }
    setBusy(pack.id);
    try {
      await api.post('/packs/buy', { pack_id: pack.id });
      await refresh(); await load();
      Alert.alert('Pack Purchased', `${pack.credits} contact credits added to your account.`);
    } catch (e: any) { Alert.alert('Error', e.message); }
    setBusy(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceSecondary }} edges={['top']}>
      <View style={styles.head}>
        <Pressable testID="bp-back" onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color={colors.brand} /></Pressable>
        <Text style={styles.title}>Contact Credit Packs</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        <View style={styles.heroCard}>
          <LinearGradient colors={[colors.brand, colors.brandIndigoDeep]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <Ionicons name="key" size={28} color={colors.brandSecondary} />
          <Text style={styles.heroTitle}>{subs.credits_available} credits available</Text>
          <Text style={styles.heroSub}>1 credit = unlock 1 advisor's contact details</Text>
          <Text style={styles.heroSub}>Your first unlock is FREE 🎁</Text>
        </View>

        <Text style={styles.section}>CHOOSE A PACK</Text>
        {packs.map(p => (
          <View key={p.id} style={[styles.packCard, p.popular && { borderColor: colors.brandSecondary }]}>
            {p.popular && (
              <View style={styles.popular}>
                <Ionicons name="star" size={11} color={colors.onBrandSecondary} />
                <Text style={styles.popularText}>BEST VALUE</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.packName}>{p.name}</Text>
                <Text style={styles.packCredits}>{p.credits} credits · valid {p.validity_days} days</Text>
                <Text style={styles.packPer}>₹{(p.price / p.credits).toFixed(0)} per contact</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.packPrice}>₹{p.price}</Text>
                <Pressable testID={`buy-${p.id}`} onPress={() => buy(p)} disabled={busy === p.id} style={[styles.buyBtn, busy === p.id && { opacity: 0.5 }]}>
                  {busy === p.id ? <ActivityIndicator color="#fff" /> : <Text style={styles.buyBtnText}>Buy</Text>}
                </Pressable>
              </View>
            </View>
          </View>
        ))}

        {subs.subscriptions.length > 0 && (
          <>
            <Text style={styles.section}>YOUR PACKS</Text>
            {subs.subscriptions.map((s: any) => (
              <View key={s.id} style={styles.subCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subName}>{s.pack_name} Pack</Text>
                    <Text style={styles.subMeta}>{s.credits_remaining} / {s.credits_total} credits left</Text>
                    <Text style={styles.subMeta}>Expires {new Date(s.expires_at).toLocaleDateString()}</Text>
                  </View>
                  <Text style={[styles.subAmount, { color: colors.brandIndigo }]}>{s.credits_remaining}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  title: { fontSize: 16, fontWeight: '700', color: colors.onSurface },
  heroCard: { padding: spacing.lg, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.lg },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 8 },
  heroSub: { color: '#9DB2D0', fontSize: 12, marginTop: 2 },
  section: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, marginTop: spacing.md, marginBottom: spacing.sm },
  packCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.divider, position: 'relative' },
  popular: { position: 'absolute', top: -8, right: 14, backgroundColor: colors.brandSecondary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 3 },
  popularText: { color: colors.onBrandSecondary, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  packName: { fontSize: 16, fontWeight: '700', color: colors.onSurface },
  packCredits: { fontSize: 13, color: colors.brandIndigo, fontWeight: '600', marginTop: 4 },
  packPer: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  packPrice: { fontSize: 22, fontWeight: '800', color: colors.brand, marginBottom: 8 },
  buyBtn: { backgroundColor: colors.brandIndigo, paddingHorizontal: 18, paddingVertical: 9, borderRadius: radius.md },
  buyBtnText: { color: '#fff', fontWeight: '700' },
  subCard: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.divider },
  subName: { fontSize: 14, fontWeight: '700', color: colors.onSurface },
  subMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  subAmount: { fontSize: 28, fontWeight: '800' },
});
