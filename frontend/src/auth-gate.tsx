import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/auth';
import { colors, radius, spacing } from '@/src/theme';

export function SignInGate({ title, message, icon = 'lock-closed' }: { title: string; message: string; icon?: any }) {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceSecondary }} edges={['top']}>
      <View style={styles.wrap}>
        <View style={styles.iconBox}>
          <Ionicons name={icon} size={40} color={colors.brandIndigo} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{message}</Text>
        <Pressable testID="gate-signin" onPress={() => router.push('/auth')} style={styles.btn}>
          <Text style={styles.btnText}>Sign In / Sign Up</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </Pressable>
        <Pressable testID="gate-browse" onPress={() => router.replace('/(client)/discover')} style={styles.linkBtn}>
          <Text style={styles.linkText}>← Continue Browsing Services</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export function RequireAuth({ children, title, message, icon }: { children: React.ReactNode; title: string; message: string; icon?: any }) {
  const { user } = useAuth();
  if (!user) return <SignInGate title={title} message={message} icon={icon} />;
  return <>{children}</>;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: spacing.xl, justifyContent: 'center', alignItems: 'center' },
  iconBox: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.brandIndigoLight, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  title: { fontSize: 22, fontWeight: '800', color: colors.onSurface, textAlign: 'center' },
  sub: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 8, marginBottom: spacing.xl, lineHeight: 20 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.brandIndigo, paddingHorizontal: 28, paddingVertical: 14, borderRadius: radius.md },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  linkBtn: { padding: 12, marginTop: 6 },
  linkText: { color: colors.brandIndigo, fontSize: 13, fontWeight: '600' },
});
