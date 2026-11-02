import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KeyValueStorage } from '@/application/ports/storage';

/** Preferencias y caché (datos no sensibles). */
export const asyncStorageAdapter: KeyValueStorage = AsyncStorage;
