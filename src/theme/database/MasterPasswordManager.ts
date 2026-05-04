import AsyncStorage from '@react-native-async-storage/async-storage';
import { CryptoService } from '../crypto/CryptoService';
import * as Keychain from 'react-native-keychain';

const KEYS = {
  MASTER_HASH: 'master_password_hash',
  SALT: 'master_salt',
  IS_SETUP: 'is_setup_complete',
  VAULT_KEY_ENCRYPTED: 'vault_key_encrypted',
};

// In-memory vault key — cleared when app backgrounds
let _vaultKeyCache: string | null = null;

export class MasterPasswordManager {
  static isVaultUnlocked(): boolean {
    return _vaultKeyCache !== null;
  }

  static getVaultKey(): string {
    if (!_vaultKeyCache) throw new Error('Vault is locked');
    return _vaultKeyCache;
  }

  static lockVault(): void {
    _vaultKeyCache = null;
  }

  static async isSetupComplete(): Promise<boolean> {
    const val = await AsyncStorage.getItem(KEYS.IS_SETUP);
    return val === 'true';
  }

  /**
   * First-time setup — creates salt, derives key, stores hash
   */
  static async setupMasterPassword(password: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (password.length < 8) return { success: false, error: 'Password must be at least 8 characters' };

      const salt = CryptoService.generateSalt();
      const vaultKey = CryptoService.deriveKey(password, salt);
      const masterHash = CryptoService.hashPassword(password, salt);

      await AsyncStorage.setItem(KEYS.SALT, salt);
      await AsyncStorage.setItem(KEYS.MASTER_HASH, masterHash);
      await AsyncStorage.setItem(KEYS.IS_SETUP, 'true');

      // Store vault key protected by biometrics/device passcode (optional).
      // Enables fingerprint unlock without typing master password.
      try {
        await Keychain.setGenericPassword('vault', vaultKey, {
          service: 'ai-password-manager-vault-key',
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
        });
      } catch {
        // Ignore: biometric storage not available.
      }

      // Cache vault key — user is now unlocked
      _vaultKeyCache = vaultKey;
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Unlock vault using biometrics (Keychain-protected vault key)
   */
  static async unlockWithBiometrics(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await Keychain.getGenericPassword({
        service: 'ai-password-manager-vault-key',
        authenticationPrompt: {
          title: 'Unlock Vault',
          subtitle: 'Authenticate to unlock your vault',
          description: 'Use fingerprint / face unlock',
        },
      });

      if (!result) {
        return { success: false, error: 'Biometric unlock is not set up yet' };
      }

      _vaultKeyCache = result.password;
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Biometric authentication failed' };
    }
  }

  /**
   * Unlock vault with master password
   */
  static async unlockVault(password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const salt = await AsyncStorage.getItem(KEYS.SALT);
    const storedHash = await AsyncStorage.getItem(KEYS.MASTER_HASH);
    if (salt === null || storedHash === null) {
      return { success: false, error: 'No master password set up' };
    }
    const inputHash = CryptoService.hashPassword(password, salt);
    if (inputHash !== storedHash) {
      return { success: false, error: 'Wrong password' };
    }
    const vaultKey = CryptoService.deriveKey(password, salt);
    _vaultKeyCache = vaultKey;

    // After a successful password unlock, (re)store the vault key in Keychain so
    // biometric unlock can work on next launches even for existing users.
    try {
      await Keychain.setGenericPassword('vault', vaultKey, {
        service: 'ai-password-manager-vault-key',
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
      });
    } catch {
      // Ignore: biometric storage not available.
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

  /**
   * Verify master password without changing app state
   */
  static async verifyMasterPassword(password: string): Promise<boolean> {
    try {
      const salt = await AsyncStorage.getItem(KEYS.SALT);
      const storedHash = await AsyncStorage.getItem(KEYS.MASTER_HASH);
      if (salt === null || storedHash === null) return false;
      return CryptoService.hashPassword(password, salt) === storedHash;
    } catch {
      return false;
    }
  }

  /**
   * Change master password
   */
  static async changeMasterPassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    const unlock = await this.unlockVault(currentPassword);
    if (!unlock.success) return { success: false, error: 'Current password is wrong' };
    return this.setupMasterPassword(newPassword);
  }
}