import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, FlatList, RefreshControl, TextInput, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '@/src/api';
import { useAuth } from '@/src/auth';
import { colors, radius, spacing } from '@/src/theme';

const QUICK_TAGS = ['Registry', 'Bainama', 'Sale Deed', 'GST Filing', 'DL Renewal', 'Aadhaar', 'ITR', 'Notary', 'Labour Card'];
const TILE_COLORS = [
  { bg: '#FEF2F2', border: '#FECACA', accent: '#EF4444' },
  { bg: '#FFFBEB', border: '#FDE68A', accent: '#F59E0B' },
  { bg: '#ECFDF5', border: '#A7F3D0', accent: '#10B981' },
  { bg: '#EFF6FF', border: '#BFDBFE', accent: '#3B82F6' },
  { bg: '#F5F3FF', border: '#DDD6FE', accent: '#8B5CF6' },
  { bg: '#FDF2F8', border: '#FBCFE8', accent: '#EC4899' },
  { bg: '#ECFEFF', border: '#A5F3FC', accent: '#06B6D4' },
  { bg: '#FEF3C7', border: '#FDE68A', accent: '#D97706' },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Choose a Service', desc: 'Browse our 28 verified service categories and find the right professional.', icon: 'search', color: '#3B82F6' },
  { step: '02', title: 'Select an Advisor', desc: 'Review profiles, ratings, experience, and fees to pick the best match.', icon: 'person-check' as any, color: '#10B981' },
  { step: '03', title: 'Book & Consult', desc: 'Pay securely via escrow, schedule your session, and get expert advice.', icon: 'call', color: '#F59E0B' },
];

export default function Discover() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [cats, setCats] = useState<any[]>([]);
  const [advisors, setAdvisors] = useState<any[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'user' | 'advisor'>('user');
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

  const onRefresh = async () => { setRefreshing(true); if (user) await refresh(); await load(); setRefreshing(false); };

  const goToAdvisor = (id: string) => router.push(`/advisor/${id}`);
  const goToCategory = (id: string) => { setActiveCat(id); /* could scroll */ };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <FlatList
        data={[]}
        keyExtractor={() => 'header'}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View>
            {/* === Top brand strip === */}
            <SafeAreaView edges={['top']} style={{ backgroundColor: colors.brand }}>
              <View style={styles.topStrip}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Image source={require('../../assets/images/brokersaab-logo.png')} style={{ width: 38, height: 38 }} resizeMode="contain" />
                  <View>
                    <Text style={styles.brandText}>Broker<Text style={{ color: colors.brandSecondary }}>Saab</Text></Text>
                    <Text style={styles.brandTagline}>TRUSTED ADVISORY</Text>
                  </View>
                </View>
                {user ? (
                  <Pressable testID="profile-pill" onPress={() => router.push('/(client)/profile')} style={styles.walletPill}>
                    <Ionicons name="wallet" size={13} color={colors.brandSecondary} />
                    <Text style={styles.walletText}>₹{(user.wallet_balance || 0).toFixed(0)}</Text>
                  </Pressable>
                ) : (
                  <Pressable testID="signin-pill" onPress={() => router.push('/auth')} style={styles.signInPill}>
                    <Ionicons name="log-in" size={13} color={colors.brand} />
                    <Text style={styles.signInText}>Sign In</Text>
                  </Pressable>
                )}
              </View>
            </SafeAreaView>

            {/* === Launch Offer Ticker === */}
            <Pressable testID="launch-offer" onPress={() => router.push('/buy-pack')} style={styles.tickerWrap}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <View style={styles.tickerBadge}><Text style={styles.tickerBadgeText}>🚀 LAUNCHING OFFER</Text></View>
                <Text style={styles.tickerText}>👤 Users <Text style={styles.strike}>₹999</Text> <Text style={styles.tickerHighlight}>₹99</Text>/yr</Text>
                <Text style={styles.tickerDot}>•</Text>
                <Text style={styles.tickerText}>🤝 Advisors <Text style={styles.strike}>₹4,999</Text> <Text style={styles.tickerHighlight}>₹499</Text>/yr</Text>
                <Text style={styles.tickerDot}>•</Text>
                <Text style={styles.tickerOff}>90% OFF · 1 Year Valid 👆</Text>
              </View>
            </Pressable>

            {/* === HERO === */}
            <LinearGradient colors={[colors.brand, '#0a1b35', '#0b1426']} style={styles.hero}>
              {/* Mode toggle */}
              <View style={styles.modeToggleWrap}>
                <Pressable testID="mode-user" onPress={() => setViewMode('user')} style={[styles.modeBtn, viewMode === 'user' && styles.modeBtnActive]}>
                  <Ionicons name="hand-left" size={13} color={viewMode === 'user' ? '#fff' : '#9DB2D0'} />
                  <Text style={[styles.modeText, viewMode === 'user' && { color: '#fff' }]}>I Need Help</Text>
                </Pressable>
                <Pressable testID="mode-advisor" onPress={() => { setViewMode('advisor'); router.push('/auth'); }} style={[styles.modeBtn, viewMode === 'advisor' && styles.modeBtnActive]}>
                  <Ionicons name="briefcase" size={13} color={viewMode === 'advisor' ? '#fff' : '#9DB2D0'} />
                  <Text style={[styles.modeText, viewMode === 'advisor' && { color: '#fff' }]}>I'm an Advisor</Text>
                </Pressable>
              </View>

              <Text style={styles.heroTitle}>Find your <Text style={{ color: colors.brandSecondary }}>Agents</Text></Text>
              <Text style={styles.heroSub}>Find verified professionals by service, document type, or keyword.</Text>

              {/* Search */}
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
                <Pressable testID="search-btn" onPress={load} style={styles.searchBtn}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Search</Text>
                </Pressable>
              </View>

              {/* Try tags */}
              <View style={{ marginTop: spacing.md }}>
                <Text style={{ color: '#9DB2D0', fontSize: 11, fontWeight: '700', marginBottom: 6 }}>TRY:</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {QUICK_TAGS.map(t => (
                    <Pressable key={t} testID={`tag-${t}`} onPress={() => { setSearch(t); load(); }} style={styles.tryTag}>
                      <Text style={styles.tryTagText}>{t}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Verified badge row */}
              <View style={styles.verifiedRow}>
                <View style={{ flexDirection: 'row' }}>
                  {['R', 'M', 'A'].map((c, i) => (
                    <View key={c} style={[styles.miniAvatar, { marginLeft: i === 0 ? 0 : -10, zIndex: 3 - i }]}>
                      <Text style={styles.miniAvatarTxt}>{c}</Text>
                    </View>
                  ))}
                  <View style={[styles.miniAvatar, { marginLeft: -10, backgroundColor: colors.brandSecondary }]}>
                    <Text style={[styles.miniAvatarTxt, { color: colors.brand }]}>+</Text>
                  </View>
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Collaborating Advisors</Text>
                  <Text style={{ color: '#9DB2D0', fontSize: 11 }}>Verified Experts</Text>
                </View>
              </View>
            </LinearGradient>

            {/* === SERVICES Section === */}
            <View style={styles.serviceSection}>
              <View style={styles.tag}>
                <Ionicons name="grid" size={11} color={colors.brandIndigo} />
                <Text style={styles.tagText}>OUR SERVICES</Text>
              </View>
              <Text style={styles.sectionTitle}>Professional Service Categories</Text>
              <Text style={styles.sectionSub}>Select a service to find verified professionals near you.</Text>

              <View style={styles.tileGrid}>
                {cats.map((c, idx) => {
                  const palette = TILE_COLORS[idx % TILE_COLORS.length];
                  const isSelected = activeCat === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      testID={`tile-${c.id}`}
                      onPress={() => setActiveCat(isSelected ? null : c.id)}
                      style={[styles.tile, { backgroundColor: palette.bg, borderColor: isSelected ? colors.brandSecondary : palette.border, borderWidth: isSelected ? 2 : 1 }]}
                    >
                      <View style={[styles.tileIcon, { backgroundColor: palette.accent + '20' }]}>
                        <Ionicons name={c.icon} size={20} color={palette.accent} />
                      </View>
                      <Text style={[styles.tileNumber, { color: palette.accent }]}>#{c.id.replace('m', '')}</Text>
                      <Text style={styles.tileName} numberOfLines={2}>{c.name}</Text>
                      <Text style={[styles.tileCta, { color: palette.accent }]}>{isSelected ? '✓ Selected' : 'Explore →'}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* === ADVISORS === */}
            <View style={styles.advisorSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: spacing.md }}>
                <View>
                  <Text style={styles.sectionTitle}>Verified Professionals ({advisors.length})</Text>
                  {activeCat && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
                      <View style={styles.filterChip}><Text style={styles.filterChipText}>{cats.find(c => c.id === activeCat)?.name}</Text></View>
                      <Pressable onPress={() => setActiveCat(null)}><Text style={styles.clearLink}>Clear</Text></Pressable>
                    </View>
                  )}
                </View>
                <View style={styles.escrowBadge}>
                  <Ionicons name="shield-checkmark" size={11} color={colors.success} />
                  <Text style={styles.escrowText}>Escrow Protected</Text>
                </View>
              </View>

              {loading ? <ActivityIndicator style={{ marginVertical: 30 }} color={colors.brand} /> : advisors.length === 0 ? (
                <View style={styles.emptyAdvisors}>
                  <Ionicons name="search-outline" size={42} color={colors.surfaceTertiary} />
                  <Text style={styles.emptyTitle}>No verified professionals found</Text>
                  <Text style={styles.emptySub}>Try a different category or clear the filter.</Text>
                  <Pressable onPress={() => { setActiveCat(null); setSearch(''); load(); }} style={styles.resetBtn}>
                    <Text style={{ fontWeight: '700', color: colors.onSurface }}>Reset Filters</Text>
                  </Pressable>
                </View>
              ) : (
                advisors.map(a => <AdvisorCard key={a.id} advisor={a} onPress={() => goToAdvisor(a.id)} />)
              )}
            </View>

            {/* === HOW IT WORKS === */}
            <View style={styles.howSection}>
              <View style={[styles.tag, { backgroundColor: colors.brandSecondaryLight }]}>
                <Ionicons name="help-circle" size={11} color={colors.brandSecondary} />
                <Text style={[styles.tagText, { color: colors.onBrandSecondary }]}>HOW IT WORKS</Text>
              </View>
              <Text style={styles.sectionTitle}>Book a Consultation in 3 Simple Steps</Text>
              <View style={{ gap: 10, marginTop: spacing.md }}>
                {HOW_IT_WORKS.map(item => (
                  <View key={item.step} style={[styles.stepCard, { backgroundColor: item.color + '10' }]}>
                    <View style={[styles.stepIcon, { backgroundColor: item.color }]}>
                      <Ionicons name={item.icon as any} size={18} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.stepNo, { color: item.color }]}>Step {item.step}</Text>
                      <Text style={styles.stepTitle}>{item.title}</Text>
                      <Text style={styles.stepDesc}>{item.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* === CTA === */}
            <LinearGradient colors={[colors.brand, colors.brandIndigoDeep]} style={styles.ctaBanner}>
              <Text style={styles.ctaTitle}>Ready to Get Expert Advice?</Text>
              <Text style={styles.ctaSub}>Join thousands of satisfied clients. Book a verified advisor today.</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.lg }}>
                <Pressable testID="cta-book" onPress={() => user ? null : router.push('/auth')} style={styles.ctaPrimary}>
                  <Ionicons name="calendar" size={16} color={colors.brand} />
                  <Text style={styles.ctaPrimaryText}>Book Consultation</Text>
                </Pressable>
                <Pressable testID="cta-advisor" onPress={() => router.push('/auth')} style={styles.ctaSecondary}>
                  <Text style={styles.ctaSecondaryText}>Register as Advisor</Text>
                </Pressable>
              </View>
            </LinearGradient>

            <View style={{ height: 40 }} />
          </View>
        }
        renderItem={() => null}
      />
    </View>
  );
}

function AdvisorCard({ advisor, onPress }: any) {
  return (
    <Pressable testID={`advisor-card-${advisor.id}`} onPress={onPress} style={styles.advCard}>
      {advisor.is_authorized_dealer && (
        <View style={styles.authStrip}>
          <Ionicons name="ribbon" size={10} color={colors.onBrandSecondary} />
          <Text style={styles.authStripText}>AUTHORISED DEALER</Text>
        </View>
      )}
      <View style={styles.advHeader}>
        <View style={{ flex: 1 }}>
          {!!advisor.categories?.length && (
            <Text style={styles.advCategory}>{advisor.categories[0].toUpperCase()}</Text>
          )}
          <Text style={styles.advName} numberOfLines={1}>{advisor.full_name}</Text>
          {!!advisor.business_name && <Text style={styles.advBiz} numberOfLines={1}>{advisor.business_name}</Text>}
        </View>
        <View style={styles.advAvatar}><Text style={styles.advAvatarTxt}>{advisor.full_name.slice(0, 1)}</Text></View>
      </View>
      <View style={styles.advStats}>
        <View style={styles.advStat}>
          <Ionicons name="briefcase-outline" size={11} color={colors.textMuted} />
          <Text style={styles.advStatTxt}>{advisor.experience_years}y exp</Text>
        </View>
        <View style={styles.advStat}>
          <Ionicons name="location-outline" size={11} color={colors.textMuted} />
          <Text style={styles.advStatTxt}>{advisor.location}</Text>
        </View>
        <View style={styles.advStat}>
          <Ionicons name="star" size={11} color={colors.brandSecondary} />
          <Text style={styles.advStatTxt}>{advisor.rating} ({advisor.reviews_count})</Text>
        </View>
      </View>
      <View style={styles.advFooter}>
        <View>
          <Text style={styles.advFeeLbl}>Consultation Fee</Text>
          <Text style={styles.advFee}>₹{advisor.consultation_fee}<Text style={styles.advFeeUnit}> / session</Text></Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable onPress={onPress} style={styles.viewBtn}><Text style={styles.viewBtnText}>View</Text></Pressable>
          <Pressable onPress={onPress} style={styles.connectBtn}>
            <Ionicons name="call" size={11} color={colors.brand} />
            <Text style={styles.connectBtnText}>Connect</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Top brand strip
  topStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  brandText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  brandTagline: { color: '#88A0C0', fontSize: 9, letterSpacing: 1.5, marginTop: 1 },
  walletPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(212,175,55,0.15)', borderColor: 'rgba(212,175,55,0.4)', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  walletText: { color: colors.brandSecondary, fontWeight: '700', fontSize: 12 },
  signInPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.brandSecondary, paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill },
  signInText: { color: colors.brand, fontWeight: '800', fontSize: 12 },
  // Ticker
  tickerWrap: { backgroundColor: '#0f0a1e', borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(250,204,21,0.25)', paddingVertical: 10, paddingHorizontal: spacing.md },
  tickerBadge: { backgroundColor: colors.brandSecondary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  tickerBadgeText: { color: colors.brand, fontWeight: '900', fontSize: 9, letterSpacing: 0.3 },
  tickerText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  tickerHighlight: { color: colors.brandSecondary, fontWeight: '900', fontSize: 13 },
  strike: { textDecorationLine: 'line-through', color: '#88A0C0', fontWeight: '500' },
  tickerDot: { color: colors.brandSecondary, fontWeight: '900' },
  tickerOff: { color: '#FACC15', fontSize: 11, fontWeight: '700' },
  // Hero
  hero: { padding: spacing.lg, paddingTop: spacing.md },
  modeToggleWrap: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: radius.pill, padding: 3, alignSelf: 'flex-start', marginBottom: spacing.lg },
  modeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  modeBtnActive: { backgroundColor: '#0C4EAA' },
  modeText: { fontSize: 11, fontWeight: '700', color: '#9DB2D0' },
  heroTitle: { color: '#fff', fontSize: 32, fontWeight: '900', lineHeight: 38 },
  heroSub: { color: '#9DB2D0', fontSize: 13, marginTop: 8, marginBottom: spacing.lg },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.md, paddingLeft: 14, paddingRight: 4, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  searchBtn: { backgroundColor: '#0C4EAA', paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.sm },
  tryTag: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.sm },
  tryTagText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg },
  miniAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.brand },
  miniAvatarTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },
  // Services
  serviceSection: { padding: spacing.lg, backgroundColor: colors.surface },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.brandIndigoLight, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, marginBottom: 10 },
  tagText: { color: colors.brandIndigo, fontWeight: '800', fontSize: 10, letterSpacing: 0.5 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.onSurface },
  sectionSub: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: spacing.md },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: spacing.sm },
  tile: { width: '48%', padding: spacing.md, borderRadius: radius.md },
  tileIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileNumber: { fontSize: 11, fontWeight: '900', marginBottom: 4 },
  tileName: { fontSize: 13, fontWeight: '700', color: colors.onSurface, marginBottom: 10, minHeight: 36 },
  tileCta: { fontSize: 11, fontWeight: '800' },
  // Advisors
  advisorSection: { padding: spacing.lg, backgroundColor: colors.surfaceSecondary },
  filterChip: { backgroundColor: colors.brandIndigoLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  filterChipText: { color: colors.brandIndigo, fontSize: 10, fontWeight: '700' },
  clearLink: { color: colors.textMuted, fontSize: 11, textDecorationLine: 'underline' },
  escrowBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  escrowText: { color: '#065F46', fontSize: 10, fontWeight: '700' },
  advCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: 10, borderWidth: 1, borderColor: colors.divider },
  authStrip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.brandSecondary, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm, marginBottom: 8 },
  authStripText: { color: colors.onBrandSecondary, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  advHeader: { flexDirection: 'row', alignItems: 'center' },
  advCategory: { fontSize: 9, fontWeight: '800', color: colors.brandIndigo, letterSpacing: 0.5, marginBottom: 4 },
  advName: { fontSize: 16, fontWeight: '700', color: colors.onSurface },
  advBiz: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  advAvatar: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  advAvatarTxt: { color: colors.brandSecondary, fontSize: 20, fontWeight: '700' },
  advStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  advStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  advStatTxt: { fontSize: 11, color: colors.textMuted },
  advFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.divider },
  advFeeLbl: { fontSize: 9, color: colors.textMuted, fontWeight: '700', letterSpacing: 0.3 },
  advFee: { fontSize: 18, fontWeight: '800', color: colors.brand },
  advFeeUnit: { fontSize: 10, fontWeight: '500', color: colors.textMuted },
  viewBtn: { backgroundColor: colors.surfaceSecondary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm },
  viewBtnText: { color: colors.brand, fontWeight: '700', fontSize: 11 },
  connectBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.brandSecondary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm },
  connectBtnText: { color: colors.brand, fontWeight: '800', fontSize: 11 },
  emptyAdvisors: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: colors.divider },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: colors.onSurface, marginTop: 12 },
  emptySub: { fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  resetBtn: { marginTop: 14, backgroundColor: colors.surfaceSecondary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  // How it works
  howSection: { padding: spacing.lg, backgroundColor: colors.surface },
  stepCard: { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.md, borderRadius: radius.md, gap: 12 },
  stepIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepNo: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  stepTitle: { fontSize: 15, fontWeight: '700', color: colors.onSurface, marginTop: 2 },
  stepDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 17 },
  // CTA
  ctaBanner: { padding: spacing.xl, alignItems: 'center', margin: spacing.lg, borderRadius: radius.lg },
  ctaTitle: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  ctaSub: { color: '#C7D2FE', fontSize: 13, textAlign: 'center', marginTop: 8 },
  ctaPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.brandSecondary, paddingVertical: 13, borderRadius: radius.md },
  ctaPrimaryText: { color: colors.brand, fontWeight: '800', fontSize: 13 },
  ctaSecondary: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: radius.md, borderWidth: 1, borderColor: colors.brandSecondary },
  ctaSecondaryText: { color: colors.brandSecondary, fontWeight: '700', fontSize: 13 },
});
