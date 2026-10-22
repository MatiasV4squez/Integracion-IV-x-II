import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { Card } from '@/components/card';
import { FormTextField } from '@/components/form-fields';
import { NoticeBanner } from '@/components/notice-banner';
import { ScreenContainer } from '@/components/screen-container';
import { Txt } from '@/components/txt';
import { useAuth } from '@/hooks/use-auth';
import { ROUTES } from '@/navigation/access';
import { loginSchema, type LoginForm } from '@/schemas/auth-schemas';

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
    defaultValues: { email: 'alumno.demo@uct.cl', password: 'demo1234' },
    reValidateMode: 'onChange',
  });

  const onSubmit = handleSubmit(async (values) => {
    const ok = await login(values);
    if (ok) router.replace(ROUTES.home);
  });

  return (
    <ScreenContainer>
      <View style={styles.center}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Txt variant="h1" style={styles.logoText}>
              S
            </Txt>
          </View>
          <Txt variant="h1">Studia</Txt>
          <Txt variant="small" color="muted">
            Tutorías entre pares
          </Txt>
        </View>

        <View style={styles.form}>
          <Txt variant="h2">Inicia sesión</Txt>

          {notice ? <NoticeBanner tone="warning" message={notice} /> : null}

          <FormTextField control={control} name="email" label="Correo institucional" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="nombre.apellido@alu.uct.cl" />
          <FormTextField control={control} name="password" label="Contraseña" secureTextEntry placeholder="••••••••" />

          {error ? <NoticeBanner tone="danger" message={error} /> : null}

          <AppButton label={isSubmitting ? 'Ingresando…' : 'Iniciar sesión'} disabled={isSubmitting} onPress={onSubmit} />

          <Pressable accessibilityRole="link" onPress={() => router.push(ROUTES.registro)} style={styles.link}>
            <Txt variant="label" color="primary">
              ¿No tienes cuenta? Regístrate
            </Txt>
          </Pressable>
        </View>

        <Card>
          <Txt variant="label">Cuentas de demostración</Txt>
          <Txt variant="caption" color="muted">
            alumno.demo@uct.cl / demo1234 (Tutee y Tutor){'\n'}nuevo.alumno@alu.uct.cl / nuevo1234 (solo Tutee){'\n'}suspendida@alu.uct.cl / susp1234 (cuenta suspendida)
          </Txt>
        </Card>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: 28 },
  brand: { alignItems: 'center', gap: 6 },
  logo: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#06B6D4' },
  logoText: { color: '#0B1F3A' },
  form: { gap: 12 },
  link: { alignItems: 'center', paddingVertical: 8 },
});
