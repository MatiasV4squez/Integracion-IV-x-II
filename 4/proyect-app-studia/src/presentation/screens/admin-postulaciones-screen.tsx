import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { isApiEnabled, useCases } from '@/di/container';
import { esNotaValida, type Postulacion } from '@/domain/postulaciones/postulacion';
import { AppButton } from '@/presentation/components/app-button';
import { Card } from '@/presentation/components/card';
import { EmptyState } from '@/presentation/components/empty-state';
import { ErrorState } from '@/presentation/components/error-state';
import { LoadingState } from '@/presentation/components/loading-state';
import { NoticeBanner } from '@/presentation/components/notice-banner';
import { ScreenContainer } from '@/presentation/components/screen-container';
import { SectionHeader } from '@/presentation/components/section-header';
import { ToneBadge } from '@/presentation/components/status-badge';
import { TextField } from '@/presentation/components/text-field';
import { Txt } from '@/presentation/components/txt';
import { useAsync } from '@/presentation/hooks/use-async';
import { formatDateTime } from '@/shared/format';

/** Administración: revisar postulaciones a tutor (aprobar con nota, rechazar con motivo, reintentar el rol). */
export default function AdminPostulacionesScreen() {
  const consulta = useAsync('postulaciones:pendientes', useCases.postulaciones.pendientes);
  const materias = useAsync('materias', useCases.tutorias.listarMaterias);
  const nombreMateria = useMemo(() => new Map((materias.data ?? []).map((m) => [m.id, `${m.code} · ${m.name}`])), [materias.data]);

  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [nota, setNota] = useState('');
  const [motivo, setMotivo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; text: string } | null>(null);

  const postulaciones = consulta.data?.postulaciones ?? [];
  const detalle = postulaciones.find((p) => p.idPostulacion === seleccionada);
  const nombreDe = (p: Postulacion) => consulta.data?.nombres.get(p.idUsuario) ?? `Usuario #${p.idUsuario}`;

  const abrir = (id: string) => {
    setSeleccionada((actual) => (actual === id ? null : id));
    setNota('');
    setMotivo('');
    setResultado(null);
  };

  const ejecutar = async (accion: () => Promise<Postulacion>, exito: (p: Postulacion) => string) => {
    if (ocupado) return;
    setOcupado(true);
    setResultado(null);
    try {
      const p = await accion();
      setResultado({ ok: true, text: exito(p) });
      setSeleccionada(null);
      consulta.refresh();
    } catch (e) {
      setResultado({ ok: false, text: e instanceof Error ? e.message : 'No se pudo completar la revisión.' });
    } finally {
      setOcupado(false);
    }
  };

  const aprobar = (p: Postulacion) => {
    const valor = Number(nota.replace(',', '.'));
    if (!esNotaValida(valor)) {
      setResultado({ ok: false, text: 'La nota acreditada debe estar entre 5,0 y 7,0, con un máximo de un decimal.' });
      return;
    }
    void ejecutar(
      () => useCases.postulaciones.aprobar(p.idPostulacion, valor),
      (r) =>
        r.estado === 'PENDIENTE_ROL'
          ? `Postulación aprobada, pero el rol Tutor aún no se asigna. Usa "Reintentar asignación".`
          : `${nombreDe(p)} quedó habilitado como tutor (nota ${valor.toFixed(1)}).`,
    );
  };

  const rechazar = (p: Postulacion) => {
    const texto = motivo.trim();
    if (texto.length < 3 || texto.length > 500) {
      setResultado({ ok: false, text: 'El motivo de rechazo debe contener entre 3 y 500 caracteres.' });
      return;
    }
    void ejecutar(() => useCases.postulaciones.rechazar(p.idPostulacion, texto), () => `Postulación de ${nombreDe(p)} rechazada.`);
  };

  const descargar = async (p: Postulacion) => {
    setOcupado(true);
    try {
      await useCases.postulaciones.descargarCertificado(p);
    } catch (e) {
      setResultado({ ok: false, text: e instanceof Error ? e.message : 'No se pudo descargar el certificado.' });
    } finally {
      setOcupado(false);
    }
  };

  return (
    <ScreenContainer topInset={false} refreshing={consulta.isRefreshing} onRefresh={consulta.refresh}>
      <View style={styles.gap4}>
        <Txt variant="h1">Postulaciones a tutor</Txt>
        <Txt variant="small" color="muted">
          Revisa el certificado, aprueba con la nota acreditada (5,0 a 7,0) o rechaza indicando el motivo.
        </Txt>
      </View>

      {resultado ? <NoticeBanner tone={resultado.ok ? 'success' : 'danger'} message={resultado.text} /> : null}

      <SectionHeader title={`Pendientes (${postulaciones.length})`} actionLabel="Actualizar" onAction={consulta.refresh} />
      {consulta.isLoading ? <LoadingState message="Cargando postulaciones…" /> : null}
      {consulta.error && !consulta.data ? <ErrorState message={consulta.error.message} onRetry={consulta.refresh} /> : null}
      {consulta.data && postulaciones.length === 0 ? (
        <EmptyState icon="✅" title="Sin pendientes" message="No hay postulaciones esperando revisión." />
      ) : null}

      {postulaciones.map((p) => {
        const abierta = p.idPostulacion === detalle?.idPostulacion;
        return (
          <Card key={p.idPostulacion} onPress={abierta ? undefined : () => abrir(p.idPostulacion)} accessibilityLabel={`Postulación de ${nombreDe(p)}`}>
            <View style={styles.between}>
              <View style={styles.flex}>
                <Txt variant="label">{nombreDe(p)}</Txt>
                <Txt variant="caption" color="muted">
                  {nombreMateria.get(p.idMateria) ?? `Materia #${p.idMateria}`} · {formatDateTime(p.fechaPostulacion)}
                </Txt>
              </View>
              <ToneBadge tone={p.estado === 'PENDIENTE_ROL' ? 'info' : 'warning'} label={p.estado === 'PENDIENTE_ROL' ? 'Falta asignar rol' : 'Pendiente'} />
            </View>

            {abierta ? (
              <View style={styles.gap8}>
                <Txt variant="small">Certificado: {p.certificadoNombre}</Txt>
                {isApiEnabled() ? (
                  <AppButton label="Ver certificado" variant="secondary" size="sm" disabled={ocupado} onPress={() => descargar(p)} />
                ) : null}

                {p.estado === 'PENDIENTE_ROL' ? (
                  <AppButton
                    label="Reintentar asignación del rol Tutor"
                    disabled={ocupado}
                    onPress={() => ejecutar(() => useCases.postulaciones.reintentarRol(p.idPostulacion), () => `${nombreDe(p)} quedó habilitado como tutor.`)}
                  />
                ) : (
                  <>
                    <TextField label="Nota acreditada" placeholder="Ej: 5,8" keyboardType="decimal-pad" value={nota} onChangeText={setNota} />
                    <AppButton label="Aprobar" disabled={ocupado || !nota.trim()} onPress={() => aprobar(p)} />
                    <TextField label="Motivo de rechazo" placeholder="Ej: El certificado no es legible" value={motivo} onChangeText={setMotivo} multiline />
                    <AppButton label="Rechazar" variant="danger" disabled={ocupado || !motivo.trim()} onPress={() => rechazar(p)} />
                  </>
                )}
                <AppButton label="Cerrar" variant="ghost" size="sm" onPress={() => abrir(p.idPostulacion)} />
              </View>
            ) : null}
          </Card>
        );
      })}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  gap4: { gap: 4 },
  gap8: { gap: 8, marginTop: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  flex: { flex: 1 },
});
