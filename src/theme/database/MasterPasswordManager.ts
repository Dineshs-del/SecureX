import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';
import { CryptoService } from '../crypto/CryptoService';
import * as Keychain from 'react-native-keychain';

const KEYS = {
  MASTER_HASH: 'master_password_hash',
  SALT: 'master_salt',
  IS_SETUP: 'is_setup_complete',
  VAULT_KEY_ENCRYPTED: 'vault_key_encrypted',
};

export const MIN_MASTER_PASSWORD_LENGTH = 4;

// In-memory vault key — cleared when app locks or backgrounds
let _vaultKeyCache: string | null = null;

export class MasterPasswordManager {
  static isVaultUnlocked(): boolean {
    return _vaultKeyCache !== null;
  }

  static getVaultKey(): string {
    if (!_vaultKeyCache) throw new Error('Vault is locked');
    return _vaultKeyCache;
  }

  /**
   * Lock the in-app vault by clearing only the JS in-memory vault key.
   * NOTE: Does NOT wipe the AndroidKeyStore-wrapped Autofill key so Android Autofill
   * and Autosave continue to work (gated by BiometricPrompt fingerprint verification)
   * even while SecureX is locked or backgrounded.
   */
  static lockVault(): void {
    _vaultKeyCache = null;
  }

  /**
   * Permanently delete the AndroidKeyStore-wrapped Autofill key (used ONLY on Wipe Vault).
   */
  static clearAutofillKey(): void {
    try {
      NativeModules.AutofillModule?.clearVaultKey();
    } catch {}
  }

  static async isSetupComplete(): Promise<boolean> {
    const val = await AsyncStorage.getItem(KEYS.IS_SETUP);
    return val === 'true';
  }

  /**
   * First-time setup — creates salt, derives key, stores hash, wraps key for Autofill
   */
  static async setupMasterPassword(
    password: string,
    biometricEnabled: boolean = true
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (password.length < MIN_MASTER_PASSWORD_LENGTH) {
        return {
          success: false,
          error: `Password must be at least ${MIN_MASTER_PASSWORD_LENGTH} characters`,
        };
      }

      const salt = CryptoService.generateSalt();
      const vaultKey = CryptoService.deriveKey(password, salt);
      const masterHash = CryptoService.hashPassword(password, salt);

      await AsyncStorage.setItem(KEYS.SALT, salt);
      await AsyncStorage.setItem(KEYS.MASTER_HASH, masterHash);
      await AsyncStorage.setItem(KEYS.IS_SETUP, 'true');
      await AsyncStorage.setItem('securex_biometric_enabled', biometricEnabled ? 'true' : 'false');

      // Store vault key protected in Keychain requiring biometric prompt
      try {
        await Keychain.setGenericPassword('vault', vaultKey, {
          service: 'ai-password-manager-vault-key',
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          storage: Keychain.STORAGE_TYPE.RSA,
          securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
        });
      } catch (err) {
        console.warn('[SECUREX] Keychain setGenericPassword warning:', err);
      }

      // Cache vault key in memory and wrap it in AndroidKeyStore for Autofill & Autosave
      _vaultKeyCache = vaultKey;
      try {
        await NativeModules.AutofillModule?.storeWrappedVaultKey(vaultKey);
      } catch {}
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
          title: 'Unlock SecureX Vault',
          subtitle: 'Authenticate with Fingerprint / Biometrics',
          description: 'Confirm fingerprint to decrypt your vault',
          cancel: 'Use Master Password',
        },
      });

      if (!result || !result.password) {
        return { success: false, error: 'Biometric authentication cancelled or failed' };
      }

      _vaultKeyCache = result.password;
      try {
        await NativeModules.AutofillModule?.storeWrappedVaultKey(result.password);
      } catch {}
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
      try {
        await NativeModules.AutofillModule?.storeWrappedVaultKey(vaultKey);
      } catch {}

      // Refresh Keychain entry for biometric unlocks
      try {
        await Keychain.setGenericPassword('vault', vaultKey, {
          service: 'ai-password-manager-vault-key',
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          storage: Keychain.STORAGE_TYPE.RSA,
          securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
        });
      } catch (err) {
        console.warn('[SECUREX] Keychain update warning:', err);
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
   * Read current salt and hash snapshot (used for rollback if master password rotation fails)
   */
  static async getMasterAuthSnapshot(): Promise<{ salt: string | null; hash: string | null }> {
    const salt = await AsyncStorage.getItem(KEYS.SALT);
    const hash = await AsyncStorage.getItem(KEYS.MASTER_HASH);
    return { salt, hash };
  }

  /**
   * Restore master auth snapshot on rollback
   */
  static async restoreMasterAuthSnapshot(
    snapshot: { salt: string | null; hash: string | null },
    oldVaultKey: string
  ): Promise<void> {
    if (snapshot.salt !== null) await AsyncStorage.setItem(KEYS.SALT, snapshot.salt);
    if (snapshot.hash !== null) await AsyncStorage.setItem(KEYS.MASTER_HASH, snapshot.hash);
    _vaultKeyCache = oldVaultKey;
    try {
      await NativeModules.AutofillModule?.storeWrappedVaultKey(oldVaultKey);
    } catch {}
    try {
      await Keychain.setGenericPassword('vault', oldVaultKey, {
        service: 'ai-password-manager-vault-key',
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        storage: Keychain.STORAGE_TYPE.RSA,
        securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
      });
    } catch {}
  }

  /**
   * Rotate master password key material (caller must re-encrypt all stored credentials!)
   */
  static async rotateMasterKey(newPassword: string): Promise<{ success: boolean; newVaultKey?: string; error?: string }> {
    try {
      if (newPassword.length < MIN_MASTER_PASSWORD_LENGTH) {
        return {
          success: false,
          error: `Password must be at least ${MIN_MASTER_PASSWORD_LENGTH} characters`,
        };
      }

      const salt = CryptoService.generateSalt();
      const newVaultKey = CryptoService.deriveKey(newPassword, salt);
      const masterHash = CryptoService.hashPassword(newPassword, salt);

      await AsyncStorage.setItem(KEYS.SALT, salt);
      await AsyncStorage.setItem(KEYS.MASTER_HASH, masterHash);

      _vaultKeyCache = newVaultKey;

      try {
        await Keychain.setGenericPassword('vault', newVaultKey, {
          service: 'ai-password-manager-vault-key',
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          storage: Keychain.STORAGE_TYPE.RSA,
          securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
        });
      } catch (err) {
        console.warn('[SECUREX] Keychain rotation warning:', err);
      }

      try {
        await NativeModules.AutofillModule?.storeWrappedVaultKey(newVaultKey);
      } catch {}

      return { success: true, newVaultKey };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to rotate master key' };
    }
  }

  static async wipeAllData(): Promise<void> {
    this.lockVault();
    this.clearAutofillKey();
    await AsyncStorage.clear();
  }
}
