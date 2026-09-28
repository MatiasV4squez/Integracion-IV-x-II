import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { Tone } from '@/constants/tones';
import { useTone } from '@/hooks/use-tone';

type Props = { tone?: Tone; title?: string; message: string };

export function NoticeBanner({ tone = 'info', title, message }: Props) {
  const colors = useTone(tone);

  return (
    <View style={[styles.box, { backgroundColor: colors.bg }]} accessibilityRole="alert">
      {title ? (
        <ThemedText type="smallBold" style={{ color: colors.fg }}>
          {title}
        </ThemedText>
      ) : null}
      <ThemedText type="small" style={{ color: colors.fg }}>
        {message}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 12, borderRadius: 12, gap: 2 },
});
