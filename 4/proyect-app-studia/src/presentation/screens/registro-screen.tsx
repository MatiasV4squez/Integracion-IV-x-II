import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AccessLayout } from '@/presentation/components/access-layout';
import { AppButton } from '@/presentation/components/app-button';
import { FormTextField } from '@/presentation/components/form-fields';
import { NoticeBanner } from '@/presentation/components/notice-banner';
import { useAuth } from '@/presentation/hooks/use-auth';
import { ROUTES } from '@/presentation/navigation/access';
import { registerSchema, type RegisterForm } from '@/presentation/schemas/auth-schemas';

type Step = { kind: 'form' } | { kind: 'sent'; email: string } | { kind: 'created'; email: string } | { kind: 'verified' };

/** CU-01 Registrar usuario: correo institucional (RF01), cuenta inactiva hasta verificar el correo (BR11). */
export default function RegistroScreen() {
  const router = useRouter();
  const { register, verifyEmail, resendVerification, verifiesByEmailLink } = useAuth();
  const [step, setStep] = useState<Step>({ kind: 'form' });
  const [serverError, setServerError] = useState<string | null>(null);
  const [linkNotice, setLinkNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
    reValidateMode: 'onChange',
  });

  const onSubmit = handleSubmit(async ({ name, email, password }) => {
    setServerError(null);
    const result = await register({ name, email, password });
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    if (!verifiesByEmailLink) {
      setStep({ kind: 'sent', email: result.data.email });
      return;
    }
    // Con backend la cuenta ya queda activa; el enlace de verificación se envía aparte.
    setStep({ kind: 'created', email: result.data.email });
    await sendLink(result.data.email);
  });

  const sendLink = async (email: string) => {
    const result = await resendVerification(email);
    setLinkNotice(
      result.ok
        ? { ok: true, text: `Te enviamos un enlace a ${email} para verificar tu correo.` }
        : { ok: false, text: `No pudimos enviar el enlace de verificación: ${result.message}` },
    );
  };

  const simulateVerification = async (email: string) => {
    const result = await verifyEmail(email);
    if (result.ok) setStep({ kind: 'verified' });
  };

  return (
    <AccessLayout
      title="Crea tu cuenta"
      description={verifiesByEmailLink ? 'Solo con tu correo de alumno (@alu.uct.cl).' : 'Solo con tu correo institucional (@alu.uct.cl o @uct.cl).'}
      activeTab="registro">
      {step.kind === 'form' ? (
        <View style={styles.form}>
          <FormTextField control={control} name="name" label="Nombre completo" autoCapitalize="words" placeholder="Nombre Apellido" />
          <FormTextField control={control} name="email" label="Correo institucional" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="nombre.apellido@alu.uct.cl" />
          <FormTextField control={control} name="password" label="Contraseña" secureTextEntry placeholder="Mínimo 8 caracteres, con letras y números" />
          <FormTextField control={control} name="confirmPassword" label="Repite la contraseña" secureTextEntry placeholder="••••••••" />

          {serverError ? <NoticeBanner tone="danger" message={serverError} /> : null}

          <AppButton label={isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'} disabled={isSubmitting} onPress={onSubmit} />
        </View>
      ) : null}

      {step.kind === 'sent' ? (
        <View style={styles.form}>
          <NoticeBanner tone="success" title="Cuenta creada" message={`Te enviamos un enlace de verificación a ${step.email}. Tu cuenta queda inactiva hasta que lo abras. (Simulado: aún no hay backend ni correo real.)`} />
          <AppButton label="Simular clic en el enlace de verificación" onPress={() => simulateVerification(step.email)} />
        </View>
      ) : null}

      {step.kind === 'created' ? (
        <View style={styles.form}>
          <NoticeBanner tone="success" title="Cuenta creada" message="Ya puedes iniciar sesión con tu correo y contraseña." />
          {linkNotice ? <NoticeBanner tone={linkNotice.ok ? 'info' : 'warning'} message={linkNotice.text} /> : null}
          <AppButton label="Ir a iniciar sesión" onPress={() => router.replace(ROUTES.login)} />
          <AppButton label="Reenviar enlace de verificación" variant="secondary" onPress={() => sendLink(step.email)} />
        </View>
      ) : null}

      {step.kind === 'verified' ? (
        <View style={styles.form}>
          <NoticeBanner tone="success" title="Correo verificado" message="Tu cuenta ya está activa. Ahora puedes iniciar sesión." />
          <AppButton label="Ir a iniciar sesión" onPress={() => router.replace(ROUTES.login)} />
        </View>
      ) : null}
    </AccessLayout>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  form: { gap: 12 },
  link: { alignItems: 'center', paddingVertical: 8 },
});
