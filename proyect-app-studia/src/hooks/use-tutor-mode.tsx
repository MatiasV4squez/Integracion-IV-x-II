import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type TutorModeContextValue = {
  isTutor: boolean;
  setIsTutor: (value: boolean) => void;
};

const TutorModeContext = createContext<TutorModeContextValue | null>(null);

export function TutorModeProvider({ children }: { children: ReactNode }) {
  const [isTutor, setIsTutor] = useState(false);
  const value = useMemo(() => ({ isTutor, setIsTutor }), [isTutor]);

  return <TutorModeContext.Provider value={value}>{children}</TutorModeContext.Provider>;
}

export function useTutorMode() {
  const context = useContext(TutorModeContext);
  if (!context) {
    throw new Error('useTutorMode must be used within a TutorModeProvider');
  }
  return context;
}
