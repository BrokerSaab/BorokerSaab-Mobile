import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Modal, TextInput, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/api';
import { useAuth } from '@/src/auth';
import { colors, radius, spacing } from '@/src/theme';
import { useRouter } from 'expo-router';

export default function Profile() {
  const { user, refresh, signOut } = useAuth();
  const router = useRouter();
  const [wallet, setWallet] = useState<any>({ balance: 0, transactions: [] });
  const [subs, setSubs] = useState<any>({ credits_available: 0 });
  const [addOpen, setAddOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setWallet(await api.get('/wallet'));
    setSubs(await api.get('/contact-subscriptions/me'));
  }, []);
  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await refresh(); await load(); setRefreshing(false); };

  const addMoney = async () => {
    const n = parseFloat(amount);
    if (!n || n <= 0) return;
    setBusy(true);
    try { await api.post('/wallet/add', { amount: n }); await refresh(); await load(); setAddOpen(false); setAmount(''); }
    finally { setBusy(false); }
  };

  const hasAvatar = user?.avatar_url && user.avatar_url.startsWith('data:');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceSecondary }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.head}>
          {hasAvatar ? (
            <Image source={{ uri: user!.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={styles.avatarTxt}>{(user?.full_name || '?').slice(0, 1)}</Text>
            </View>
          )}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.name}>{user?.full_name}</Text>
            <Text style={styles.sub}>+91 {user?.phone}</Text>
            {!!user?.email && <Text style={styles.sub}>{user.email}</Text>}
          </View>
          <Pressable testID="edit-profile-btn" onPress={() => router.push('/edit-profile')} style={styles.editBtn}>
            <Ionicons name="create-outline" size={16} color={colors.brandIndigo} />
          </Pressable>
        </View>

        <View style={styles.walletCard}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#C7D2FE', fontSize: 11 }}>WALLET BALANCE</Text>
            <Text style={styles.walletBal}>₹{wallet.balance.toFixed(2)}</Text>
          </View>
          <Pressable testID="add-money-btn" onPress={() => setAddOpen(true)} style={styles.addMoneyBtn}>
            <Ionicons name="add-circle" size={18} color={colors.brand} />
            <Text style={{ color: colors.brand, fontWeight: '700', fontSize: 13, marginLeft: 4 }}>Add Money</Text>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, flexDirection: 'row', gap: spacing.sm }}>
          <Pressable testID="buy-pack-link" onPress={() => router.push('/buy-pack')} style={[styles.quickCard, { backgroundColor: colors.brandIndigoLight }]}>
            <Ionicons name="key" size={20} color={colors.brandIndigo} />
            <Text style={styles.quickTitle}>Contact Credits</Text>
            <Text style={styles.quickValue}>{subs.credits_available}</Text>
            <Text style={styles.quickHint}>Tap to buy packs</Text>
          </Pressable>
          <Pressable testID="unlocks-link" onPress={() => router.push('/unlocks')} style={[styles.quickCard, { backgroundColor: colors.brandSecondaryLight }]}>
            <Ionicons name="lock-open" size={20} color={colors.brandSecondary} />
            <Text style={styles.quickTitle}>Unlocks</Text>
            <Text style={[styles.quickValue, { color: colors.onBrandSecondary }]}>History</Text>
            <Text style={styles.quickHint}>Advisors you contacted</Text>
          </Pressable>
        </View>

        <Text style={styles.section}>RECENT TRANSACTIONS</Text>
        <View style={{ paddingHorizontal: spacing.lg }}>
          {wallet.transactions.length === 0 && <Text style={{ color: colors.textMuted, padding: spacing.md, textAlign: 'center' }}>No transactions yet</Text>}
          {wallet.transactions.slice(0, 10).map((t: any) => (
            <View key={t.id} style={styles.txn}>
              <View style={{ flex: 1 }}>
                <Text style={styles.txnTitle}>{t.description || t.type}</Text>
                <Text style={styles.txnDate}>{new Date(t.created_at).toLocaleDateString()} · {t.type}</Text>
              </View>
              <Text style={[styles.txnAmt, { color: t.amount >= 0 ? colors.success : colors.error }]}>{t.amount >= 0 ? '+' : ''}₹{t.amount.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <Pressable testID="signout-btn" onPress={async () => { await signOut(); router.replace('/auth'); }} style={styles.signout}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={{ color: colors.error, fontWeight: '600', marginLeft: 6 }}>Sign Out</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.onSurface, marginBottom: 6 }}>Add Money to Wallet</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>Payment via Razorpay (mocked for MVP)</Text>
            <TextInput testID="amount-input" value={amount} onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))} placeholder="Enter amount (₹)" keyboardType="decimal-pad" style={styles.input} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              {[200, 500, 1000, 2000].map(v => (
                <Pressable key={v} onPress={() => setAmount(v.toString())} style={styles.quick}><Text style={{ color: colors.brandIndigo, fontWeight: '600' }}>₹{v}</Text></Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <Pressable onPress={() => setAddOpen(false)} style={[styles.btn, { backgroundColor: colors.surfaceSecondary, flex: 1 }]}><Text style={{ color: colors.onSurface, fontWeight: '600' }}>Cancel</Text></Pressable>
              <Pressable testID="confirm-add-btn" onPress={addMoney} disabled={busy} style={[styles.btn, { backgroundColor: colors.brandIndigo, flex: 1 }]}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Pay & Add</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarTxt: { color: colors.brandSecondary, fontSize: 26, fontWeight: '700' },
  name: { fontSize: 18, fontWeight: '700', color: colors.onSurface },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  editBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandIndigoLight, alignItems: 'center', justifyContent: 'center' },
  walletCard: { margin: spacing.lg, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.brand, flexDirection: 'row', alignItems: 'center' },
  walletBal: { color: colors.brandSecondary, fontSize: 28, fontWeight: '800', marginTop: 4 },
  addMoneyBtn: { backgroundColor: colors.brandSecondary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center' },
  quickCard: { flex: 1, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider },
  quickTitle: { fontSize: 11, color: colors.textMuted, fontWeight: '700', marginTop: 8, letterSpacing: 0.3 },
  quickValue: { fontSize: 20, fontWeight: '800', color: colors.brandIndigo, marginTop: 2 },
  quickHint: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  section: { fontSize: 11, fontWeight: '700', color: colors.textMuted, paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: 6, letterSpacing: 0.5 },
  txn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 12, borderRadius: radius.md, marginBottom: 6, borderWidth: 1, borderColor: colors.divider },
  txnTitle: { fontSize: 13, color: colors.onSurface, fontWeight: '500' },
  txnDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  txnAmt: { fontSize: 14, fontWeight: '700' },
  signout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.lg, marginTop: spacing.md },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, padding: spacing.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingBottom: 32 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 },
  quick: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.brandIndigoLight, borderRadius: radius.md, borderWidth: 1, borderColor: colors.brandIndigo },
  btn: { paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
