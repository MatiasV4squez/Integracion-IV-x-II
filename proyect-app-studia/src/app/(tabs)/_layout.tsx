import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTutorMode } from '@/hooks/use-tutor-mode';

type IconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(active: IconName, inactive: IconName) {
  return ({ focused, color }: { focused: boolean; color: ColorValue }) => (
    <Ionicons name={focused ? active : inactive} size={26} color={color} />
  );
}

export default function TabsLayout() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { isTutor } = useTutorMode();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 68 + insets.bottom,
          paddingTop: 8,
        },
        tabBarLabel: ({ focused, color, children }) => (
          <View style={styles.labelContainer}>
            <Text style={[styles.label, { color }]}>{children}</Text>
            <View
              style={[
                styles.dot,
                { backgroundColor: focused ? colors.primary : 'transparent' },
              ]}
            />
          </View>
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Inicio', tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="buscar"
        options={{
          title: 'Buscar',
          tabBarIcon: tabIcon('search', 'search-outline'),
          href: isTutor ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="historial"
        options={{ title: 'Historial', tabBarIcon: tabIcon('calendar', 'calendar-outline') }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: 'Perfil', tabBarIcon: tabIcon('person', 'person-outline') }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  labelContainer: { alignItems: 'center' },
  label: { fontSize: 12, fontWeight: '600' },
  dot: { width: 5, height: 5, borderRadius: Radius.full, marginTop: 3 },
});
