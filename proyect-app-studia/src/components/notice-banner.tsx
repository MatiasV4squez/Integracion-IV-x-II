import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import type { Tone } from '@/constants/tones';
import { RADIUS } from '@/constants/ui';
import { useTone } from '@/hooks/use-tone';

const ICONS: Record<Tone, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  danger: '🚫',
  success: '✅',
  alert: '🔔',
  neutral: '•',
};

type Props = { tone?: Tone; title?: string; message: string };

export function NoticeBanner({ tone = 'info', title, message }: Props) {
  const colors = useTone(tone);

  return (
    <View style={[styles.box, { backgroundColor: colors.bg }]} accessibilityRole="alert">
      <Txt variant="body" style={styles.icon}>
        {ICONS[tone]}
      </Txt>
      <View style={styles.text}>
        {title ? (
          <Txt variant="label" style={{ color: colors.fg }}>
            {title}
          </Txt>
        ) : null}
        <Txt variant="small" style={{ color: colors.fg }}>
          {message}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: RADIUS.md, alignItems: 'flex-start' },
  icon: { fontSize: 15, lineHeight: 20 },
  text: { flex: 1, gap: 2 },
});
