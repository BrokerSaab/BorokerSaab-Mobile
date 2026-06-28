import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, FlatList, RefreshControl, TextInput, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '@/src/api';
import { useAuth } from '@/src/auth';
import { colors, radius, spacing } from '@/src/theme';

export default function Discover() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [cats, setCats] = useState<any[]>([]);
  const [advisors, setAdvisors] = useState<any[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (activeCat) qs.append('category', activeCat);
    if (search) qs.append('search', search);
    const adv = await api.get(`/advisors${qs.toString() ? `?${qs}` : ''}`);
    setAdvisors(adv);
  }, [activeCat, search]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const c = await api.get('/categories'); setCats(c);
      await load(); setLoading(false);
    })();
  }, [load]);

  const onRefresh = async () => { setRefreshing(true); await refresh(); await load(); setRefreshing(false); };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.brand }}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <Image source={require('../../assets/images/brokersaab-logo.png')} style={{ width: 40, height: 40 }} resizeMode="contain" />
            <View>
              <Text style={styles.hello}>Hello,</Text>
              <Text style={styles.name}>{user?.full_name || 'there'}</Text>
            </View>
          </View>
          <Pressable testID="wallet-pill" onPress={() => router.push('/(client)/profile')} style={styles.walletPill}>
            <Ionicons name="wallet" size={14} color={colors.brandSecondary} />
            <Text style={styles.walletText}>₹{(user?.wallet_balance || 0).toFixed(0)}</Text>
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color="#88A0C0" />
            <TextInput
              testID="search-input"
              value={search}
              onChangeText={setSearch}
              placeholder="Search advisors, services, locations..."
              placeholderTextColor="#88A0C0"
              style={{ flex: 1, color: '#fff', marginLeft: 8, fontSize: 14 }}
              onSubmitEditing={load}
              returnKeyType="search"
            />
          </View>
        </View>
      </SafeAreaView>

      <FlatList
        data={advisors}
        keyExtractor={(a) => a.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View>
            <Pressable testID="hero-badge-card" style={styles.hero} onPress={() => router.push('/(client)/discover')}>
              <LinearGradient colors={[colors.brand, '#1a3358']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <View style={{ flex: 1 }}>
                <View style={styles.authBadge}>
                  <Ionicons name="shield-checkmark" size={12} color={colors.brand} />
                  <Text style={styles.authBadgeText}>AUTHORIZED DEALERS</Text>
                </View>
                <Text style={styles.heroTitle}>Find verified advisors{'\n'}you can trust</Text>
                <Text style={styles.heroSub}>KYC-verified · Escrow protected · Rated by clients</Text>
              </View>
              <Ionicons name="ribbon" size={64} color={colors.brandSecondary} style={{ opacity: 0.5 }} />
            </Pressable>

            <Text style={styles.sectionTitle}>Browse by category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 8 }}>
              <Pressable testID="cat-all" onPress={() => setActiveCat(null)} style={[styles.chip, !activeCat && styles.chipSel]}>
                <Text style={[styles.chipText, !activeCat && styles.chipTextSel]}>All</Text>
              </Pressable>
              {cats.map(c => (
                <Pressable key={c.id} testID={`chip-${c.id}`} onPress={() => setActiveCat(c.id === activeCat ? null : c.id)} style={[styles.chip, activeCat === c.id && styles.chipSel]}>
                  <Ionicons name={c.icon} size={13} color={activeCat === c.id ? colors.brand : colors.textMuted} />
                  <Text style={[styles.chipText, activeCat === c.id && styles.chipTextSel]}>{c.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>{advisors.length} verified professionals</Text>
          </View>
        }
        renderItem={({ item }) => <AdvisorCard advisor={item} onPress={() => router.push(`/advisor/${item.id}`)} />}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListEmptyComponent={loading ? <ActivityIndicator style={{ marginTop: 30 }} color={colors.brand} /> : (
          <View style={{ alignItems: 'center', padding: 30 }}>
            <Ionicons name="search-outline" size={42} color={colors.surfaceTertiary} />
            <Text style={{ color: colors.textMuted, marginTop: 10 }}>No advisors found</Text>
          </View>
        )}
      />
    </View>
  );
}

export function AdvisorCard({ advisor, onPress }: any) {
  return (
    <Pressable testID={`advisor-card-${advisor.id}`} onPress={onPress} style={styles.card}>
      {advisor.is_authorized_dealer && (
        <View style={styles.cardBadge}>
          <Ionicons name="ribbon" size={11} color={colors.onBrandSecondary} />
          <Text style={styles.cardBadgeText}>AUTHORIZED DEALER</Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={styles.avatar}><Text style={styles.avatarTxt}>{advisor.full_name.slice(0, 1)}</Text></View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.cardName} numberOfLines={1}>{advisor.full_name}</Text>
          {!!advisor.business_name && <Text style={styles.cardBiz} numberOfLines={1}>{advisor.business_name}</Text>}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8, flexWrap: 'wrap' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Ionicons name="star" size={11} color={colors.brandSecondary} />
              <Text style={styles.meta}>{advisor.rating} ({advisor.reviews_count})</Text>
            </View>
            <Text style={styles.meta}>· {advisor.experience_years}y exp</Text>
            <Text style={styles.meta}>· {advisor.location}</Text>
          </View>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <View>
          <Text style={{ color: colors.textMuted, fontSize: 10 }}>FEE</Text>
          <Text style={{ color: colors.brand, fontWeight: '700', fontSize: 16 }}>₹{advisor.consultation_fee}<Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '400' }}> /session</Text></Text>
        </View>
        <View style={styles.viewBtn}><Text style={styles.viewBtnText}>View Profile</Text><Ionicons name="chevron-forward" size={14} color="#fff" /></View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  hello: { color: '#9DB2D0', fontSize: 12 },
  name: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 2 },
  walletPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(212,175,55,0.12)', borderColor: 'rgba(212,175,55,0.3)', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  walletText: { color: colors.brandSecondary, fontWeight: '700', fontSize: 13 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  hero: { margin: spacing.lg, padding: spacing.lg, borderRadius: radius.lg, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', minHeight: 130 },
  authBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.brandSecondary, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, marginBottom: 8 },
  authBadgeText: { color: colors.brand, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  heroTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  heroSub: { color: '#9DB2D0', fontSize: 12, marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.onSurfaceSecondary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, height: 36, flexShrink: 0 },
  chipSel: { backgroundColor: colors.brandSecondaryLight, borderColor: colors.brandSecondary },
  chipText: { fontSize: 12, color: colors.onSurfaceSecondary, fontWeight: '500' },
  chipTextSel: { color: colors.brand, fontWeight: '700' },
  card: { backgroundColor: colors.surface, marginHorizontal: spacing.lg, marginBottom: spacing.md, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.divider, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  cardBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.brandSecondary, alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.sm, marginBottom: 8 },
  cardBadgeText: { color: colors.onBrandSecondary, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  avatar: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: colors.brandSecondary, fontSize: 20, fontWeight: '700' },
  cardName: { fontSize: 15, fontWeight: '700', color: colors.onSurface },
  cardBiz: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  meta: { fontSize: 11, color: colors.textMuted },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.brand, paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.md },
  viewBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
