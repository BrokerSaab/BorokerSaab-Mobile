import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/src/auth';
import { colors } from '@/src/theme';

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.brandSecondary} />
      </View>
    );
  }
  if (!user) return <Redirect href="/auth" />;
  if (user.role === 'advisor') return <Redirect href="/(advisor)/dashboard" />;
  return <Redirect href="/(client)/discover" />;
}
