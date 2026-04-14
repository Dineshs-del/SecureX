import { CryptoService } from '../theme/crypto/CryptoService';
import { MasterPasswordManager } from '../theme/database/MasterPasswordManager';

/**
 * Helper to get the current vault encryption key.
 * Throws if the vault is currently locked.
 */
export const getVaultKey = (): string => {
  const vKey = MasterPasswordManager.getVaultKey();
  if (!vKey) {
    throw new Error('Vault is currently locked. Cannot perform cryptographic operations.');
  }
  return vKey;
};

/**
 * Encrypts a plaintext string value using AES-256 with the active vault key.
 */
export const encryptData = (plaintext: string): string => {
  if (!plaintext) return '';
  return CryptoService.encryptStringWithKey(plaintext, getVaultKey());
};

/**
 * Decrypts an encrypted string value using AES-256 with the active vault key.
 * Returns empty string if decryption fails or data is invalid.
 */
export const decryptData = (encryptedStr: string): string => {
  if (!encryptedStr || !encryptedStr.startsWith('{')) return encryptedStr; // Return raw if it doesn't look like our JSON ciphertext block
  return CryptoService.decryptStringWithKey(encryptedStr, getVaultKey()) || '';
};
