import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { FilterChip } from '@/components/filter-chip';
import { NoticeBanner } from '@/components/notice-banner';
import { RatingStars } from '@/components/rating-stars';
import { ScreenContainer } from '@/components/screen-container';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ACCENT } from '@/constants/tones';
import { useTheme } from '@/hooks/use-theme';
import { MOCK_PENDING_COUNT, MOCK_TUTOR } from '@/mocks/sessions';
import type { AvailabilityBlock, TutorProfile } from '@/types/session';
import { formatDate, formatTimeRange, initials } from '@/utils/format';
import { canCreateRequest, MAX_PENDING_REQUESTS, REQUEST_EXPIRY_HOURS } from '@/utils/session-machine';

type Props = {
  tutor?: TutorProfile;
  /** Solicitudes pendientes actuales del Tutee (BR05). */
  pendingCount?: number;
};

/** CU-08 / RF10 / RF11: solicitar tutoría eligiendo materia y bloque horario. Maqueta sin backend. */
export default function SolicitudScreen({ tutor = MOCK_TUTOR, pendingCount = MOCK_PENDING_COUNT }: Props) {
  const theme = useTheme();
  const [subjectCode, setSubjectCode] = useState(tutor.subjects[0]?.code ?? '');
  const [blockId, setBlockId] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const limitReached = !canCreateRequest(pendingCount);
  const selectedBlock = tutor.availability.find((b) => b.id === blockId) ?? null;
  const selectedSubject = tutor.subjects.find((s) => s.code === subjectCode) ?? null;

  // BR13: la API solo entrega bloques libres; aquí solo los agrupamos por día.
  const days = useMemo(() => {
    const map = new Map<string, AvailabilityBlock[]>();
    for (const block of tutor.availability) {
      const key = formatDate(block.startsAt);
      map.set(key, [...(map.get(key) ?? []), block]);
    }
    return [...map.entries()];
  }, [tutor.availability]);

  const canSubmit = !!selectedBlock && !!selectedSubject && !limitReached && !sent;

  return (
    <ScreenContainer>
      {/* Tutor */}
      <ThemedView type="backgroundElement" style={[styles.card, styles.tutorRow]}>
        <View style={[styles.avatar, { backgroundColor: ACCENT }]}>
          <ThemedText type="smallBold" style={styles.avatarText}>
            {initials(tutor.name)}
          </ThemedText>
        </View>
        <View style={styles.tutorInfo}>
          <ThemedText type="default" style={styles.bold}>
            {tutor.name}
          </ThemedText>
          {tutor.reputation !== null ? (
            <View style={styles.reputationRow}>
              <RatingStars value={Math.round(tutor.reputation)} size={14} />
              <ThemedText type="small" themeColor="textSecondary">
                {tutor.reputation.toFixed(1)} ({tutor.ratingsCount})
              </ThemedText>
            </View>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              Sin calificaciones aún
            </ThemedText>
          )}
        </View>
      </ThemedView>

      {/* Materia */}
      <View style={styles.section}>
        <ThemedText type="smallBold">Materia</ThemedText>
        <View style={styles.chips}>
          {tutor.subjects.map((s) => (
            <FilterChip
              key={s.code}
              label={`${s.name} · ${s.code}`}
              selected={subjectCode === s.code}
              onPress={() => setSubjectCode(s.code)}
            />
          ))}
        </View>
      </View>

      {/* Horarios */}
      <View style={styles.section}>
        <ThemedText type="smallBold">Horarios disponibles</ThemedText>
        {days.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Este tutor no tiene horarios libres por ahora.
          </ThemedText>
        ) : (
          days.map(([day, blocks]) => (
            <View key={day} style={styles.day}>
              <ThemedText type="small" themeColor="textSecondary">
                {day}
              </ThemedText>
              <View style={styles.chips}>
                {blocks.map((block) => {
                  const selected = block.id === blockId;
                  return (
                    <Pressable
                      key={block.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => setBlockId(block.id)}
                      style={[
                        styles.block,
                        {
                          backgroundColor: selected ? ACCENT : theme.backgroundElement,
                          borderColor: selected ? ACCENT : theme.backgroundSelected,
                        },
                      ]}>
                      <ThemedText type="smallBold" style={{ color: selected ? '#FFFFFF' : theme.text }}>
                        {formatTimeRange(block.startsAt, block.endsAt)}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Límite de solicitudes pendientes */}
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.limitHeader}>
          <ThemedText type="small">Solicitudes pendientes</ThemedText>
          <ThemedText type="smallBold">
            {pendingCount} / {MAX_PENDING_REQUESTS}
          </ThemedText>
        </View>
        <View style={styles.meter}>
          {Array.from({ length: MAX_PENDING_REQUESTS }, (_, i) => (
            <View
              key={i}
              style={[
                styles.meterSlot,
                { backgroundColor: i < pendingCount ? ACCENT : theme.backgroundSelected },
              ]}
            />
          ))}
        </View>
      </ThemedView>

      {limitReached ? (
        <NoticeBanner
          tone="danger"
          title="Límite alcanzado"
          message={`Ya tienes ${MAX_PENDING_REQUESTS} solicitudes pendientes. Espera una respuesta antes de crear otra.`}
        />
      ) : null}

      {/* Resumen */}
      {selectedBlock && selectedSubject ? (
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Resumen</ThemedText>
          <ThemedText type="small">
            {selectedSubject.name} con {tutor.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDate(selectedBlock.startsAt)} · {formatTimeRange(selectedBlock.startsAt, selectedBlock.endsAt)}
          </ThemedText>
        </ThemedView>
      ) : null}

      <NoticeBanner
        tone="info"
        message={`El tutor tiene ${REQUEST_EXPIRY_HOURS} horas para responder. Si no lo hace, la solicitud expira y el horario se libera.`}
      />

      {sent ? (
        <NoticeBanner
          tone="success"
          title="Simulación (sin backend)"
          message="Solicitud enviada. Quedaría en estado Pendiente."
        />
      ) : null}

      <AppButton label="Enviar solicitud" disabled={!canSubmit} onPress={() => setSent(true)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 16, gap: 8 },
  tutorRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 18 },
  tutorInfo: { flex: 1, gap: 2 },
  bold: { fontWeight: '700' },
  reputationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  section: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  day: { gap: 6 },
  block: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, minHeight: 44, justifyContent: 'center' },
  limitHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  meter: { flexDirection: 'row', gap: 6 },
  meterSlot: { flex: 1, height: 8, borderRadius: 4 },
});
