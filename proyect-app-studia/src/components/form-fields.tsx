import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

import { FilterChip } from '@/components/filter-chip';
import { TextField } from '@/components/text-field';
import { Txt } from '@/components/txt';
import { useTone } from '@/hooks/use-tone';

type FormTextFieldProps<T extends FieldValues> = Omit<ComponentProps<typeof TextField>, 'value' | 'onChangeText' | 'onBlur' | 'error'> & {
  control: Control<T>;
  name: Path<T>;
};

/** Campo de texto conectado a react-hook-form: muestra el error de validación debajo. */
export function FormTextField<T extends FieldValues>({ control, name, ...rest }: FormTextFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField {...rest} value={String(field.value ?? '')} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
      )}
    />
  );
}

type ChipOption<V> = { value: V; label: string };

/** Grupo de opciones (una sola elegible) conectado a react-hook-form. */
export function FormChipGroup<T extends FieldValues, V extends string | number>({
  control,
  name,
  options,
}: {
  control: Control<T>;
  name: Path<T>;
  options: ChipOption<V>[];
}) {
  const danger = useTone('danger');

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <View style={styles.group}>
          <View style={styles.row}>
            {options.map((option) => (
              <FilterChip key={String(option.value)} label={option.label} selected={field.value === option.value} onPress={() => field.onChange(option.value)} />
            ))}
          </View>
          {fieldState.error ? (
            <Txt variant="caption" style={{ color: danger.fg }} accessibilityRole="alert">
              {fieldState.error.message}
            </Txt>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  group: { gap: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
