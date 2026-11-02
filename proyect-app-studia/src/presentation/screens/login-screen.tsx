import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { isApiEnabled } from '@/di/container';
import { AccessLayout } from '@/presentation/components/access-layout';
import { AppButton } from '@/presentation/components/app-button';
import { Card } from '@/presentation/components/card';
import { FormTextField } from '@/presentation/components/form-fields';
import { NoticeBanner } from '@/presentation/components/notice-banner';
import { Txt } from '@/presentation/components/txt';
import { useAuth } from '@/presentation/hooks/use-auth';
import { ROUTES } from '@/presentation/navigation/access';
import { loginSchema, type LoginForm } from '@/presentation/schemas/auth-schemas';

/** Inicio de sesión: valida el formulario (zod) y autentica con el servicio de sesión. */
export default function LoginScreen() {
  const router = useRouter();
  const { login, error, notice } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    // Con backend se parte vacío; en la demo, con una cuenta de ejemplo.
    defaultValues: isApiEnabled() ? { email: '', password: '' } : { email: 'alumno.demo@uct.cl', password: 'demo1234' },
    reValidateMode: 'onChange',
  });

  const onSubmit = handleSubmit(async (values) => {
    const ok = await login(values);
    if (ok) router.replace(ROUTES.home);
  });

  return (
    <AccessLayout title="Bienvenido de vuelta" description="Ingresa con tu correo institucional para continuar." activeTab="login">
      <View style={styles.form}>
        {notice ? <NoticeBanner tone="warning" message={notice} /> : null}

        <FormTextField control={control} name="email" label="Correo institucional" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="nombre.apellido@alu.uct.cl" />
        <FormTextField control={control} name="password" label="Contraseña" secureTextEntry placeholder="••••••••" />

        {error ? <NoticeBanner tone="danger" message={error} /> : null}

        <AppButton label={isSubmitting ? 'Ingresando…' : 'Iniciar sesión'} disabled={isSubmitting} onPress={onSubmit} />
      </View>

      {isApiEnabled() ? null : (
        <Card>
          <Txt variant="label">Cuentas de demostración</Txt>
          <Txt variant="caption" color="muted">
            alumno.demo@uct.cl / demo1234 (Tutee y Tutor){'\n'}nuevo.alumno@alu.uct.cl / nuevo1234 (solo Tutee){'\n'}suspendida@alu.uct.cl / susp1234 (cuenta suspendida)
          </Txt>
        </Card>
      )}
    </AccessLayout>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
});
