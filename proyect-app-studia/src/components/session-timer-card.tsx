import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { TimerRing } from '@/components/timer-ring';
import { Txt } from '@/components/txt';
import { useUI } from '@/hooks/use-ui';
import type { Session } from '@/types/session';
import { formatCountdown, formatDateTime, formatTime } from '@/utils/format';
import { requestExpiresAt } from '@/utils/session-machine';

type Level = 'ok' | 'mid' | 'low' | 'done';
type TimerView = { title: string; main: string; sub: string; fraction: number; label: string; level: Level; hint: string };

const levelOf = (fraction: number): Level => (fraction > 0.5 ? 'ok' : fraction > 0.2 ? 'mid' : 'low');

/** Calcula qué mostrar según el estado: plazo de respuesta, cuenta regresiva al inicio o tiempo restante de la sesión. */
export function computeTimer(session: Session, effectiveNowMs: number): TimerView | null {
  const start = Date.parse(session.startsAt);
  const end = Date.parse(session.endsAt);
  const created = Date.parse(session.createdAt);

  if (session.status === 'pendiente') {
    const expires = Date.parse(requestExpiresAt(session.createdAt));
    const remaining = Math.max(0, expires - effectiveNowMs);
    const fraction = expires > created ? remaining / (expires - created) : 0;
    const level = levelOf(fraction);
    return {
      title: session.myRole === 'tutor' ? 'TIEMPO PARA RESPONDER' : 'LA SOLICITUD EXPIRA EN',
      ...formatCountdown(remaining),
      fraction,
      level,
      label: level === 'ok' ? 'Plazo holgado' : level === 'mid' ? 'Responde pronto' : 'Por expirar',
      hint: `Expira el ${formatDateTime(new Date(expires).toISOString())}`,
    };
  }

  if (session.status === 'confirmada') {
    if (effectiveNowMs < start) {
      const remaining = start - effectiveNowMs;
      return {
        title: 'COMIENZA EN',
        ...formatCountdown(remaining),
        fraction: start > created ? remaining / (start - created) : 0,
        level: 'ok',
        label: 'Sesión programada',
        hint: `Empieza el ${formatDateTime(session.startsAt)}`,
      };
    }
    if (effectiveNowMs < end) {
      const remaining = end - effectiveNowMs;
      const fraction = remaining / (end - start);
      const level = levelOf(fraction);
      return {
        title: 'TIEMPO RESTANTE',
        ...formatCountdown(remaining),
        fraction,
        level,
        label: level === 'ok' ? 'Tiempo amplio' : level === 'mid' ? 'Tiempo medio' : 'Últimos minutos',
        hint: `Finaliza a las ${formatTime(session.endsAt)} hrs`,
      };
    }
    return {
      title: 'HORARIO FINALIZADO',
      main: '00:00',
      sub: '00s',
      fraction: 0,
      level: 'done',
      label: 'Pendiente de cierre',
      hint: `Terminó a las ${formatTime(session.endsAt)} hrs. Ahora corresponde declarar el resultado.`,
    };
  }
  return null;
}

type Props = { session: Session; now: string };

/** Tarjeta "Tiempo restante": anillo con cuenta regresiva que avanza cada segundo. */
export function SessionTimerCard({ session, now }: Props) {
  const ui = useUI();
  const [tick, setTick] = useState(0);

  // El reloj simulado de la app cambia con cada acción: se reinicia el conteo local.
  useEffect(() => {
    setTick(0);
  }, [now, session.status]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const view = computeTimer(session, Date.parse(now) + tick * 1000);
  if (!view) return null;

  const colors: Record<Level, string> = { ok: ui.cyan, mid: '#F59E0B', low: '#EF4444', done: '#94A3B8' };
  const color = colors[view.level];

  return (
    <Card style={styles.card}>
      <Txt variant="caption" color="muted" style={styles.title}>
        {view.title}
      </Txt>
      <View style={styles.row}>
        <TimerRing progress={view.fraction} color={color} trackColor={ui.border}>
          <Txt variant="h1" style={styles.main} accessibilityLabel={`${view.main} ${view.sub}`}>
            {view.main}
          </Txt>
          <Txt variant="caption" color="muted">
            {view.sub}
          </Txt>
        </TimerRing>

        <View style={styles.info}>
          <View style={styles.levelRow}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Txt variant="label">{view.label}</Txt>
          </View>
          <Txt variant="small" color="muted">
            {view.hint}
          </Txt>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'stretch', gap: 14 },
  title: { textAlign: 'center', letterSpacing: 1.4, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  main: { fontSize: 26, lineHeight: 30 },
  info: { flex: 1, gap: 6, maxWidth: 190 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
