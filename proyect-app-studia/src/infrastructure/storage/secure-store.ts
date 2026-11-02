import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { asyncStorageAdapter } from '@/infrastructure/storage/async-storage';
import type { KeyValueStorage } from '@/application/ports/storage';

/**
 * Almacenamiento seguro para el token (NFR16): Keychain en iOS y Keystore en Android.
 * En la web no existe, así que se usa AsyncStorage (solo para desarrollo).
 */
export const secureStoreAdapter: KeyValueStorage =
  Platform.OS === 'web'
    ? asyncStorageAdapter
    : {
        getItem: (key) => SecureStore.getItemAsync(key),
        setItem: (key, value) => SecureStore.setItemAsync(key, value),
        removeItem: (key) => SecureStore.deleteItemAsync(key),
      };
