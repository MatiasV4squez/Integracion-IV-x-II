import { Redirect } from 'expo-router';

/** Pantalla inicial temporal: abre el Historial. Reemplazar cuando exista el flujo de login/home. */
export default function Index() {
  return <Redirect href="/historial" />;
}
