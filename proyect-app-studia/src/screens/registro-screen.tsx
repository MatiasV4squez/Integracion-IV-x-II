import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { FormTextField } from '@/components/form-fields';
import { NoticeBanner } from '@/components/notice-banner';
import { ScreenContainer } from '@/components/screen-container';
import { Txt } from '@/components/txt';
import { useAuth } from '@/hooks/use-auth';
import { ROUTES } from '@/navigation/access';
import { registerSchema, type RegisterForm } from '@/schemas/auth-schemas';

type Step = { kind: 'form' } | { kind: 'sent'; email: string } | { kind: 'verified' };

/** CU-01 Registrar usuario: correo institucional (RF01), cuenta inactiva hasta verificar el correo (BR11). */
export default function RegistroScreen() {
  const router = useRouter();
  const { register, verifyEmail } = useAuth();
  const [step, setStep] = useState<Step>({ kind: 'form' });
  const [serverError, setServerError] = useState<string | null>(null);

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
    if (result.ok) setStep({ kind: 'sent', email: result.data.email });
    else setServerError(result.message);
  });

  const simulateVerification = async (email: string) => {
    const result = await verifyEmail(email);
    if (result.ok) setStep({ kind: 'verified' });
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Txt variant="h1">Crear cuenta</Txt>
        <Txt variant="small" color="muted">
          Solo con tu correo institucional (@alu.uct.cl o @uct.cl).
        </Txt>
      </View>

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

      {step.kind === 'verified' ? (
        <View style={styles.form}>
          <NoticeBanner tone="success" title="Correo verificado" message="Tu cuenta ya está activa. Ahora puedes iniciar sesión." />
          <AppButton label="Ir a iniciar sesión" onPress={() => router.replace(ROUTES.login)} />
        </View>
      ) : null}

      <Pressable accessibilityRole="link" onPress={() => router.replace(ROUTES.login)} style={styles.link}>
        <Txt variant="label" color="primary">
          Volver a iniciar sesión
        </Txt>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  form: { gap: 12 },
  link: { alignItems: 'center', paddingVertical: 8 },
});
