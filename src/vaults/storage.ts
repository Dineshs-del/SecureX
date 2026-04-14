import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Generic Storage abstraction for persistent vault stores.
 * Assumes the data array has already been field-encrypted by the caller if needed,
 * enabling fast list rendering without decrypting every row in memory.
 */
export class VaultStorage {
  /**
   * Saves an array of items to device storage.
   */
  static async saveItems<T>(storeKey: string, items: T[]): Promise<void> {
    const serialized = JSON.stringify(items);
    await AsyncStorage.setItem(storeKey, serialized);
  }

  /**
   * Loads an array of items from device storage.
   */
  static async loadItems<T>(storeKey: string): Promise<T[]> {
    const data = await AsyncStorage.getItem(storeKey);
    if (!data) return [];

    try {
      return JSON.parse(data) as T[];
    } catch (error) {
      console.error(`[VaultStorage] Failed to parse store: ${storeKey}`, error);
      return [];
    }
  }

  /**
   * Clears a specific store from the device storage.
   */
  static async clearStore(storeKey: string): Promise<void> {
    await AsyncStorage.removeItem(storeKey);
  }
}
