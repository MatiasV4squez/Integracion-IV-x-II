import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { RADIUS } from '@/constants/ui';
import { useUI } from '@/hooks/use-ui';
import type { Material, MaterialKind } from '@/types/session';

const KIND: Record<MaterialKind, { icon: string; label: string }> = {
  guia: { icon: '📘', label: 'Guía' },
  ejercicios: { icon: '📝', label: 'Ejercicios' },
  apuntes: { icon: '📎', label: 'Apuntes' },
};

export const MATERIAL_KINDS = (Object.keys(KIND) as MaterialKind[]).map((key) => ({ key, ...KIND[key] }));

export function MaterialItem({ material, onPress }: { material: Material; onPress?: () => void }) {
  const ui = useUI();
  const kind = KIND[material.kind];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: ui.surfaceAlt, opacity: pressed ? 0.85 : 1 }]}>
      <View style={[styles.icon, { backgroundColor: ui.primarySoft }]}>
        <Txt style={styles.iconText}>{kind.icon}</Txt>
      </View>
      <View style={styles.text}>
        <Txt variant="label" numberOfLines={1}>
          {material.title}
        </Txt>
        <Txt variant="caption" color="muted" numberOfLines={1}>
          {kind.label} · {material.meta} · {material.uploadedBy}
        </Txt>
      </View>
      <Txt variant="label" color="primary">
        Abrir
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: RADIUS.md },
  icon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 18, lineHeight: 24 },
  text: { flex: 1 },
});
