import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { api } from '@/src/api';
import { useAuth } from '@/src/auth';
import { colors, radius, spacing } from '@/src/theme';

export default function EditProfile() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  // Password
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwMsg, setPwMsg] = useState('');

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Photo access needed', 'Please allow gallery access in Settings.'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: true,
    });
    if (r.canceled || !r.assets?.[0]?.base64) return;
    setBusy(true);
    try {
      const data = `data:image/jpeg;base64,${r.assets[0].base64}`;
      await api.post('/users/upload/avatar', { image_base64: data });
      await refresh();
      setMsg('Avatar updated');
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  };

  const saveProfile = async () => {
    setBusy(true); setMsg('');
    try {
      await api.patch('/users/me/profile', { full_name: name, email });
      await refresh();
      setMsg('Profile saved');
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  };

  const setPassword = async () => {
    setPwMsg('');
    if (pw1 !== pw2) { setPwMsg('Passwords do not match'); return; }
    setBusy(true);
    try {
      await api.post('/auth/password/set', { password: pw1 });
      setPwMsg('Password set successfully — you can now log in with phone + password');
      setPw1(''); setPw2('');
    } catch (e: any) { setPwMsg(e.message); }
    setBusy(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceSecondary }} edges={['top']}>
      <View style={styles.head}>
        <Pressable testID="ep-back" onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color={colors.brand} /></Pressable>
        <Text style={styles.title}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        <View style={styles.avatarWrap}>
          {user?.avatar_url && user.avatar_url.startsWith('data:') ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatarImg, { backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: colors.brandSecondary, fontSize: 36, fontWeight: '700' }}>{(user?.full_name || '?').slice(0, 1)}</Text>
            </View>
          )}
          <Pressable testID="pick-avatar-btn" onPress={pickAvatar} style={styles.editPhoto}>
            <Ionicons name="camera" size={14} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>Change Photo</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>BASIC INFO</Text>
          <Field label="Full Name" value={name} onChangeText={setName} testID="ep-name" />
          <Field label="Email" value={email} onChangeText={setEmail} testID="ep-email" autoCap="none" kbd="email-address" />
          <View style={{ marginBottom: spacing.sm }}>
            <Text style={styles.lbl}>Phone Number</Text>
            <View style={[styles.inp, { backgroundColor: colors.surfaceSecondary, justifyContent: 'center' }]}>
              <Text style={{ color: colors.textMuted }}>+91 {user?.phone} (read-only)</Text>
            </View>
          </View>
          {msg ? <Text style={[styles.msg, { color: msg.includes('saved') || msg.includes('updated') ? colors.success : colors.error }]}>{msg}</Text> : null}
          <Pressable testID="save-profile-btn" onPress={saveProfile} disabled={busy} style={[styles.btn, busy && { opacity: 0.5 }]}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save Changes</Text>}
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>SET / UPDATE PASSWORD</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 10 }}>Lets you log in with phone + password instead of OTP each time.</Text>
          <Field label="New Password" value={pw1} onChangeText={setPw1} testID="ep-pw1" secure />
          <Field label="Confirm Password" value={pw2} onChangeText={setPw2} testID="ep-pw2" secure />
          <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 6 }}>8+ chars, with uppercase, lowercase & digit</Text>
          {pwMsg ? <Text style={[styles.msg, { color: pwMsg.includes('success') ? colors.success : colors.error }]}>{pwMsg}</Text> : null}
          <Pressable testID="set-password-btn" onPress={setPassword} disabled={busy || !pw1} style={[styles.btn, (busy || !pw1) && { opacity: 0.5 }]}>
            <Text style={styles.btnText}>Save Password</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, testID, kbd, autoCap, secure }: any) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Text style={styles.lbl}>{label}</Text>
      <TextInput testID={testID} value={value} onChangeText={onChangeText} keyboardType={kbd} autoCapitalize={autoCap} secureTextEntry={secure} style={styles.inp} />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  title: { fontSize: 16, fontWeight: '700', color: colors.onSurface },
  avatarWrap: { alignItems: 'center', marginVertical: spacing.lg },
  avatarImg: { width: 100, height: 100, borderRadius: 50 },
  editPhoto: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, backgroundColor: colors.brandIndigo, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  card: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.divider },
  section: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing.md },
  lbl: { fontSize: 12, fontWeight: '600', color: colors.onSurfaceSecondary, marginBottom: 6 },
  inp: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, height: 46 },
  msg: { fontSize: 12, marginVertical: 6 },
  btn: { backgroundColor: colors.brandIndigo, paddingVertical: 14, borderRadius: radius.md, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontWeight: '700' },
});
