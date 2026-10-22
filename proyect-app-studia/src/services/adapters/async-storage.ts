import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KeyValueStorage } from '@/services/storage-service';

/** Preferencias y caché (datos no sensibles). */
export const asyncStorageAdapter: KeyValueStorage = AsyncStorage;
