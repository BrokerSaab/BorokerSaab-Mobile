import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, statusColors } from './theme';

export function StatusPill({ status, testID }: { status: string; testID?: string }) {
  const c = statusColors[status] || { bg: colors.surfaceSecondary, fg: colors.onSurface };
  return (
    <View testID={testID} style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.pillText, { color: c.fg }]}>{status.replace(/_/g, ' ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  pillText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
});
