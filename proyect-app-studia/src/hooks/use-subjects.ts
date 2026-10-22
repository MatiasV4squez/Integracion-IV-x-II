import { useEffect, useState } from 'react';

import { SUBJECTS } from '@/mocks/subjects';
import { catalogService } from '@/services';
import type { SubjectDetail } from '@/types/session';

/** Catálogo de materias con caché local. Muestra los datos de ejemplo mientras carga, así la pantalla nunca queda vacía. */
export function useSubjects(): { subjects: SubjectDetail[]; fromCache: boolean | null } {
  const [state, setState] = useState<{ subjects: SubjectDetail[]; fromCache: boolean | null }>({ subjects: SUBJECTS, fromCache: null });

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
