import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { isApiEnabled } from '@/di/container';
import type { AuthErrorCode } from '@/domain/auth/auth';
import { AccessLayout } from '@/presentation/components/access-layout';
import { AppButton } from '@/presentation/components/app-button';
import { NoticeBanner } from '@/presentation/components/notice-banner';
import { TextField } from '@/presentation/components/text-field';
import { Txt } from '@/presentation/components/txt';
import { useAuth } from '@/presentation/hooks/use-auth';
import { ROUTES } from '@/presentation/navigation/access';

type Resultado = { ok: boolean; title: string; text: string };

/** Mensajes según el resultado de confirmar el correo. */
function resultadoDeError(error: AuthErrorCode, message: string): Resultado {
  if (error === 'TOKEN_INVALID') return { ok: false, title: 'Enlace no válido', text: 'El enlace de verificación no es válido. Pide uno nuevo.' };
  if (error === 'TOKEN_USED') return { ok: false, title: 'Enlace ya utilizado', text: 'Este enlace ya se usó o tu correo ya estaba verificado.' };
  if (error === 'TOKEN_EXPIRED') return { ok: false, title: 'Enlace vencido', text: 'El enlace expiró. Pide uno nuevo con tu correo.' };
  return { ok: false, title: 'No se pudo verificar', text: message };
}

/**
 * Verificación del correo institucional (RF01, BR11): confirma con el token del enlace que llega por
 * correo, o pide un enlace nuevo. Abrir la pantalla no consume el token: hay que pulsar Confirmar.
 */
export default function VerificarCuentaScreen({ token: tokenInicial }: { token?: string }) {
  const router = useRouter();
  const { isAuthenticated, resendVerification, confirmEmail } = useAuth();
  const [token, setToken] = useState(tokenInicial ?? '');
  const [correo, setCorreo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const confirmar = async () => {
    setOcupado(true);
    setResultado(null);
    const res = await confirmEmail(token);
    setResultado(res.ok ? { ok: true, title: 'Correo verificado', text: 'Tu correo institucional quedó verificado.' } : resultadoDeError(res.error, res.message));
    setOcupado(false);
  };

  const pedirEnlace = async () => {
    setOcupado(true);
    setResultado(null);
    const res = await resendVerification(correo);
    setOcupado(false);
    setResultado(
      res.ok
        ? { ok: true, title: 'Solicitud enviada', text: 'Si la cuenta existe y no está verificada, te llegará un nuevo enlace. Abre el más reciente.' }
        : { ok: false, title: 'No se pudo enviar', text: res.message },
    );
  };

  return (
    <AccessLayout title="Verificar correo" description="Confirma tu correo institucional con el enlace que te enviamos.">
      {!isApiEnabled() ? <NoticeBanner tone="info" message="La verificación por enlace solo existe con el backend conectado." /> : null}
      {resultado ? <NoticeBanner tone={resultado.ok ? 'success' : 'danger'} title={resultado.title} message={resultado.text} /> : null}

      <View style={styles.gap12}>
        <TextField label="Código del enlace" placeholder="Se completa solo al abrir el enlace" autoCapitalize="none" autoCorrect={false} value={token} onChangeText={setToken} />
        <AppButton label={ocupado ? 'Confirmando…' : 'Confirmar correo'} disabled={ocupado || token.trim().length !== 64} onPress={confirmar} />
      </View>

      <View style={styles.gap12}>
        <Txt variant="h3">¿El enlace venció o no llegó?</Txt>
        <TextField label="Correo institucional" placeholder="nombre.apellido@alu.uct.cl" autoCapitalize="none" keyboardType="email-address" value={correo} onChangeText={setCorreo} />
        <AppButton label="Solicitar nuevo enlace" variant="secondary" disabled={ocupado || !correo.trim()} onPress={pedirEnlace} />
      </View>

      <AppButton label={isAuthenticated ? 'Volver al inicio' : 'Ir a iniciar sesión'} variant="ghost" onPress={() => router.replace(isAuthenticated ? ROUTES.home : ROUTES.login)} />
    </AccessLayout>
  );
}

const styles = StyleSheet.create({
  gap12: { gap: 12 },
});
