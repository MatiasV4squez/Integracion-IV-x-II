import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { NoticeBanner } from '@/components/notice-banner';
import { ScreenContainer } from '@/components/screen-container';
import { TextField } from '@/components/text-field';
import { Txt } from '@/components/txt';
import { useAuth } from '@/hooks/use-auth';

/** Login de demo: sin backend, cualquier correo/contraseña no vacíos entra como @/mocks/sessions ME. */
export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('alumno.demo@uct.cl');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!email.trim() || !password.trim()) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }
    setError(null);
    login();
    router.replace('/');
  };

  return (
    <ScreenContainer scroll={false}>
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

          <TextField
            label="Correo institucional"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="nombre.apellido@uct.cl"
          />
          <TextField
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />

          {error ? <NoticeBanner tone="danger" message={error} /> : null}

          <AppButton label="Iniciar sesión" onPress={submit} />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: 32 },
  brand: { alignItems: 'center', gap: 6 },
  logo: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#06B6D4' },
  logoText: { color: '#0B1F3A' },
  form: { gap: 12 },
});
