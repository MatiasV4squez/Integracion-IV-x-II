import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Txt } from '@/components/txt';
import { RADIUS } from '@/constants/ui';
import { useTone } from '@/hooks/use-tone';
import { useUI } from '@/hooks/use-ui';

type Props = TextInputProps & { label?: string; /** Mensaje de validación: pinta el borde de rojo y lo muestra debajo. */ error?: string };

export function TextField({ label, error, style, multiline, ...rest }: Props) {
  const ui = useUI();
  const danger = useTone('danger');

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
          { backgroundColor: ui.surface, borderColor: error ? danger.fg : ui.border, color: ui.text },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Txt variant="caption" style={{ color: danger.fg }} accessibilityRole="alert">
          {error}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  input: { borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 46 },
  multiline: { minHeight: 84, textAlignVertical: 'top' },
});
