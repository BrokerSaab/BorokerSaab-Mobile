import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Modal, TextInput, ActivityIndicator } from 'react-native';
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
  const [addOpen, setAddOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => setWallet(await api.get('/wallet')), []);
  useEffect(() => { load(); }, [load]);

  const addMoney = async () => {
    const n = parseFloat(amount);
    if (!n || n <= 0) return;
    setBusy(true);
    try { await api.post('/wallet/add', { amount: n }); await refresh(); await load(); setAddOpen(false); setAmount(''); }
    finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceSecondary }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.head}>
          <View style={styles.avatar}><Text style={styles.avatarTxt}>{(user?.full_name || '?').slice(0, 1)}</Text></View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.name}>{user?.full_name}</Text>
            <Text style={styles.sub}>+91 {user?.phone}</Text>
            {!!user?.email && <Text style={styles.sub}>{user.email}</Text>}
          </View>
        </View>

        <View style={styles.walletCard}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#9DB2D0', fontSize: 11 }}>WALLET BALANCE</Text>
            <Text style={styles.walletBal}>₹{wallet.balance.toFixed(2)}</Text>
          </View>
          <Pressable testID="add-money-btn" onPress={() => setAddOpen(true)} style={styles.addMoneyBtn}>
            <Ionicons name="add-circle" size={18} color={colors.brand} />
            <Text style={{ color: colors.brand, fontWeight: '700', fontSize: 13, marginLeft: 4 }}>Add Money</Text>
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
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.onSurface, marginBottom: 12 }}>Add Money to Wallet</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>Payment via Razorpay (mocked for MVP)</Text>
            <TextInput testID="amount-input" value={amount} onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))} placeholder="Enter amount (₹)" keyboardType="decimal-pad" style={styles.input} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              {[200, 500, 1000, 2000].map(v => (
                <Pressable key={v} onPress={() => setAmount(v.toString())} style={styles.quick}><Text style={{ color: colors.brand, fontWeight: '600' }}>₹{v}</Text></Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <Pressable onPress={() => setAddOpen(false)} style={[styles.btn, { backgroundColor: colors.surfaceSecondary, flex: 1 }]}><Text style={{ color: colors.onSurface, fontWeight: '600' }}>Cancel</Text></Pressable>
              <Pressable testID="confirm-add-btn" onPress={addMoney} disabled={busy} style={[styles.btn, { backgroundColor: colors.brand, flex: 1 }]}>
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
  avatar: { width: 64, height: 64, borderRadius: 16, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: colors.brandSecondary, fontSize: 26, fontWeight: '700' },
  name: { fontSize: 18, fontWeight: '700', color: colors.onSurface },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  walletCard: { margin: spacing.lg, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.brand, flexDirection: 'row', alignItems: 'center' },
  walletBal: { color: colors.brandSecondary, fontSize: 28, fontWeight: '800', marginTop: 4 },
  addMoneyBtn: { backgroundColor: colors.brandSecondary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center' },
  section: { fontSize: 11, fontWeight: '700', color: colors.textMuted, paddingHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: 6, letterSpacing: 0.5 },
  txn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 12, borderRadius: radius.md, marginBottom: 6, borderWidth: 1, borderColor: colors.divider },
  txnTitle: { fontSize: 13, color: colors.onSurface, fontWeight: '500' },
  txnDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  txnAmt: { fontSize: 14, fontWeight: '700' },
  signout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.lg, marginTop: spacing.md },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, padding: spacing.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 },
  quick: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.brandSecondaryLight, borderRadius: radius.md, borderWidth: 1, borderColor: colors.brandSecondary },
  btn: { paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
