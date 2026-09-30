import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { Card } from '@/components/card';
import { PseudoQr, sessionCode } from '@/components/pseudo-qr';
import { Txt } from '@/components/txt';
import { useUI } from '@/hooks/use-ui';
import type { Session } from '@/types/session';
import { formatTime } from '@/utils/format';
import { CHECKIN_WINDOW_MINUTES, type CheckInPhase } from '@/utils/session-machine';

type Props = { session: Session; phase: CheckInPhase; onCheckIn: () => void };

/** QR de la sesión + registro de asistencia de ambos participantes (respalda la declaración de cierre). */
export function AttendanceCard({ session, phase, onCheckIn }: Props) {
  const ui = useUI();
  const active = session.status === 'confirmada';
  const mine = session.attendance?.mine;
  const theirs = session.attendance?.theirs;
  const otherRole = session.myRole === 'tutee' ? 'Tutor' : 'Tutee';

  const hint =
    phase === 'early'
      ? `El check-in se habilita ${CHECKIN_WINDOW_MINUTES} min antes del inicio.`
      : phase === 'open'
        ? 'Muestra tu QR o escanea el de la otra persona para registrar la asistencia.'
        : 'El horario de la sesión ya terminó.';

  return (
    <Card style={styles.card}>
      <Txt variant="caption" color="muted" style={styles.title}>
        {active ? 'CÓDIGO QR DE ASISTENCIA' : 'COMPROBANTE DE ASISTENCIA'}
      </Txt>

      <View style={styles.tile}>
        <PseudoQr seed={session.id} color={ui.qr} />
      </View>
      <Txt variant="caption" color="muted" style={styles.code}>
        {sessionCode(session.id)}
      </Txt>
      <Txt variant="caption" color="muted" style={styles.demo}>
        Código de demostración: en la versión final lo genera el backend.
      </Txt>

      <View style={[styles.box, { backgroundColor: ui.surfaceAlt }]}>
        <Row label="Tu asistencia" value={mine ? `✓ Registrada ${formatTime(mine)}` : 'Pendiente'} done={!!mine} />
        <Row label={`Asistencia del ${otherRole}`} value={theirs ? `✓ Registrada ${formatTime(theirs)}` : 'Pendiente'} done={!!theirs} />
      </View>

      {active ? (
        <>
          <AppButton label={mine ? '✓ Asistencia registrada' : 'Registrar mi asistencia'} disabled={!!mine || phase !== 'open'} onPress={onCheckIn} />
          {!mine ? (
            <Txt variant="caption" color="muted" style={styles.center}>
              {hint}
            </Txt>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}

function Row({ label, value, done }: { label: string; value: string; done: boolean }) {
  return (
    <View style={styles.row}>
      <Txt variant="small" color="muted">
        {label}
      </Txt>
      <Txt variant="label" color={done ? 'primary' : 'muted'}>
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'stretch', gap: 12 },
  title: { textAlign: 'center', letterSpacing: 1.4, fontWeight: '700' },
  tile: { alignSelf: 'center', padding: 14, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E8F0' },
  code: { textAlign: 'center', letterSpacing: 1.6 },
  demo: { textAlign: 'center', fontStyle: 'italic' },
  center: { textAlign: 'center' },
  box: { padding: 12, borderRadius: 14, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
});
