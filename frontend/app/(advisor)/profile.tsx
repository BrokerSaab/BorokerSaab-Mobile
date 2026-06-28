import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/src/api';
import { useAuth } from '@/src/auth';
import { colors, radius, spacing } from '@/src/theme';

export default function AdvisorProfile() {
  const { user, refresh, signOut } = useAuth();
  const router = useRouter();
  const [wallet, setWallet] = useState<any>({ balance: 0, transactions: [] });
  const a = user?.advisor || {};
  const load = useCallback(async () => setWallet(await api.get('/wallet')), []);
  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceSecondary }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={styles.head}>
          <View style={styles.avatar}><Text style={styles.avatarTxt}>{(user?.full_name || '?').slice(0, 1)}</Text></View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.name}>{user?.full_name}</Text>
            {!!a.business_name && <Text style={styles.sub}>{a.business_name}</Text>}
            <Text style={styles.sub}>📍 {a.location}, {a.state}</Text>
          </View>
        </View>

        {a.is_authorized_dealer ? (
          <View style={styles.badgeActive}>
            <Ionicons name="ribbon" size={24} color={colors.brandSecondary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Authorized Dealer Badge ACTIVE</Text>
              <Text style={{ color: '#9DB2D0', fontSize: 12 }}>Premium tier — boosting trust & visibility</Text>
            </View>
          </View>
        ) : (
          <Pressable testID="badge-cta" onPress={() => router.push('/(advisor)/badge')} style={styles.badgeCta}>
            <LinearGradient colors={[colors.brandSecondary, '#E8C84C']} style={StyleSheet.absoluteFill} />
            <Ionicons name="ribbon" size={26} color={colors.brand} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: colors.brand, fontWeight: '800', fontSize: 14 }}>Upgrade to Authorized Dealer</Text>
              <Text style={{ color: colors.onBrandSecondary, fontSize: 12 }}>₹2,358.82/yr · Premium badge & priority listing</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.brand} />
          </Pressable>
        )}

        <View style={styles.walletCard}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#9DB2D0', fontSize: 11 }}>EARNINGS WALLET</Text>
            <Text style={styles.walletBal}>₹{wallet.balance.toFixed(2)}</Text>
            <Text style={{ color: '#9DB2D0', fontSize: 11, marginTop: 4 }}>After 15% platform commission</Text>
          </View>
        </View>

        <Text style={styles.section}>PROFESSIONAL DETAILS</Text>
        <View style={styles.detailCard}>
          <Row k="Type" v={a.advisor_type} />
          <Row k="Experience" v={`${a.experience_years} years`} />
          <Row k="Fee" v={`₹${a.consultation_fee}/session`} />
          <Row k="Categories" v={(a.categories || []).join(', ')} />
          <Row k="Languages" v={(a.languages || []).join(', ')} />
          <Row k="Rating" v={`★ ${a.rating} (${a.reviews_count} reviews)`} />
          <Row k="Status" v={a.status} last />
        </View>

        <Text style={styles.section}>RECENT TRANSACTIONS</Text>
        <View style={{ paddingHorizontal: spacing.lg }}>
          {wallet.transactions.length === 0 && <Text style={{ color: colors.textMuted, padding: 12, textAlign: 'center' }}>No transactions yet</Text>}
          {wallet.transactions.slice(0, 8).map((t: any) => (
            <View key={t.id} style={styles.txn}>
              <View style={{ flex: 1 }}>
                <Text style={styles.txnTitle}>{t.description || t.type}</Text>
                <Text style={styles.txnDate}>{new Date(t.created_at).toLocaleDateString()}</Text>
              </View>
              <Text style={[styles.txnAmt, { color: t.amount >= 0 ? colors.success : colors.error }]}>+₹{t.amount.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <Pressable testID="signout-btn" onPress={async () => { await signOut(); router.replace('/auth'); }} style={styles.signout}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={{ color: colors.error, fontWeight: '600', marginLeft: 6 }}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ k, v, last }: any) {
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.divider }}>
    <Text style={{ color: colors.textMuted, fontSize: 12 }}>{k}</Text>
    <Text style={{ color: colors.onSurface, fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right', marginLeft: 12 }}>{v}</Text>
  </View>;
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  avatar: { width: 64, height: 64, borderRadius: 16, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: colors.brandSecondary, fontSize: 26, fontWeight: '700' },
  name: { fontSize: 18, fontWeight: '700' },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  badgeCta: { margin: spacing.lg, padding: spacing.md, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  badgeActive: { margin: spacing.lg, padding: spacing.md, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.brand, borderWidth: 1, borderColor: colors.brandSecondary },
  walletCard: { marginHorizontal: spacing.lg, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.brand },
  walletBal: { color: colors.brandSecondary, fontSize: 28, fontWeight: '800', marginTop: 4 },
  section: { fontSize: 11, fontWeight: '700', color: colors.textMuted, paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: 6, letterSpacing: 0.5 },
  detailCard: { marginHorizontal: spacing.lg, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider },
  txn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 12, borderRadius: radius.md, marginBottom: 6, borderWidth: 1, borderColor: colors.divider },
  txnTitle: { fontSize: 13, color: colors.onSurface, fontWeight: '500' },
  txnDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  txnAmt: { fontSize: 14, fontWeight: '700' },
  signout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.lg, marginTop: spacing.md },
});
