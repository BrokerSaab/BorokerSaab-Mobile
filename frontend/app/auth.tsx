import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '@/src/api';
import { useAuth } from '@/src/auth';
import { colors, radius, spacing } from '@/src/theme';

type Step = 'role' | 'phone' | 'otp' | 'register';

export default function Auth() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<'client' | 'advisor'>('client');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const sendOtp = async () => {
    setErr('');
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setErr('Enter a valid 10-digit phone (starts 6-9)');
      return;
    }
    setLoading(true);
    try {
      const r = await api.post('/auth/otp/send', { phone, role });
      setDevOtp(r.dev_otp || '');
      setStep('otp');
    } catch (e: any) { setErr(e.message); }
    setLoading(false);
  };

  const verifyOtp = async () => {
    setErr('');
    if (otp.length !== 6) { setErr('Enter 6-digit OTP'); return; }
    setLoading(true);
    try {
      const r = await api.post('/auth/otp/verify', { phone, otp, role });
      if (r.token) {
        await signIn(r.token, r.user);
        router.replace('/');
      } else {
        if (role === 'advisor') {
          router.replace({ pathname: '/onboarding/advisor', params: { phone } });
        } else {
          setStep('register');
        }
      }
    } catch (e: any) { setErr(e.message); }
    setLoading(false);
  };

  const completeRegister = async () => {
    setErr('');
    if (name.trim().length < 2) { setErr('Enter your name'); return; }
    setLoading(true);
    try {
      const r = await api.post('/auth/register/complete', { phone, role, full_name: name, email });
      await signIn(r.token, r.user);
      router.replace('/');
    } catch (e: any) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.brand }}>
      <LinearGradient colors={[colors.brand, '#071527', colors.brand]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.xl, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
            <View style={styles.brandRow}>
              <Image source={require('../assets/images/brokersaab-logo.png')} style={styles.logoImg} resizeMode="contain" />
              <View>
                <Text style={styles.brand}>Broker<Text style={{ color: colors.brandSecondary }}>Saab</Text></Text>
                <Text style={styles.tagline}>TRUSTED ADVISORY PLATFORM</Text>
              </View>
            </View>

            <View style={styles.card}>
              {step === 'role' && (
                <>
                  <Text style={styles.title}>Welcome</Text>
                  <Text style={styles.sub}>Continue as</Text>
                  <Pressable testID="role-client-btn" style={[styles.roleBtn, role === 'client' && styles.roleSel]} onPress={() => setRole('client')}>
                    <Ionicons name="person" size={22} color={role === 'client' ? colors.brandSecondary : '#fff'} />
                    <View style={{ marginLeft: spacing.md }}>
                      <Text style={styles.roleTitle}>Client</Text>
                      <Text style={styles.roleSub}>Find & book verified advisors</Text>
                    </View>
                  </Pressable>
                  <Pressable testID="role-advisor-btn" style={[styles.roleBtn, role === 'advisor' && styles.roleSel]} onPress={() => setRole('advisor')}>
                    <Ionicons name="briefcase" size={22} color={role === 'advisor' ? colors.brandSecondary : '#fff'} />
                    <View style={{ marginLeft: spacing.md }}>
                      <Text style={styles.roleTitle}>Advisor</Text>
                      <Text style={styles.roleSub}>Manage bookings & service tickets</Text>
                    </View>
                  </Pressable>
                  <Pressable testID="role-continue-btn" style={styles.primaryBtn} onPress={() => setStep('phone')}>
                    <Text style={styles.primaryBtnText}>Continue</Text>
                  </Pressable>
                </>
              )}
              {step === 'phone' && (
                <>
                  <Text style={styles.title}>Enter your phone</Text>
                  <Text style={styles.sub}>We'll send you an OTP to verify</Text>
                  <View style={styles.phoneRow}>
                    <View style={styles.prefix}><Text style={styles.prefixText}>+91</Text></View>
                    <TextInput
                      testID="phone-input"
                      value={phone}
                      onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10-digit mobile"
                      placeholderTextColor="#7d8693"
                      keyboardType="number-pad"
                      style={styles.input}
                    />
                  </View>
                  {err ? <Text style={styles.err}>{err}</Text> : null}
                  <Pressable testID="send-otp-btn" style={styles.primaryBtn} onPress={sendOtp} disabled={loading}>
                    {loading ? <ActivityIndicator color={colors.brand} /> : <Text style={styles.primaryBtnText}>Send OTP</Text>}
                  </Pressable>
                </>
              )}
              {step === 'otp' && (
                <>
                  <Text style={styles.title}>Enter OTP</Text>
                  <Text style={styles.sub}>Sent to +91 {phone}</Text>
                  {devOtp ? (
                    <View style={styles.devBox}>
                      <Text style={styles.devText}>DEV OTP: <Text style={{ color: colors.brandSecondary, fontWeight: '700' }}>{devOtp}</Text></Text>
                    </View>
                  ) : null}
                  <TextInput
                    testID="otp-input"
                    value={otp}
                    onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit OTP"
                    placeholderTextColor="#7d8693"
                    keyboardType="number-pad"
                    style={[styles.input, { paddingLeft: spacing.md, letterSpacing: 8, textAlign: 'center', fontSize: 18 }]}
                  />
                  {err ? <Text style={styles.err}>{err}</Text> : null}
                  <Pressable testID="verify-otp-btn" style={styles.primaryBtn} onPress={verifyOtp} disabled={loading}>
                    {loading ? <ActivityIndicator color={colors.brand} /> : <Text style={styles.primaryBtnText}>Verify</Text>}
                  </Pressable>
                  <Pressable onPress={() => setStep('phone')}><Text style={styles.linkText}>Change number</Text></Pressable>
                </>
              )}
              {step === 'register' && (
                <>
                  <Text style={styles.title}>Complete your profile</Text>
                  <Text style={styles.sub}>One last step</Text>
                  <TextInput testID="name-input" value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor="#7d8693" style={[styles.input, styles.fullInput]} />
                  <TextInput testID="email-input" value={email} onChangeText={setEmail} placeholder="Email (optional)" placeholderTextColor="#7d8693" autoCapitalize="none" keyboardType="email-address" style={[styles.input, styles.fullInput]} />
                  {err ? <Text style={styles.err}>{err}</Text> : null}
                  <Pressable testID="register-btn" style={styles.primaryBtn} onPress={completeRegister} disabled={loading}>
                    {loading ? <ActivityIndicator color={colors.brand} /> : <Text style={styles.primaryBtnText}>Create Account</Text>}
                  </Pressable>
                </>
              )}
            </View>
            <Text style={styles.footer}>🔒 256-bit encrypted · 🛡 Escrow protected</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl, gap: 12 },
  logoImg: { width: 56, height: 56 },
  brand: { color: '#fff', fontSize: 22, fontWeight: '700' },
  tagline: { color: '#88A0C0', fontSize: 10, letterSpacing: 1.8, marginTop: 2 },
  card: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(212,175,55,0.25)', borderWidth: 1, borderRadius: radius.lg, padding: spacing.xl },
  title: { color: '#fff', fontSize: 22, fontWeight: '700' },
  sub: { color: '#9DB2D0', fontSize: 13, marginTop: 4, marginBottom: spacing.lg },
  roleBtn: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: spacing.sm },
  roleSel: { borderColor: colors.brandSecondary, backgroundColor: 'rgba(212,175,55,0.08)' },
  roleTitle: { color: '#fff', fontWeight: '600', fontSize: 15 },
  roleSub: { color: '#9DB2D0', fontSize: 12, marginTop: 2 },
  phoneRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  prefix: { paddingHorizontal: 14, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.1)' },
  prefixText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  input: { flex: 1, color: '#fff', paddingHorizontal: spacing.md, paddingVertical: 14, fontSize: 15 },
  fullInput: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', marginBottom: spacing.sm },
  primaryBtn: { backgroundColor: colors.brandSecondary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: spacing.lg },
  primaryBtnText: { color: colors.brand, fontWeight: '700', fontSize: 15 },
  err: { color: '#FF6B6B', fontSize: 12, marginTop: 6 },
  linkText: { color: colors.brandSecondary, fontSize: 13, textAlign: 'center', marginTop: spacing.md },
  devBox: { backgroundColor: 'rgba(212,175,55,0.1)', borderColor: 'rgba(212,175,55,0.3)', borderWidth: 1, padding: 10, borderRadius: radius.sm, marginBottom: spacing.sm },
  devText: { color: '#E4D08A', fontSize: 12, textAlign: 'center' },
  footer: { color: '#5B6E89', fontSize: 11, textAlign: 'center', marginTop: spacing.lg },
});
