import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/src/api';
import { useAuth } from '@/src/auth';
import { colors, radius, spacing } from '@/src/theme';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AdvisorDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [advisor, setAdvisor] = useState<any>(null);
  const [bookOpen, setBookOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [unlockInfo, setUnlockInfo] = useState<any>(null);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => { api.get(`/advisors/${id}`).then(setAdvisor); }, [id]);

  const unlockContact = async () => {
    if (!user) { router.push('/auth'); return; }
    setUnlocking(true);
    try {
      const r = await api.post(`/advisors/${id}/unlock`, {});
      setUnlockInfo(r);
    } catch (e: any) {
      Alert.alert('Cannot unlock', e.message, [
        { text: 'Cancel' },
        { text: 'Buy Credits', onPress: () => router.push('/buy-pack') },
      ]);
    }
    setUnlocking(false);
  };

  if (!advisor) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.brand} /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={{ height: 260, backgroundColor: colors.brand }}>
          <LinearGradient colors={[colors.brand, '#1a3358', colors.brand]} style={StyleSheet.absoluteFill} />
          <SafeAreaView edges={['top']}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md }}>
              <Pressable testID="back-btn" onPress={() => router.back()} style={styles.iconBtn}><Ionicons name="chevron-back" size={22} color="#fff" /></Pressable>
            </View>
          </SafeAreaView>
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg }}>
            {advisor.is_authorized_dealer && (
              <View style={styles.authBadge}>
                <Ionicons name="shield-checkmark" size={12} color={colors.brand} />
                <Text style={styles.authBadgeText}>AUTHORIZED DEALER</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
              <View style={styles.bigAvatar}><Text style={styles.bigAvatarTxt}>{advisor.full_name.slice(0, 1)}</Text></View>
              <View style={{ flex: 1, marginBottom: 4 }}>
                <Text style={styles.heroName}>{advisor.full_name}</Text>
                {!!advisor.business_name && <Text style={styles.heroBiz}>{advisor.business_name}</Text>}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <Text style={styles.heroMeta}><Ionicons name="star" size={11} color={colors.brandSecondary} /> {advisor.rating} ({advisor.reviews_count})</Text>
                  <Text style={styles.heroMeta}>📍 {advisor.location}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={{ padding: spacing.lg }}>
          <SectionHead icon="information-circle" title="About" />
          <Text style={styles.bio}>{advisor.bio || 'Verified professional advisor on BrokerSaab.'}</Text>
          <View style={styles.metaGrid}>
            <Meta label="Experience" value={`${advisor.experience_years} years`} />
            <Meta label="Languages" value={(advisor.languages || []).join(', ') || '—'} />
            <Meta label="Fee" value={`₹${advisor.consultation_fee}`} />
          </View>

          <SectionHead icon="briefcase" title="Services" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {(advisor.categories || []).map((c: string) => (
              <View key={c} style={styles.servicePill}><Text style={styles.servicePillText}>{c}</Text></View>
            ))}
          </View>

          <SectionHead icon="calendar" title="Weekly Availability" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(advisor.availability || []).map((s: any, i: number) => (
              <View key={i} style={styles.slot}>
                <Text style={styles.slotDay}>{DAYS[s.day]}</Text>
                <Text style={styles.slotTime}>{s.start}–{s.end}</Text>
              </View>
            ))}
          </View>

          <SectionHead icon="key" title="Contact Details" />
          {unlockInfo ? (
            <View style={styles.unlockCard}>
              <Ionicons name="lock-open" size={20} color={colors.success} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.unlockPhone}>📞 +91 {unlockInfo.phone}</Text>
                {!!advisor.business_name && <Text style={styles.unlockMeta}>{unlockInfo.is_free ? '🎁 Free first unlock' : '✓ Unlocked with 1 credit'}</Text>}
              </View>
            </View>
          ) : (
            <Pressable testID="unlock-contact-btn" onPress={unlockContact} disabled={unlocking} style={styles.unlockBtn}>
              {unlocking ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="lock-closed" size={16} color="#fff" />
                  <Text style={styles.unlockBtnText}>Unlock Contact (1 credit / FREE first time)</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable testID="request-quote-btn" onPress={() => user ? setQuoteOpen(true) : router.push('/auth')} style={[styles.actionBtn, { backgroundColor: colors.surfaceSecondary }]}>
          <Ionicons name="document-text" size={18} color={colors.brand} />
          <Text style={{ color: colors.brand, fontWeight: '700', marginLeft: 6 }}>Quote</Text>
        </Pressable>
        <Pressable testID="book-now-btn" onPress={() => user ? setBookOpen(true) : router.push('/auth')} style={[styles.actionBtn, { backgroundColor: colors.brand, flex: 2 }]}>
          <Ionicons name="calendar" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', marginLeft: 6 }}>{user ? `Book Consultation · ₹${advisor.consultation_fee}` : `Sign in to Book · ₹${advisor.consultation_fee}`}</Text>
        </Pressable>
      </View>

      {bookOpen && <BookModal advisor={advisor} onClose={() => setBookOpen(false)} onDone={async () => { await refresh(); setBookOpen(false); router.push('/(client)/bookings'); }} userBalance={user?.wallet_balance || 0} />}
      {quoteOpen && <QuoteModal advisor={advisor} onClose={() => setQuoteOpen(false)} onDone={() => { setQuoteOpen(false); router.push('/(client)/tickets'); }} />}
    </View>
  );
}

function SectionHead({ icon, title }: any) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.sm, gap: 6 }}>
    <Ionicons name={icon} size={16} color={colors.brand} />
    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.onSurfaceSecondary, letterSpacing: 0.5 }}>{title.toUpperCase()}</Text>
  </View>;
}
function Meta({ label, value }: any) {
  return <View style={{ flex: 1, padding: 10, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md }}>
    <Text style={{ fontSize: 10, color: colors.textMuted }}>{label}</Text>
    <Text style={{ fontSize: 13, color: colors.onSurface, fontWeight: '600', marginTop: 2 }}>{value}</Text>
  </View>;
}

function BookModal({ advisor, onClose, onDone, userBalance }: any) {
  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() + i); return d; });
  const [date, setDate] = useState(dates[1]);
  const [time, setTime] = useState('10:00');
  const [mode, setMode] = useState<'PHONE' | 'VIDEO' | 'CHAT' | 'PHYSICAL'>('VIDEO');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const slotsForDate = (advisor.availability || []).filter((s: any) => s.day === date.getDay());
  const times: string[] = [];
  slotsForDate.forEach((s: any) => {
    const [sh, sm] = s.start.split(':').map(Number);
    const [eh] = s.end.split(':').map(Number);
    for (let h = sh; h < eh; h++) times.push(`${String(h).padStart(2, '0')}:${String(sm).padStart(2, '0')}`);
  });

  const book = async () => {
    setBusy(true); setErr('');
    try {
      await api.post('/bookings', {
        advisor_id: advisor.id,
        slot_date: date.toISOString().slice(0, 10),
        slot_time: time, mode, payment_method: 'WALLET',
      });
      onDone();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={styles.modalCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '700' }}>Book a Slot</Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={24} /></Pressable>
          </View>
          <Text style={styles.modalLabel}>Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {dates.map((d, i) => {
              const sel = d.toDateString() === date.toDateString();
              return <Pressable key={i} onPress={() => setDate(d)} style={[styles.dateChip, sel && { backgroundColor: colors.brand }]}>
                <Text style={[styles.dateChipDay, sel && { color: '#fff' }]}>{DAYS[d.getDay()]}</Text>
                <Text style={[styles.dateChipNum, sel && { color: colors.brandSecondary }]}>{d.getDate()}</Text>
              </Pressable>;
            })}
          </ScrollView>
          <Text style={styles.modalLabel}>Time</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {times.length === 0 ? <Text style={{ color: colors.textMuted, fontSize: 12 }}>No slots available — pick another day</Text> :
              times.map(t => <Pressable testID={`slot-${t}`} key={t} onPress={() => setTime(t)} style={[styles.timeChip, time === t && styles.timeChipSel]}>
                <Text style={[styles.timeChipText, time === t && { color: colors.brand, fontWeight: '700' }]}>{t}</Text>
              </Pressable>)}
          </View>
          <Text style={styles.modalLabel}>Mode</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {(['PHONE', 'VIDEO', 'CHAT', 'PHYSICAL'] as const).map(m =>
              <Pressable testID={`mode-${m}`} key={m} onPress={() => setMode(m)} style={[styles.timeChip, mode === m && styles.timeChipSel, { flex: 1, alignItems: 'center' }]}>
                <Text style={[styles.timeChipText, mode === m && { color: colors.brand, fontWeight: '700' }]}>{m}</Text>
              </Pressable>)}
          </View>
          <View style={{ marginTop: 14, padding: 12, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>Consultation Fee</Text>
              <Text style={{ fontSize: 14, fontWeight: '700' }}>₹{advisor.consultation_fee}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>Wallet Balance</Text>
              <Text style={{ fontSize: 12, color: userBalance >= advisor.consultation_fee ? colors.success : colors.error }}>₹{userBalance.toFixed(0)}</Text>
            </View>
          </View>
          {err ? <Text style={{ color: colors.error, marginTop: 8 }}>{err}</Text> : null}
          <Pressable testID="confirm-book-btn" onPress={book} disabled={busy || times.length === 0} style={[styles.payBtn, (busy || times.length === 0) && { opacity: 0.5 }]}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Pay ₹{advisor.consultation_fee} via Wallet</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function QuoteModal({ advisor, onClose, onDone }: any) {
  const [category, setCategory] = useState(advisor.categories?.[0] || 'm1');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (message.trim().length < 10) return;
    setBusy(true);
    try { await api.post('/quotes', { advisor_id: advisor.id, category, message }); onDone(); }
    finally { setBusy(false); }
  };
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={styles.modalCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 18, fontWeight: '700' }}>Request Fee Quote</Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={24} /></Pressable>
          </View>
          <Text style={styles.modalLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(advisor.categories || []).map((c: string) =>
              <Pressable key={c} onPress={() => setCategory(c)} style={[styles.timeChip, category === c && styles.timeChipSel]}>
                <Text style={[styles.timeChipText, category === c && { color: colors.brand, fontWeight: '700' }]}>{c}</Text>
              </Pressable>)}
          </ScrollView>
          <Text style={styles.modalLabel}>Describe your need</Text>
          <TextInput testID="quote-message" value={message} onChangeText={setMessage} multiline numberOfLines={4} placeholder="Briefly describe what you need help with..." style={[styles.input, { height: 110, textAlignVertical: 'top' }]} />
          <Pressable testID="send-quote-btn" disabled={busy || message.trim().length < 10} onPress={submit} style={[styles.payBtn, (busy || message.trim().length < 10) && { opacity: 0.5 }]}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Send Quote Request</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  authBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.brandSecondary, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, marginBottom: 10 },
  authBadgeText: { color: colors.brand, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  bigAvatar: { width: 72, height: 72, borderRadius: 18, backgroundColor: '#1a3358', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.brandSecondary },
  bigAvatarTxt: { color: colors.brandSecondary, fontSize: 28, fontWeight: '800' },
  heroName: { color: '#fff', fontSize: 20, fontWeight: '800' },
  heroBiz: { color: '#9DB2D0', fontSize: 13 },
  heroMeta: { color: '#fff', fontSize: 12 },
  bio: { color: colors.onSurfaceSecondary, fontSize: 13, lineHeight: 20, marginTop: 4 },
  metaGrid: { flexDirection: 'row', gap: 8, marginTop: 12 },
  servicePill: { backgroundColor: colors.brandSecondaryLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  servicePillText: { color: colors.onBrandSecondary, fontSize: 12, fontWeight: '600' },
  slot: { backgroundColor: colors.surfaceSecondary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, minWidth: 90 },
  slotDay: { fontSize: 10, color: colors.textMuted, fontWeight: '700', letterSpacing: 0.5 },
  slotTime: { fontSize: 12, color: colors.onSurface, fontWeight: '600', marginTop: 2 },
  unlockBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.brandIndigo, paddingVertical: 12, borderRadius: radius.md, marginTop: 6 },
  unlockBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  unlockCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.brandSecondaryLight, padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.success, marginTop: 6 },
  unlockPhone: { fontSize: 16, fontWeight: '700', color: colors.onSurface },
  unlockMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider, padding: spacing.md, paddingBottom: 24, flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: radius.md },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, padding: spacing.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingBottom: 32, maxHeight: '85%' },
  modalLabel: { fontSize: 12, fontWeight: '700', color: colors.onSurfaceSecondary, letterSpacing: 0.5, marginTop: 14, marginBottom: 8 },
  dateChip: { paddingHorizontal: 14, paddingVertical: 8, marginRight: 6, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, alignItems: 'center' },
  dateChipDay: { fontSize: 10, color: colors.textMuted, fontWeight: '700' },
  dateChipNum: { fontSize: 16, fontWeight: '700', color: colors.onSurface, marginTop: 2 },
  timeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: 'transparent' },
  timeChipSel: { backgroundColor: colors.brandSecondaryLight, borderColor: colors.brandSecondary },
  timeChipText: { fontSize: 12, color: colors.onSurfaceSecondary },
  payBtn: { backgroundColor: colors.brand, padding: 14, borderRadius: radius.md, alignItems: 'center', marginTop: 16 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, marginTop: 4 },
});
