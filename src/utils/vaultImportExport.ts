// ─────────────────────────────────────────────────────────────────────────────
// VAULT IMPORT / EXPORT — SecureX
// Handles encrypted JSON backups (SecureX format) and plain CSV files
// (Chrome, Bitwarden, 1Password, generic).
// ─────────────────────────────────────────────────────────────────────────────

import { Alert, Share, PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import DocumentPicker, { types } from 'react-native-document-picker';
import { parseCSV } from './csvParser';
import { useVaultStore, VaultCredential } from '../store/vaultStore';
import { useIdentityStore } from '../store/Identityvault';
import { useBankCardStore } from '../store/BankCardVault';
import { useSecureNotesStore } from '../store/OtherVaults';
import { CryptoService, EncryptedData } from '../theme/crypto/CryptoService';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** A normalized credential ready for preview / insertion */
export interface NormalizedItem {
  name: string;
  url: string;
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

/** Pick the best header value from a CSV row using a list of candidate names */
function pickField(
  row: Record<string, string>,
  candidates: string[],
): string {
  for (const key of candidates) {
    if (row[key] !== undefined && row[key].trim() !== '') {
      return row[key].trim();
    }
  }
  return '';
}

/** Map raw CSV rows to NormalizedItems, auto-detecting Chrome / Bitwarden / 1Password / generic */
function csvRowsToItems(rows: Record<string, string>[]): NormalizedItem[] {
  if (rows.length === 0) return [];

  const headers = Object.keys(rows[0]);

  const isBitwarden =
    headers.includes('login_uri') || headers.includes('login_username') || headers.includes('login_password');
  const is1Password =
    headers.includes('Title') && headers.includes('Url') && headers.includes('Username') && headers.includes('Password');

  return rows
    .map((row): NormalizedItem | null => {
      let name: string;
      let url: string;
      let username: string;
      let password: string;
      let notes: string;
      let totp: string;

      if (isBitwarden) {
        name = pickField(row, ['name', 'Name']);
        url = pickField(row, ['login_uri', 'url', 'URL']);
        username = pickField(row, ['login_username', 'username', 'Username']);
        password = pickField(row, ['login_password', 'password']);
        notes = pickField(row, ['notes', 'Notes']);
        totp = pickField(row, ['login_totp', 'totp']);
      } else if (is1Password) {
        name = pickField(row, ['Title', 'name']);
        url = pickField(row, ['Url', 'url', 'website', 'Website']);
        username = pickField(row, ['Username', 'username']);
        password = pickField(row, ['Password', 'password']);
        notes = pickField(row, ['Notes', 'notes']);
        totp = pickField(row, ['OTPAuth', 'totp']);
      } else {
        // Chrome CSV or generic
        name = pickField(row, ['name', 'Name', 'title', 'Title', 'site']);
        // Fuzzy URL match: any header containing 'url', 'uri', 'site', 'web'
        const urlKey =
          headers.find(h => /url|uri|site|web/i.test(h)) ?? '';
        url = pickField(row, ['url', 'URL', urlKey]);
        username = pickField(row, ['username', 'Username', 'email', 'Email', 'login']);
        password = pickField(row, ['password', 'Password', 'pass']);
        notes = pickField(row, ['notes', 'Notes', 'note']);
        totp = pickField(row, ['totp', 'otp', 'one_time_password']);
      }

      if (!password) return null; // skip rows without a password

      return {
        name: name || url || 'Imported Entry',
        url,
        username,
        password,
        category: 'General',
        notes,
        totp,
      };
    })
    .filter((item): item is NormalizedItem => item !== null);
}

/** Filter out items that already exist in the vault (url + username match) */
function deduplicateItems(items: NormalizedItem[]): {
  toAdd: NormalizedItem[];
  skipped: number;
} {
  const existing = useVaultStore.getState().credentials;
  const existingKeys = new Set(
    existing.map(c => `${c.url.toLowerCase()}::${c.username.toLowerCase()}`),
  );

  const toAdd: NormalizedItem[] = [];
  const batchKeys = new Set<string>();

  for (const item of items) {
    const key = `${item.url.toLowerCase()}::${item.username.toLowerCase()}`;
    if (!existingKeys.has(key) && !batchKeys.has(key)) {
      toAdd.push(item);
      batchKeys.add(key);
    }
  }

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

    // Try to parse as SecureX JSON if extension is .json and content looks like JSON
    if (isJsonExtension && trimmedContent.startsWith('{')) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new Error(
          'The file has a .json extension but is not valid JSON.',
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
          name: c.name ?? 'Imported Entry',
          url: c.url ?? '',
          username: c.username ?? '',
          password: c.password ?? '',
          category: c.category ?? 'General',
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

      // 2. Gather vault data
      const credentials = useVaultStore.getState().credentials;
      const identities = useIdentityStore.getState().docs;
      const bankCards = useBankCardStore.getState().cards;
      const secureNotes = useSecureNotesStore.getState().notes;

      const payload = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        credentials,
        identities,
        bankCards,
        secureNotes,
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
};
