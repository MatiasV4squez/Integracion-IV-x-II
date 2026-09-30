import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Txt } from '@/components/txt';
import { RADIUS } from '@/constants/ui';
import { useUI } from '@/hooks/use-ui';

type Props = TextInputProps & { label?: string };

export function TextField({ label, style, multiline, ...rest }: Props) {
  const ui = useUI();

  return (
    <View style={styles.wrap}>
      {label ? (
        <Txt variant="label" color="muted">
          {label}
        </Txt>
      ) : null}
      <TextInput
        accessibilityLabel={label ?? rest.placeholder}
        placeholderTextColor={ui.muted}
        multiline={multiline}
        style={[
          styles.input,
          multiline && styles.multiline,
          { backgroundColor: ui.surface, borderColor: ui.border, color: ui.text },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  input: { borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 46 },
  multiline: { minHeight: 84, textAlignVertical: 'top' },
});
