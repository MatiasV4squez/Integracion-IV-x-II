import * as DocumentPicker from 'expo-document-picker';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { isApiEnabled, useCases } from '@/di/container';
import {
  DESCRIPCION_ESTADO_POSTULACION,
  ESTADOS_POSTULACION_ACTIVA,
  validarCertificado,
  type Certificado,
  type Postulacion,
} from '@/domain/postulaciones/postulacion';
import { AppButton } from '@/presentation/components/app-button';
import { Card } from '@/presentation/components/card';
import { EmptyState } from '@/presentation/components/empty-state';
import { ErrorState } from '@/presentation/components/error-state';
import { FilterChip } from '@/presentation/components/filter-chip';
import { LoadingState } from '@/presentation/components/loading-state';
import { NoticeBanner } from '@/presentation/components/notice-banner';
import { ScreenContainer } from '@/presentation/components/screen-container';
import { SectionHeader } from '@/presentation/components/section-header';
import { ToneBadge } from '@/presentation/components/status-badge';
import type { Tone } from '@/presentation/constants/tones';
import { Txt } from '@/presentation/components/txt';
import { useAsync } from '@/presentation/hooks/use-async';
import { formatDate } from '@/shared/format';

const TONO_ESTADO: Record<Postulacion['estado'], Tone> = { PENDIENTE: 'warning', PENDIENTE_ROL: 'info', APROBADA: 'success', RECHAZADA: 'danger' };

const tamano = (bytes?: number) =>
  bytes === undefined ? '' : bytes < 1_000_000 ? `${Math.max(1, Math.round(bytes / 1000))} KB` : `${(bytes / 1_000_000).toFixed(1).replace('.', ',')} MB`;

/** CU "Postular como tutor": materia + certificado de notas (PDF o PNG, máx. 5 MB) y el estado de cada postulación. */
export default function PostulacionTutorScreen() {
  const materias = useAsync('materias', useCases.tutorias.listarMaterias);
  const historial = useAsync('postulaciones:mias', useCases.postulaciones.mias);

  const [idMateria, setIdMateria] = useState<string | null>(null);
  const [certificado, setCertificado] = useState<Certificado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [descargando, setDescargando] = useState<string | null>(null);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  const nombres = useMemo(() => new Map((materias.data ?? []).map((m) => [m.id, m.name])), [materias.data]);
  const disponibles = useMemo(() => {
    const activas = new Set((historial.data ?? []).filter((p) => ESTADOS_POSTULACION_ACTIVA.includes(p.estado)).map((p) => p.idMateria));
    return (materias.data ?? []).filter((m) => !activas.has(m.id));
  }, [materias.data, historial.data]);

  const elegirArchivo = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/png'], copyToCacheDirectory: true, multiple: false });
    if (res.canceled) return;
    const asset = res.assets[0];
    const elegido: Certificado = { uri: asset.uri, name: asset.name, size: asset.size, mimeType: asset.mimeType, file: asset.file };
    setCertificado(elegido);
    setError(validarCertificado(elegido));
  };

  const enviar = async () => {
    if (enviando) return;
    const problema = !idMateria ? 'Selecciona la materia a la que postulas.' : validarCertificado(certificado);
    setError(problema);
    if (problema || !idMateria || !certificado) return;
    setEnviando(true);
    setAviso(null);
    try {
      const postulacion = await useCases.postulaciones.postular(idMateria, certificado);
      setAviso(`Tu postulación a ${nombres.get(postulacion.idMateria) ?? 'la materia'} quedó registrada: ${DESCRIPCION_ESTADO_POSTULACION[postulacion.estado].etiqueta}.`);
      setIdMateria(null);
      setCertificado(null);
      historial.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar la postulación.');
    } finally {
      setEnviando(false);
    }
  };

  const descargar = async (p: Postulacion) => {
    if (descargando) return;
    setDescargando(p.idPostulacion);
    setErrorDescarga(null);
    try {
      await useCases.postulaciones.descargarCertificado(p);
    } catch (e) {
      setErrorDescarga(e instanceof Error ? e.message : 'No se pudo descargar el certificado.');
    } finally {
      setDescargando(null);
    }
  };

  return (
    <ScreenContainer topInset={false} refreshing={historial.isRefreshing} onRefresh={historial.refresh}>
      <View style={styles.gap4}>
        <Txt variant="h1">Postular como tutor</Txt>
        <Txt variant="small" color="muted">
          Elige una materia que hayas aprobado y adjunta tu certificado. La administración revisará tu nota antes de habilitarte como tutor.
        </Txt>
      </View>

      <SectionHeader title="Nueva postulación" />
      {aviso ? <NoticeBanner tone="success" title="Postulación enviada" message={aviso} /> : null}
      {materias.isLoading ? <LoadingState message="Cargando materias…" /> : null}
      {materias.error ? <ErrorState message={materias.error.message} onRetry={materias.refresh} /> : null}
      {materias.data && disponibles.length === 0 ? (
        <Txt variant="small" color="muted">
          {materias.data.length === 0 ? 'Todavía no hay materias disponibles para postular.' : 'Ya tienes una postulación activa o aprobada en todas las materias.'}
        </Txt>
      ) : null}
      {materias.data && disponibles.length > 0 ? (
        <Card>
          <Txt variant="label">Materia</Txt>
          <View style={styles.wrapRow}>
            {disponibles.map((m) => (
              <FilterChip key={m.id} label={`${m.code} · ${m.name}`} selected={idMateria === m.id} onPress={() => setIdMateria(m.id)} />
            ))}
          </View>

          <Txt variant="label">Certificado de notas</Txt>
          {certificado ? (
            <View style={styles.between}>
              <Txt variant="small" style={styles.flex}>
                {certificado.name}
                {certificado.size !== undefined ? ` · ${tamano(certificado.size)}` : ''}
              </Txt>
              <AppButton label="Quitar" size="sm" variant="secondary" disabled={enviando} onPress={() => setCertificado(null)} />
            </View>
          ) : (
            <AppButton label="Elegir archivo (PDF o PNG)" variant="secondary" disabled={enviando} onPress={elegirArchivo} />
          )}
          <Txt variant="caption" color="muted">
            Debe verse tu nota en la materia. Formato PDF o PNG, máximo 5 MB.
          </Txt>

          {error ? <NoticeBanner tone="danger" message={error} /> : null}
          <AppButton label={enviando ? 'Subiendo certificado…' : 'Enviar postulación'} disabled={enviando} onPress={enviar} />
        </Card>
      ) : null}

      <SectionHeader title="Mis postulaciones" actionLabel="Actualizar" onAction={historial.refresh} />
      {historial.isLoading ? <LoadingState message="Cargando tus postulaciones…" /> : null}
      {historial.error && !historial.data ? <ErrorState message={historial.error.message} onRetry={historial.refresh} /> : null}
      {historial.data && historial.data.length === 0 ? (
        <EmptyState icon="📝" title="Aún no has postulado" message="Tus postulaciones y su estado aparecerán aquí." />
      ) : null}
      {errorDescarga ? <NoticeBanner tone="danger" message={errorDescarga} /> : null}
      {(historial.data ?? []).map((p) => {
        const descripcion = DESCRIPCION_ESTADO_POSTULACION[p.estado];
        return (
          <Card key={p.idPostulacion}>
            <View style={styles.between}>
              <Txt variant="label" style={styles.flex}>
                {nombres.get(p.idMateria) ?? `Materia #${p.idMateria}`}
              </Txt>
              <ToneBadge tone={TONO_ESTADO[p.estado]} label={descripcion.etiqueta} />
            </View>
            <Txt variant="caption" color="muted">
              Enviada el {formatDate(p.fechaPostulacion)}
              {p.fechaRevision ? ` · Revisada el ${formatDate(p.fechaRevision)}` : ''}
            </Txt>
            <Txt variant="small">
              {descripcion.detalle}
              {p.notaAcreditada !== null ? ` Nota acreditada: ${p.notaAcreditada.toFixed(1)}.` : ''}
              {p.motivoRechazo ? ` Motivo: ${p.motivoRechazo}` : ''}
            </Txt>
            <View style={styles.between}>
              <Txt variant="caption" color="muted" style={styles.flex}>
                Certificado: {p.certificadoNombre}
              </Txt>
              {/* Sin backend el certificado no se sube a ninguna parte. */}
              {isApiEnabled() ? (
                <AppButton
                  label={descargando === p.idPostulacion ? 'Descargando…' : 'Ver certificado'}
                  size="sm"
                  variant="secondary"
                  disabled={descargando !== null}
                  onPress={() => descargar(p)}
                />
              ) : null}
            </View>
          </Card>
        );
      })}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  gap4: { gap: 4 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  flex: { flex: 1 },
});
