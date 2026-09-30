import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

const N = 25;

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Código de sesión visible bajo el QR, estable para una misma sesión. */
export function sessionCode(sessionId: string, year = 2026): string {
  return `STD-${year}-${sessionId.toUpperCase()}-${hash(sessionId).toString(16).toUpperCase().slice(0, 5)}`;
}

/** Matriz 25x25 con las tres esquinas de posicionamiento y módulos determinísticos según la semilla. */
export function buildMatrix(seed: string): boolean[][] {
  const rand = rng(hash(seed));
  const m: boolean[][] = Array.from({ length: N }, () => Array<boolean>(N).fill(false));
  const fixed: boolean[][] = Array.from({ length: N }, () => Array<boolean>(N).fill(false));

  const finder = (r0: number, c0: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = r0 + r;
        const cc = c0 + c;
        if (rr < 0 || cc < 0 || rr >= N || cc >= N) continue;
        fixed[rr][cc] = true;
        const inside = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        const ring = r === 0 || r === 6 || c === 0 || c === 6;
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        m[rr][cc] = inside && (ring || core);
      }
    }
  };
  finder(0, 0);
  finder(0, N - 7);
  finder(N - 7, 0);

  for (let i = 8; i < N - 8; i++) {
    fixed[6][i] = fixed[i][6] = true;
    m[6][i] = m[i][6] = i % 2 === 0;
  }
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!fixed[r][c]) m[r][c] = rand() < 0.48;
  return m;
}

type Props = { seed: string; size?: number; color: string };

/**
 * Representación visual de un QR (DEMO: no es escaneable). En la versión final el backend
 * entrega el contenido real y se reemplaza por una librería de QR.
 */
export function PseudoQr({ seed, size = 190, color }: Props) {
  const cell = Math.floor(size / N);
  const side = cell * N;
  const rows = useMemo(() => {
    const matrix = buildMatrix(seed);
    return matrix.map((row) => {
      const runs: { start: number; len: number }[] = [];
      let c = 0;
      while (c < N) {
        if (!row[c]) {
          c++;
          continue;
        }
        let end = c;
        while (end + 1 < N && row[end + 1]) end++;
        runs.push({ start: c, len: end - c + 1 });
        c = end + 1;
      }
      return runs;
    });
  }, [seed]);

  return (
    <View accessible accessibilityLabel="Código QR de asistencia (demostración)" style={{ width: side, height: side }}>
      {rows.map((runs, r) => (
        <View key={r} style={{ height: cell, width: side }}>
          {runs.map((run) => (
            <View key={run.start} style={[styles.run, { left: run.start * cell, width: run.len * cell, height: cell, backgroundColor: color }]} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ run: { position: 'absolute', top: 0 } });
