import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Radius, Spacing, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SUBJECTS = ['Cálculo I', 'Cálculo II', 'Álgebra Lineal', 'Física I', 'Programación I', 'Inglés'];
const DAYS = ['Hoy', 'Mañana', 'Miér 01', 'Jue 02', 'Vie 03'];
const TIME_SLOTS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
const LOCATIONS = ['Biblioteca Juan Pablo II', 'Edificio Central', 'Facultad de Ingeniería', 'Virtual'];

function Chip({
  label,
  selected,
  onPress,
  colors,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: ThemeColors;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        chipStyles.chip,
        { backgroundColor: selected ? colors.primary : colors.iconSoft },
      ]}>
      <Text style={[chipStyles.chipText, { color: selected ? colors.onPrimary : colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const chipStyles = StyleSheet.create({
  chip: { borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  chipText: { fontSize: 13, fontWeight: '600' },
});

export default function SolicitudScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();

  const [subject, setSubject] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isComplete = subject && day && time && location;

  if (submitted) {
    return (
      <View style={styles.confirmationScreen}>
        <View style={styles.confirmationIcon}>
          <Ionicons name="checkmark-circle" size={56} color={colors.primary} />
        </View>
        <Text style={styles.confirmationTitle}>¡Solicitud enviada!</Text>
        <Text style={styles.confirmationText}>
          {subject} · {day} · {time} · {location}
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.submitButton, pressed && styles.pressed]}>
          <Text style={styles.submitButtonText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <Text style={styles.label}>Materia</Text>
      <View style={styles.chipRow}>
        {SUBJECTS.map((item) => (
          <Chip key={item} label={item} selected={subject === item} onPress={() => setSubject(item)} colors={colors} />
        ))}
      </View>

      <Text style={styles.label}>Día</Text>
      <View style={styles.chipRow}>
        {DAYS.map((item) => (
          <Chip key={item} label={item} selected={day === item} onPress={() => setDay(item)} colors={colors} />
        ))}
      </View>

      <Text style={styles.label}>Horario</Text>
      <View style={styles.chipRow}>
        {TIME_SLOTS.map((item) => (
          <Chip key={item} label={item} selected={time === item} onPress={() => setTime(item)} colors={colors} />
        ))}
      </View>

      <Text style={styles.label}>Lugar</Text>
      <View style={styles.chipRow}>
        {LOCATIONS.map((item) => (
          <Chip
            key={item}
            label={item}
            selected={location === item}
            onPress={() => setLocation(item)}
            colors={colors}
          />
        ))}
      </View>

      <Text style={styles.label}>Notas (opcional)</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Agrega detalles de tu solicitud..."
        placeholderTextColor={colors.textMuted}
        style={styles.textArea}
        multiline
        numberOfLines={4}
      />

      <Pressable
        disabled={!isComplete}
        onPress={() => setSubmitted(true)}
        style={({ pressed }) => [
          styles.submitButton,
          !isComplete && styles.submitButtonDisabled,
          pressed && isComplete && styles.pressed,
        ]}>
        <Text style={styles.submitButtonText}>Enviar solicitud</Text>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: Spacing.lg, paddingBottom: Spacing.xl * 2 },
    label: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      marginTop: Spacing.lg,
      marginBottom: Spacing.sm,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    textArea: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: Radius.md,
      padding: Spacing.md,
      fontSize: 14,
      color: colors.text,
      minHeight: 90,
      textAlignVertical: 'top',
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: Radius.md,
      paddingVertical: Spacing.md,
      alignItems: 'center',
      marginTop: Spacing.xl,
    },
    submitButtonDisabled: { backgroundColor: colors.iconSoft },
    submitButtonText: { color: colors.onPrimary, fontWeight: '700', fontSize: 15 },
    pressed: { opacity: 0.7 },
    confirmationScreen: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xl,
    },
    confirmationIcon: { marginBottom: Spacing.lg },
    confirmationTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
    confirmationText: {
      color: colors.textMuted,
      fontSize: 14,
      marginTop: Spacing.sm,
      textAlign: 'center',
    },
  });
}
