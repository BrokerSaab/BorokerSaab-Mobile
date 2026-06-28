import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/auth';
import { colors, radius, spacing } from '@/src/theme';

export default function Badge() {
  const { user } = useAuth();
  const router = useRouter();

  const subscribe = () => {
    // MOCKED — in production, integrate Razorpay subscription flow
    Alert.alert('Payment Mocked', 'Razorpay integration mocked for MVP. Activating badge...', [
      { text: 'OK' },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.brand }} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color="#fff" /></Pressable>
        <Text style={styles.topTitle}>Authorized Dealer Badge</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        <View style={styles.card}>
          <LinearGradient colors={[colors.brandSecondary, '#E8C84C']} style={styles.goldHeader}>
            <Ionicons name="ribbon" size={60} color={colors.brand} />
            <Text style={styles.title}>AUTHORIZED DEALER</Text>
            <Text style={styles.priceMain}>₹1,999 <Text style={{ fontSize: 13, fontWeight: '500' }}>/ year</Text></Text>
            <Text style={styles.priceSub}>+18% GST · Auto-renew optional</Text>
          </LinearGradient>

          <View style={{ padding: spacing.lg }}>
            <Text style={styles.section}>BENEFITS</Text>
            {[
              ['ribbon', 'Authorized Badge on profile'],
              ['trending-up', 'Priority listing in search'],
              ['shield-checkmark', 'Verified pro indicator'],
              ['flash', 'Better conversion rates'],
            ].map(([icon, text]) => (
              <View key={text as string} style={styles.benefit}>
                <Ionicons name={icon as any} size={16} color={colors.success} />
                <Text style={styles.benefitText}>{text}</Text>
              </View>
            ))}

            <Text style={styles.section}>PRICE BREAKDOWN</Text>
            <Row k="Base Price" v="₹1,999.00" />
            <Row k="CGST (9%)" v="₹179.91" />
            <Row k="SGST (9%)" v="₹179.91" />
            <View style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 10, marginTop: 4 }]}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.brand }}>TOTAL</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.brand }}>₹2,358.82</Text>
            </View>

            <Pressable testID="pay-badge-btn" onPress={subscribe} style={styles.payBtn}>
              <Text style={{ color: colors.brand, fontWeight: '800', fontSize: 15 }}>Pay ₹2,358.82 via Razorpay</Text>
            </Pressable>
            <Text style={styles.fineprint}>🔒 Secured payment · 100% refund within 48h</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
function Row({ k, v }: any) {
  return <View style={styles.row}>
    <Text style={{ color: colors.onSurfaceSecondary, fontSize: 13 }}>{k}</Text>
    <Text style={{ color: colors.onSurface, fontSize: 13, fontWeight: '600' }}>{v}</Text>
  </View>;
}
const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  topTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  goldHeader: { padding: spacing.xl, alignItems: 'center' },
  title: { color: colors.brand, fontWeight: '900', letterSpacing: 1, marginTop: 8, fontSize: 14 },
  priceMain: { color: colors.brand, fontSize: 28, fontWeight: '800', marginTop: 8 },
  priceSub: { color: colors.onBrandSecondary, fontSize: 12, marginTop: 2 },
  section: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, marginTop: spacing.md, marginBottom: 6 },
  benefit: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  benefitText: { fontSize: 13, color: colors.onSurface },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  payBtn: { backgroundColor: colors.brandSecondary, padding: 14, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.lg },
  fineprint: { textAlign: 'center', color: colors.textMuted, fontSize: 11, marginTop: 8 },
});
