// ─────────────────────────────────────────────────────────────────────────────
// VAULT IMPORT / EXPORT — SecureX
// Handles encrypted JSON backups (SecureX format) and plain CSV files
// (Chrome, Bitwarden, 1Password, generic).
// ─────────────────────────────────────────────────────────────────────────────

import { Alert, PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import DocumentPicker, { types } from 'react-native-document-picker';
import { parseCSV } from './csvParser';
import { normalizeRow, extractHostname } from './credentialNormalizer';
import { useVaultStore, VaultCredential } from '../store/vaultStore';
import { CryptoService, EncryptedData } from '../theme/crypto/CryptoService';
import { MasterPasswordManager } from '../theme/database/MasterPasswordManager';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** A normalized credential ready for preview / insertion */
export interface NormalizedItem {
  id?: string;
  name: string;
  url: string;
  androidPackage?: string;
  username: string;
  password: string;
  category: string;
  notes: string;
  totp: string;
}

export interface ImportResult {
  added: NormalizedItem[];
  skipped: number;
  total: number;
  type: 'CSV' | 'JSON';
}

/** Shape stored inside a SecureX backup JSON file */
interface SecureXBackupPayload {
  version: string;
  exportedAt: string;
  credentials: VaultCredential[];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function isSecureXEncryptedData(obj: unknown): obj is EncryptedData {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.ciphertext === 'string' &&
    typeof o.iv === 'string' &&
    typeof o.salt === 'string'
  );
}



/** Map raw CSV rows to NormalizedItems, auto-detecting Chrome / Bitwarden / 1Password / generic */
function csvRowsToItems(rows: Record<string, string>[]): NormalizedItem[] {
  if (rows.length === 0) return [];
  const items: NormalizedItem[] = [];

  for (const row of rows) {
    const getVal = (candidates: string[]): string => {
      for (const [k, v] of Object.entries(row)) {
        const cleanK = k.toLowerCase().trim().replace(/["\r]/g, '');
        for (const c of candidates) {
          if (cleanK === c.toLowerCase()) {
            if (v && typeof v === 'string' && v.trim()) return v.trim();
          }
        }
      }
      for (const [k, v] of Object.entries(row)) {
        const cleanK = k.toLowerCase().trim().replace(/["\r]/g, '');
        for (const c of candidates) {
          if (cleanK.includes(c.toLowerCase())) {
            if (v && typeof v === 'string' && v.trim()) return v.trim();
          }
        }
      }
      return '';
    };

    const name = getVal(['name', 'title', 'site', 'service', 'application', 'account']);
    const url = getVal(['url', 'login_uri', 'website', 'uri', 'login_url', 'web', 'link']);
    const username = getVal(['username', 'login_username', 'login', 'email', 'user']);
    const password = getVal(['password', 'login_password', 'pass', 'secret']);
    const notes = getVal(['note', 'notes', 'comment', 'comments']);
    const totp = getVal(['totp', 'otp', 'otpauth', 'one_time_password']);

    const norm = normalizeRow(name, url, username, password, notes);
    if (norm) {
      items.push({
        id: norm.id,
        name: norm.name,
        url: norm.url,
        androidPackage: norm.androidPackage,
        username: norm.username,
        password: norm.password,
        category: norm.category,
        notes: norm.notes,
        totp,
      });
    }
  }

  return items;
}

/** Filter out items that already exist in the vault (normalized host/package + username match) */
function deduplicateItems(items: NormalizedItem[]): {
  toAdd: NormalizedItem[];
  skipped: number;
} {
  const existing = useVaultStore.getState().credentials;
  const existingKeys = new Set(
    existing.map(c => {
      const host = c.androidPackage
        ? `pkg:${c.androidPackage.toLowerCase()}`
        : (c.url ? `host:${extractHostname(c.url)}` : `name:${c.name.toLowerCase().trim()}`);
      return `${host}::${(c.username || '').toLowerCase().trim()}`;
    })
  );

  const batchMap = new Map<string, NormalizedItem>();

  for (const item of items) {
    const host = item.androidPackage
      ? `pkg:${item.androidPackage.toLowerCase()}`
      : (item.url ? `host:${extractHostname(item.url)}` : `name:${item.name.toLowerCase().trim()}`);
    const key = `${host}::${(item.username || '').toLowerCase().trim()}`;

    if (existingKeys.has(key)) {
      continue;
    }

    if (batchMap.has(key)) {
      const current = batchMap.get(key)!;
      if (!current.password && item.password) {
        batchMap.set(key, item);
      }
    } else {
      batchMap.set(key, item);
    }
  }

  const toAdd = Array.from(batchMap.values());
  return { toAdd, skipped: items.length - toAdd.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

export const VaultImportExport = {
  // ────────────────────────────────────────────────────────────────────────
  // FILE PICKER
  // ────────────────────────────────────────────────────────────────────────
  pickImportFile: async (): Promise<{ uri: string; name: string } | null> => {
    try {
      const result = await DocumentPicker.pickSingle({
        type: [types.allFiles],
      });
      return {
        uri: result.uri,
        name: result.name ?? result.uri.split('/').pop() ?? 'backup',
      };
    } catch (err) {
      if (DocumentPicker.isCancel(err)) return null;
      throw err;
    }
  },

  // ────────────────────────────────────────────────────────────────────────
  // IMPORT
  // Returns a preview result — does NOT write to the vault yet.
  // Caller must call bulkAddCredentials(result.added) to confirm.
  // ────────────────────────────────────────────────────────────────────────
  importVault: async (
    fileUri: string,
    masterPassword?: string,
  ): Promise<ImportResult> => {
    // STEP 1 — Read file content
    const content = await RNFS.readFile(fileUri, 'utf8');

    if (!content || !content.trim()) {
      throw new Error('The selected file is empty.');
    }

    // STEP 2 — Detect format
    const filename = fileUri.split('/').pop()?.toLowerCase() ?? '';
    const isJsonExtension = filename.endsWith('.json');
    const isCsvExtension = filename.endsWith('.csv');
    const trimmedContent = content.trimStart();

    // Try to parse as SecureX JSON whenever content starts with '{' (Android content:// URIs often omit .json)
    if (isJsonExtension || trimmedContent.startsWith('{')) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new Error(
          'The selected file is not valid JSON.',
        );
      }

      if (isSecureXEncryptedData(parsed)) {
        // ── SecureX encrypted backup ──────────────────────────────────────
        if (!masterPassword || !masterPassword.trim()) {
          throw new Error(
            'A Master Password is required to import a SecureX backup.',
          );
        }

        const decryptedStr = CryptoService.decrypt(
          parsed as EncryptedData,
          masterPassword,
        );
        if (!decryptedStr) {
          throw new Error(
            'Incorrect Master Password — could not decrypt the backup.',
          );
        }

        let backupPayload: SecureXBackupPayload;
        try {
          backupPayload = JSON.parse(decryptedStr) as SecureXBackupPayload;
        } catch {
          throw new Error(
            'The backup file is corrupted and could not be read.',
          );
        }

        if (!Array.isArray(backupPayload.credentials)) {
          throw new Error(
            'The backup file does not contain a valid credentials list.',
          );
        }

        const items: NormalizedItem[] = backupPayload.credentials.map(c => ({
          id: c.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: c.name ?? 'Imported Entry',
          url: c.url ?? '',
          androidPackage: c.androidPackage,
          username: c.username ?? '',
          password: c.password ?? '',
          category: c.category ?? 'Web',
          notes: c.notes ?? '',
          totp: c.totp ?? '',
        }));

        const { toAdd, skipped } = deduplicateItems(items);
        return { added: toAdd, skipped, total: items.length, type: 'JSON' };
      } else {
        // JSON but not SecureX format
        throw new Error(
          'Unsupported JSON format. Please use a SecureX .json backup file.',
        );
      }
    }

    // CSV branch — csv extension OR first line has commas and isn't JSON
    const firstLine = trimmedContent.split('\n')[0] ?? '';
    const looksLikeCsv =
      isCsvExtension ||
      (firstLine.includes(',') && !trimmedContent.startsWith('{'));

    if (looksLikeCsv) {
      // ── CSV import ────────────────────────────────────────────────────
      const rows = parseCSV(content);
      if (rows.length === 0) {
        throw new Error(
          'The CSV file appears to be empty or has only headers.',
        );
      }
      const items = csvRowsToItems(rows);
      if (items.length === 0) {
        throw new Error(
          'No valid password entries were found in the CSV file.',
        );
      }
      const { toAdd, skipped } = deduplicateItems(items);
      return { added: toAdd, skipped, total: items.length, type: 'CSV' };
    }

    throw new Error(
      'Unsupported file format. Please use a .csv file or a SecureX .json backup.',
    );
  },

  // ────────────────────────────────────────────────────────────────────────
  // EXPORT
  // ────────────────────────────────────────────────────────────────────────
  exportVault: async (masterPassword: string): Promise<boolean> => {
    const timestamp = Date.now();
    const fileName = `SecureX_Backup_${timestamp}.json`;
    const srcPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
    const destPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;

    try {
      // 1. Storage Permission check (Android < 10)
      if (Platform.OS === 'android' && Number(Platform.Version) < 29) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'SecureX needs storage access to save your backup.',
            buttonPositive: 'Allow',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          throw new Error('Storage permission denied. Cannot save backup.');
        }
      }

      const credentials = useVaultStore.getState().credentials;

      const payload = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        credentials,
      };

      // 3. Encrypt data
      const encryptedData: EncryptedData = CryptoService.encrypt(
        JSON.stringify(payload),
        masterPassword,
      );

      // 4. Write temp file & Verify
      await RNFS.writeFile(srcPath, JSON.stringify(encryptedData), 'utf8');
      const fileExists = await RNFS.exists(srcPath);
      if (!fileExists) {
        throw new Error('Failed to create backup file in temporary storage.');
      }

      // 5. Copy to Downloads folder
      await RNFS.copyFile(srcPath, destPath);
      
      // 6. Cleanup temp file
      await RNFS.unlink(srcPath).catch(() => {});

      // 7. Notify user
      Alert.alert(
        'Export Successful',
        `✅ Backup saved to Downloads folder as:\n${fileName}`,
        [{ text: 'OK' }]
      );

      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[SecureX] Export error:', err);
      Alert.alert('Export Failed', msg || 'An unexpected error occurred.');
      
      // Cleanup temp file if exists
      try {
        if (await RNFS.exists(srcPath)) await RNFS.unlink(srcPath);
      } catch {}
      
      return false;
    }
  },

  // ────────────────────────────────────────────────────────────────────────
  // CLEAN EXISTING VAULT
  // Normalizes credentials, cleans URLs, android packages, removes duplicates,
  // and takes an encrypted backup first.
  // ────────────────────────────────────────────────────────────────────────
  cleanExistingVault: async (masterPassword: string): Promise<{
    success: boolean;
    normalizedCount: number;
    duplicatesRemoved: number;
    error?: string;
  }> => {
    try {
      // 1. Verify master password
      const isValid = await MasterPasswordManager.verifyMasterPassword(masterPassword);
      if (!isValid) {
        return { success: false, normalizedCount: 0, duplicatesRemoved: 0, error: 'Incorrect Master Password' };
      }

      // 2. Take encrypted backup first
      const backupOk = await VaultImportExport.exportVault(masterPassword);
      if (!backupOk) {
        return { success: false, normalizedCount: 0, duplicatesRemoved: 0, error: 'Encrypted backup failed. Aborting clean operation to protect your data.' };
      }

      // 3. Gather credentials and clean
      const currentCredentials = useVaultStore.getState().credentials;
      if (currentCredentials.length === 0) {
        return { success: true, normalizedCount: 0, duplicatesRemoved: 0 };
      }

      const uniqueMap = new Map<string, VaultCredential>();
      let duplicatesRemoved = 0;
      let normalizedCount = 0;

      for (const cred of currentCredentials) {
        const norm = normalizeRow(
          cred.name,
          cred.url,
          cred.username,
          cred.password,
          cred.notes,
          cred.category
        );

        if (!norm) continue;

        const hostKey = norm.androidPackage
          ? `pkg:${norm.androidPackage.toLowerCase()}`
          : (norm.url ? `host:${extractHostname(norm.url)}` : `name:${norm.name.toLowerCase().trim()}`);
        const userKey = (norm.username || '').toLowerCase().trim();
        const key = `${hostKey}::${userKey}`;

        const wasModified =
          cred.name !== norm.name ||
          cred.url !== norm.url ||
          cred.androidPackage !== norm.androidPackage;

        if (wasModified) {
          normalizedCount++;
        }

        if (uniqueMap.has(key)) {
          duplicatesRemoved++;
          const existing = uniqueMap.get(key)!;
          // Prefer entry with password or longer notes
          if (!existing.password && norm.password) {
            uniqueMap.set(key, {
              ...cred,
              name: norm.name,
              url: norm.url,
              androidPackage: norm.androidPackage,
              username: norm.username,
              password: norm.password,
              category: norm.category,
              notes: norm.notes,
            });
          }
        } else {
          uniqueMap.set(key, {
            ...cred,
            name: norm.name,
            url: norm.url,
            androidPackage: norm.androidPackage,
            username: norm.username,
            password: norm.password,
            category: norm.category,
            notes: norm.notes,
          });
        }
      }

      const cleanedList = Array.from(uniqueMap.values());
      const vKey = MasterPasswordManager.getVaultKey();
      const storageUpdated = cleanedList.map((c: any) => ({
        ...c,
        password: CryptoService.encryptedDataToString(CryptoService.encryptWithKey(c.password, vKey)),
      }));

      await AsyncStorage.setItem('securex_credentials', JSON.stringify(storageUpdated));
      await useVaultStore.getState().loadCredentials();

      return {
        success: true,
        normalizedCount,
        duplicatesRemoved,
      };
    } catch (e: any) {
      return {
        success: false,
        normalizedCount: 0,
        duplicatesRemoved: 0,
        error: e.message || 'Failed to clean vault',
      };
    }
  },
};
