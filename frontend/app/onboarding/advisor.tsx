import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/api';
import { useAuth } from '@/src/auth';
import { colors, radius, spacing } from '@/src/theme';

const STEPS = ['Type', 'Account', 'Profile', 'Categories', 'Review'];

export default function AdvisorOnboarding() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const router = useRouter();
  const { signIn } = useAuth();
  const [step, setStep] = useState(0);
  const [advisorType, setAdvisorType] = useState<'REGULAR' | 'AUTHORIZED'>('REGULAR');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [stateName, setStateName] = useState('');
  const [exp, setExp] = useState('');
  const [fee, setFee] = useState('');
  const [cats, setCats] = useState<string[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { api.get('/categories').then(setCategories).catch(() => {}); }, []);

  const next = () => { setErr(''); if (step < STEPS.length - 1) setStep(step + 1); };
  const back = () => { if (step > 0) setStep(step - 1); else router.back(); };

  const toggleCat = (id: string) => setCats((c) => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);

  const submit = async () => {
    setLoading(true);
    try {
      const r = await api.post('/auth/advisor/signup', {
        phone, full_name: fullName, email, business_name: businessName, bio,
        location, state: stateName,
        experience_years: parseInt(exp || '0', 10),
        consultation_fee: parseFloat(fee || '0'),
        categories: cats, advisor_type: advisorType, languages: ['English', 'Hindi'],
      });
      await signIn(r.token, r.user);
      router.replace('/');
    } catch (e: any) { setErr(e.message); }
    setLoading(false);
  };

  const canNext = () => {
    if (step === 0) return true;
    if (step === 1) return fullName.length >= 2 && /^\S+@\S+\.\S+$/.test(email);
    if (step === 2) return location && stateName && exp && fee;
    if (step === 3) return cats.length > 0;
    return true;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={styles.topBar}>
        <Pressable onPress={back} testID="onboarding-back"><Ionicons name="chevron-back" size={24} color={colors.brand} /></Pressable>
        <Text style={styles.topTitle}>Become an Advisor</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.progressWrap}>
        {STEPS.map((s, i) => (
          <View key={s} style={[styles.dot, i <= step && styles.dotActive]} />
        ))}
      </View>
      <Text style={styles.stepLabel}>Step {step + 1} of {STEPS.length} · {STEPS[step]}</Text>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          {step === 0 && (
            <View>
              <Text style={styles.h2}>Choose advisor type</Text>
              {(['REGULAR', 'AUTHORIZED'] as const).map(t => (
                <Pressable key={t} testID={`type-${t}`} style={[styles.optionCard, advisorType === t && styles.optionSel]} onPress={() => setAdvisorType(t)}>
                  <Ionicons name={t === 'AUTHORIZED' ? 'shield-checkmark' : 'person'} size={22} color={advisorType === t ? colors.brandSecondary : colors.brand} />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.optTitle}>{t === 'REGULAR' ? 'Regular Advisor' : 'Authorized Advisor'}</Text>
                    <Text style={styles.optSub}>{t === 'REGULAR' ? 'Standard verified profile' : 'Premium tier; eligible for Authorized Dealer Badge'}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
          {step === 1 && (
            <View>
              <Field label="Full Name *" value={fullName} onChangeText={setFullName} testID="ad-name" />
              <Field label="Email *" value={email} onChangeText={setEmail} testID="ad-email" autoCap="none" kbd="email-address" />
              <Field label="Business Name" value={businessName} onChangeText={setBusinessName} testID="ad-biz" />
            </View>
          )}
          {step === 2 && (
            <View>
              <Field label="Bio" value={bio} onChangeText={setBio} testID="ad-bio" multiline />
              <Field label="City / Location *" value={location} onChangeText={setLocation} testID="ad-loc" />
              <Field label="State *" value={stateName} onChangeText={setStateName} testID="ad-state" />
              <Field label="Years of Experience *" value={exp} onChangeText={setExp} testID="ad-exp" kbd="number-pad" />
              <Field label="Consultation Fee (₹) *" value={fee} onChangeText={setFee} testID="ad-fee" kbd="decimal-pad" />
            </View>
          )}
          {step === 3 && (
            <View>
              <Text style={styles.h2}>Select your service categories</Text>
              <Text style={styles.sub}>Pick all that apply</Text>
              <View style={styles.catGrid}>
                {categories.map(c => (
                  <Pressable key={c.id} testID={`cat-${c.id}`} onPress={() => toggleCat(c.id)} style={[styles.catTile, cats.includes(c.id) && styles.catSel]}>
                    <Ionicons name={c.icon as any} size={18} color={cats.includes(c.id) ? colors.brand : colors.textSubtle} />
                    <Text style={[styles.catText, cats.includes(c.id) && { color: colors.brand, fontWeight: '600' }]} numberOfLines={2}>{c.name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
          {step === 4 && (
            <View>
              <Text style={styles.h2}>Review your application</Text>
              <Row k="Type" v={advisorType} />
              <Row k="Name" v={fullName} />
              <Row k="Email" v={email} />
              <Row k="Business" v={businessName || '—'} />
              <Row k="Location" v={`${location}, ${stateName}`} />
              <Row k="Experience" v={`${exp} years`} />
              <Row k="Fee" v={`₹${fee} / session`} />
              <Row k="Categories" v={`${cats.length} selected`} />
              <View style={{ backgroundColor: colors.brandSecondaryLight, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.md }}>
                <Text style={{ color: colors.onBrandSecondary, fontSize: 12 }}>For this MVP, advisors are auto-approved on submission. In production, KYC documents would be reviewed by sub-admins.</Text>
              </View>
            </View>
          )}
          {err ? <Text style={{ color: colors.error, marginTop: 12 }}>{err}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.bottomBar}>
        <Pressable
          testID="onboarding-next-btn"
          style={[styles.primary, !canNext() && { opacity: 0.5 }]}
          onPress={() => (step === STEPS.length - 1 ? submit() : next())}
          disabled={!canNext() || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{step === STEPS.length - 1 ? 'Submit Application' : 'Continue'}</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, testID, kbd, multiline, autoCap }: any) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.lbl}>{label}</Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        keyboardType={kbd}
        autoCapitalize={autoCap}
        multiline={!!multiline}
        style={[styles.inp, multiline && { height: 88, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.rowItem}>
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>{k}</Text>
      <Text style={{ color: colors.onSurface, fontSize: 14, marginTop: 2 }}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
  topTitle: { fontWeight: '700', fontSize: 16, color: colors.onSurface },
  progressWrap: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  dot: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.surfaceTertiary },
  dotActive: { backgroundColor: colors.brandSecondary },
  stepLabel: { fontSize: 12, color: colors.textMuted, paddingHorizontal: spacing.lg, marginTop: 6 },
  h2: { fontSize: 18, fontWeight: '700', color: colors.onSurface, marginBottom: 6 },
  sub: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.md },
  optionCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm, backgroundColor: colors.surface },
  optionSel: { borderColor: colors.brandSecondary, backgroundColor: colors.brandSecondaryLight },
  optTitle: { fontWeight: '600', color: colors.onSurface, fontSize: 15 },
  optSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  lbl: { fontSize: 13, fontWeight: '600', color: colors.onSurfaceSecondary, marginBottom: 6 },
  inp: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15, backgroundColor: colors.surface, color: colors.onSurface },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catTile: { width: '48%', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface },
  catSel: { borderColor: colors.brandSecondary, backgroundColor: colors.brandSecondaryLight },
  catText: { fontSize: 13, color: colors.onSurface, flex: 1 },
  rowItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider },
  primary: { backgroundColor: colors.brand, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
