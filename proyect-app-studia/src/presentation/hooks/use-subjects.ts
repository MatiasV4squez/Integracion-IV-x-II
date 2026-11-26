import { useEffect, useState } from 'react';

import { catalogService } from '@/di/container';
import type { SubjectDetail } from '@/domain/sesiones/session';

/** Catálogo de materias con caché local (demo o real, según `di/container`). */
export function useSubjects(): { subjects: SubjectDetail[]; fromCache: boolean | null } {
  const [state, setState] = useState<{ subjects: SubjectDetail[]; fromCache: boolean | null }>({ subjects: [], fromCache: null });

  useEffect(() => {
    let active = true;
    catalogService.getSubjects().then((result) => {
      if (active) setState({ subjects: result.data, fromCache: result.fromCache });
    });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
