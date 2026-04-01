import { DatabaseService } from '../database/DatabaseService';
import { CryptoService } from '../crypto/CryptoService';
import { MasterPasswordManager } from '../crypto/MasterPasswordManager';
import { v4 as uuidv4 } from 'uuid';

// ════════════════════════════════════════════════════
// MEDICAL VAULT
// ════════════════════════════════════════════════════

export type MedicalRecordType =
  | 'Health Insurance'
  | 'Blood Group'
  | 'Allergy'
  | 'Emergency Contact'
  | 'Doctor Details'
  | 'Prescription'
  | 'Vaccination'
  | 'Lab Report'
  | 'Other';

export interface MedicalRecord {
  id: string;
  recordType: MedicalRecordType;
  recordNickname: string;
  details: Record<string, string>; // Decrypted
  providerName?: string;
  policyNumber?: string;           // Decrypted
  memberId?: string;               // Decrypted
  expiryDate?: number;
  isEmergency: boolean;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
}

export type NewMedicalRecord = Omit<MedicalRecord, 'id' | 'createdAt' | 'updatedAt'>;

export const MEDICAL_ICONS: Record<MedicalRecordType, string> = {
  'Health Insurance': '🏥',
  'Blood Group': '🩸',
  'Allergy': '⚠️',
  'Emergency Contact': '🆘',
  'Doctor Details': '👨‍⚕️',
  'Prescription': '💊',
  'Vaccination': '💉',
  'Lab Report': '🔬',
  'Other': '📋',
};

export class MedicalRepository {

  static getAll(): MedicalRecord[] {
    const db = DatabaseService.getDatabase();
    const result = db.execute(
      'SELECT * FROM medical_records ORDER BY is_emergency DESC, record_nickname ASC'
    );
    return this.rowsToRecords(result.rows ?? []);
  }

  static getById(id: string): MedicalRecord | null {
    const db = DatabaseService.getDatabase();
    const result = db.execute(
      'SELECT * FROM medical_records WHERE id = ?', [id]
    );
    if (!result.rows || result.rows.length === 0) return null;
    return this.rowToRecord(result.rows[0]);
  }

  static getEmergencyRecords(): MedicalRecord[] {
    const db = DatabaseService.getDatabase();
    const result = db.execute(
      'SELECT * FROM medical_records WHERE is_emergency = 1'
    );
    return this.rowsToRecords(result.rows ?? []);
  }

  static add(record: NewMedicalRecord): string {
    const vaultKey = MasterPasswordManager.getVaultKey();
    const db = DatabaseService.getDatabase();
    const id = uuidv4();
    const now = Date.now();

    db.execute(
      `INSERT INTO medical_records (
        id, record_type, record_nickname, encrypted_details,
        provider_name, encrypted_policy_number, encrypted_member_id,
        expiry_date, is_emergency, is_favorite, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        record.recordType,
        record.recordNickname,
        CryptoService.encrypt(JSON.stringify(record.details), vaultKey),
        record.providerName ?? null,
        record.policyNumber
          ? CryptoService.encrypt(record.policyNumber, vaultKey)
          : null,
        record.memberId
          ? CryptoService.encrypt(record.memberId, vaultKey)
          : null,
        record.expiryDate ?? null,
        record.isEmergency ? 1 : 0,
        record.isFavorite ? 1 : 0,
        now,
        now,
      ]
    );
    return id;
  }

  static update(id: string, record: Partial<NewMedicalRecord>): void {
    const vaultKey = MasterPasswordManager.getVaultKey();
    const db = DatabaseService.getDatabase();
    const existing = this.getById(id);
    if (!existing) throw new Error('Record not found');

    db.execute(
      `UPDATE medical_records SET
        record_nickname=?, encrypted_details=?, provider_name=?,
        encrypted_policy_number=?, encrypted_member_id=?,
        expiry_date=?, is_emergency=?, is_favorite=?, updated_at=?
      WHERE id=?`,
      [
        record.recordNickname ?? existing.recordNickname,
        CryptoService.encrypt(
          JSON.stringify(record.details ?? existing.details), vaultKey
        ),
        record.providerName ?? existing.providerName ?? null,
        (record.policyNumber ?? existing.policyNumber)
          ? CryptoService.encrypt(
              record.policyNumber ?? existing.policyNumber!, vaultKey
            )
          : null,
        (record.memberId ?? existing.memberId)
          ? CryptoService.encrypt(
              record.memberId ?? existing.memberId!, vaultKey
            )
          : null,
        record.expiryDate ?? existing.expiryDate ?? null,
        (record.isEmergency ?? existing.isEmergency) ? 1 : 0,
        (record.isFavorite ?? existing.isFavorite) ? 1 : 0,
        Date.now(),
        id,
      ]
    );
  }

  static delete(id: string): void {
    DatabaseService.getDatabase().execute(
      'DELETE FROM medical_records WHERE id = ?', [id]
    );
  }

  private static rowToRecord(row: any): MedicalRecord {
    const vaultKey = MasterPasswordManager.getVaultKey();
    return {
      id: row.id,
      recordType: row.record_type as MedicalRecordType,
      recordNickname: row.record_nickname,
      details: JSON.parse(CryptoService.decrypt(row.encrypted_details, vaultKey)),
      providerName: row.provider_name,
      policyNumber: row.encrypted_policy_number
        ? CryptoService.decrypt(row.encrypted_policy_number, vaultKey)
        : undefined,
      memberId: row.encrypted_member_id
        ? CryptoService.decrypt(row.encrypted_member_id, vaultKey)
        : undefined,
      expiryDate: row.expiry_date,
      isEmergency: row.is_emergency === 1,
      isFavorite: row.is_favorite === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static rowsToRecords(rows: any[]): MedicalRecord[] {
    const results: MedicalRecord[] = [];
    for (const row of rows) {
      try { results.push(this.rowToRecord(row)); } catch {}
    }
    return results;
  }
}

// ════════════════════════════════════════════════════
// WIFI VAULT
// ════════════════════════════════════════════════════

export interface WiFiPassword {
  id: string;
  networkName: string;
  password: string;     // Decrypted
  securityType: string;
  location?: string;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
}

export type NewWiFiPassword = Omit<WiFiPassword, 'id' | 'createdAt' | 'updatedAt'>;

export class WiFiRepository {

  static getAll(): WiFiPassword[] {
    const db = DatabaseService.getDatabase();
    const result = db.execute(
      'SELECT * FROM wifi_passwords ORDER BY network_name ASC'
    );
    return this.rowsToWifi(result.rows ?? []);
  }

  static getById(id: string): WiFiPassword | null {
    const db = DatabaseService.getDatabase();
    const result = db.execute(
      'SELECT * FROM wifi_passwords WHERE id = ?', [id]
    );
    if (!result.rows || result.rows.length === 0) return null;
    return this.rowToWifi(result.rows[0]);
  }

  static search(query: string): WiFiPassword[] {
    const db = DatabaseService.getDatabase();
    const result = db.execute(
      'SELECT * FROM wifi_passwords WHERE network_name LIKE ?',
      [`%${query}%`]
    );
    return this.rowsToWifi(result.rows ?? []);
  }

  static add(wifi: NewWiFiPassword): string {
    const vaultKey = MasterPasswordManager.getVaultKey();
    const db = DatabaseService.getDatabase();
    const id = uuidv4();
    const now = Date.now();

    db.execute(
      `INSERT INTO wifi_passwords (
        id, network_name, encrypted_password, security_type,
        location, is_favorite, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?)`,
      [
        id,
        wifi.networkName,
        CryptoService.encrypt(wifi.password, vaultKey),
        wifi.securityType,
        wifi.location ?? null,
        wifi.isFavorite ? 1 : 0,
        now,
        now,
      ]
    );
    return id;
  }

  static update(id: string, wifi: Partial<NewWiFiPassword>): void {
    const vaultKey = MasterPasswordManager.getVaultKey();
    const db = DatabaseService.getDatabase();
    const existing = this.getById(id);
    if (!existing) throw new Error('WiFi not found');

    db.execute(
      `UPDATE wifi_passwords SET
        network_name=?, encrypted_password=?, security_type=?,
        location=?, is_favorite=?, updated_at=?
      WHERE id=?`,
      [
        wifi.networkName ?? existing.networkName,
        CryptoService.encrypt(wifi.password ?? existing.password, vaultKey),
        wifi.securityType ?? existing.securityType,
        wifi.location ?? existing.location ?? null,
        (wifi.isFavorite ?? existing.isFavorite) ? 1 : 0,
        Date.now(),
        id,
      ]
    );
  }

  static delete(id: string): void {
    DatabaseService.getDatabase().execute(
      'DELETE FROM wifi_passwords WHERE id = ?', [id]
    );
  }

  static markUsed(id: string): void {
    DatabaseService.getDatabase().execute(
      'UPDATE wifi_passwords SET last_used_at = ? WHERE id = ?',
      [Date.now(), id]
    );
  }

  private static rowToWifi(row: any): WiFiPassword {
    const vaultKey = MasterPasswordManager.getVaultKey();
    return {
      id: row.id,
      networkName: row.network_name,
      password: CryptoService.decrypt(row.encrypted_password, vaultKey),
      securityType: row.security_type,
      location: row.location,
      isFavorite: row.is_favorite === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastUsedAt: row.last_used_at,
    };
  }

  private static rowsToWifi(rows: any[]): WiFiPassword[] {
    const results: WiFiPassword[] = [];
    for (const row of rows) {
      try { results.push(this.rowToWifi(row)); } catch {}
    }
    return results;
  }
}

// ════════════════════════════════════════════════════
// RECOVERY CODES VAULT
// ════════════════════════════════════════════════════

export type CodeType =
  | '2FA Backup Codes'
  | 'Seed Phrase'
  | 'License Key'
  | 'Serial Number'
  | 'Other';

export interface RecoveryCode {
  id: string;
  serviceName: string;
  codeType: CodeType;
  codes: string[];        // Decrypted array of codes
  usedCodes: string[];    // Which codes have been used
  totalCodes: number;
  remainingCodes: number;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
}

export type NewRecoveryCode = Omit<RecoveryCode,
  'id' | 'createdAt' | 'updatedAt' | 'usedCodes' | 'totalCodes' | 'remainingCodes'
>;

export class RecoveryCodeRepository {

  static getAll(): RecoveryCode[] {
    const db = DatabaseService.getDatabase();
    const result = db.execute(
      'SELECT * FROM recovery_codes ORDER BY service_name ASC'
    );
    return this.rowsToCodes(result.rows ?? []);
  }

  static getById(id: string): RecoveryCode | null {
    const db = DatabaseService.getDatabase();
    const result = db.execute(
      'SELECT * FROM recovery_codes WHERE id = ?', [id]
    );
    if (!result.rows || result.rows.length === 0) return null;
    return this.rowToCode(result.rows[0]);
  }

  static add(code: NewRecoveryCode): string {
    const vaultKey = MasterPasswordManager.getVaultKey();
    const db = DatabaseService.getDatabase();
    const id = uuidv4();
    const now = Date.now();

    db.execute(
      `INSERT INTO recovery_codes (
        id, service_name, code_type, encrypted_codes,
        used_codes, total_codes, remaining_codes,
        is_favorite, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        code.serviceName,
        code.codeType,
        CryptoService.encrypt(JSON.stringify(code.codes), vaultKey),
        JSON.stringify([]),
        code.codes.length,
        code.codes.length,
        code.isFavorite ? 1 : 0,
        now,
        now,
      ]
    );
    return id;
  }

  static markCodeUsed(id: string, code: string): void {
    const vaultKey = MasterPasswordManager.getVaultKey();
    const db = DatabaseService.getDatabase();
    const existing = this.getById(id);
    if (!existing) throw new Error('Recovery codes not found');

    const updatedUsed = [...existing.usedCodes, code];
    db.execute(
      `UPDATE recovery_codes SET
        used_codes=?, remaining_codes=?, updated_at=?
      WHERE id=?`,
      [
        JSON.stringify(updatedUsed),
        existing.totalCodes - updatedUsed.length,
        Date.now(),
        id,
      ]
    );
  }

  static delete(id: string): void {
    DatabaseService.getDatabase().execute(
      'DELETE FROM recovery_codes WHERE id = ?', [id]
    );
  }

  private static rowToCode(row: any): RecoveryCode {
    const vaultKey = MasterPasswordManager.getVaultKey();
    const usedCodes = JSON.parse(row.used_codes || '[]');
    return {
      id: row.id,
      serviceName: row.service_name,
      codeType: row.code_type as CodeType,
      codes: JSON.parse(CryptoService.decrypt(row.encrypted_codes, vaultKey)),
      usedCodes,
      totalCodes: row.total_codes,
      remainingCodes: row.remaining_codes,
      isFavorite: row.is_favorite === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static rowsToCodes(rows: any[]): RecoveryCode[] {
    const results: RecoveryCode[] = [];
    for (const row of rows) {
      try { results.push(this.rowToCode(row)); } catch {}
    }
    return results;
  }
}

// ════════════════════════════════════════════════════
// SECURE NOTES VAULT
// ════════════════════════════════════════════════════

export interface SecureNote {
  id: string;
  title: string;
  content: string;    // Decrypted
  category: string;
  color: string;
  isPinned: boolean;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
}

export type NewSecureNote = Omit<SecureNote, 'id' | 'createdAt' | 'updatedAt'>;

export const NOTE_COLORS = [
  '#1a1a3e', '#003518', '#3B0010',
  '#3A2800', '#001A4A', '#2F1A00',
  '#1A0030', '#002830',
];

export const NOTE_CATEGORIES = [
  'General', 'Personal', 'Work',
  'Financial', 'Medical', 'Legal',
  'Ideas', 'Other',
];

export class SecureNoteRepository {

  static getAll(): SecureNote[] {
    const db = DatabaseService.getDatabase();
    const result = db.execute(
      'SELECT * FROM secure_notes ORDER BY is_pinned DESC, updated_at DESC'
    );
    return this.rowsToNotes(result.rows ?? []);
  }

  static getById(id: string): SecureNote | null {
    const db = DatabaseService.getDatabase();
    const result = db.execute(
      'SELECT * FROM secure_notes WHERE id = ?', [id]
    );
    if (!result.rows || result.rows.length === 0) return null;
    return this.rowToNote(result.rows[0]);
  }

  static getPinned(): SecureNote[] {
    const db = DatabaseService.getDatabase();
    const result = db.execute(
      'SELECT * FROM secure_notes WHERE is_pinned = 1'
    );
    return this.rowsToNotes(result.rows ?? []);
  }

  static add(note: NewSecureNote): string {
    const vaultKey = MasterPasswordManager.getVaultKey();
    const db = DatabaseService.getDatabase();
    const id = uuidv4();
    const now = Date.now();

    db.execute(
      `INSERT INTO secure_notes (
        id, title, encrypted_content, category,
        color, is_pinned, is_favorite, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        id,
        note.title,
        CryptoService.encrypt(note.content, vaultKey),
        note.category,
        note.color,
        note.isPinned ? 1 : 0,
        note.isFavorite ? 1 : 0,
        now,
        now,
      ]
    );
    return id;
  }

  static update(id: string, note: Partial<NewSecureNote>): void {
    const vaultKey = MasterPasswordManager.getVaultKey();
    const db = DatabaseService.getDatabase();
    const existing = this.getById(id);
    if (!existing) throw new Error('Note not found');

    db.execute(
      `UPDATE secure_notes SET
        title=?, encrypted_content=?, category=?,
        color=?, is_pinned=?, is_favorite=?, updated_at=?
      WHERE id=?`,
      [
        note.title ?? existing.title,
        CryptoService.encrypt(note.content ?? existing.content, vaultKey),
        note.category ?? existing.category,
        note.color ?? existing.color,
        (note.isPinned ?? existing.isPinned) ? 1 : 0,
        (note.isFavorite ?? existing.isFavorite) ? 1 : 0,
        Date.now(),
        id,
      ]
    );
  }

  static delete(id: string): void {
    DatabaseService.getDatabase().execute(
      'DELETE FROM secure_notes WHERE id = ?', [id]
    );
  }

  static togglePin(id: string, isPinned: boolean): void {
    DatabaseService.getDatabase().execute(
      'UPDATE secure_notes SET is_pinned = ? WHERE id = ?',
      [isPinned ? 1 : 0, id]
    );
  }

  private static rowToNote(row: any): SecureNote {
    const vaultKey = MasterPasswordManager.getVaultKey();
    return {
      id: row.id,
      title: row.title,
      content: CryptoService.decrypt(row.encrypted_content, vaultKey),
      category: row.category,
      color: row.color,
      isPinned: row.is_pinned === 1,
      isFavorite: row.is_favorite === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static rowsToNotes(rows: any[]): SecureNote[] {
    const results: SecureNote[] = [];
    for (const row of rows) {
      try { results.push(this.rowToNote(row)); } catch {}
    }
    return results;
  }
}