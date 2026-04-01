import { DatabaseService } from '../database/DatabaseService';
import { CryptoService } from '../crypto/CryptoService';
import { MasterPasswordManager } from '../crypto/MasterPasswordManager';
import { v4 as uuidv4 } from 'uuid';

// ── Types ────────────────────────────────────────────

export type DocType =
  | 'Aadhaar Card'
  | 'PAN Card'
  | 'Passport'
  | 'Driving License'
  | 'Voter ID'
  | 'Ration Card'
  | 'Birth Certificate'
  | 'Marriage Certificate'
  | 'Vehicle RC'
  | 'GST Number'
  | 'Other';

export interface IdentityDocument {
  id: string;
  docType: DocType;
  docNickname: string;
  docNumber: string;          // Decrypted
  fullName: string;           // Decrypted
  dob?: string;               // Decrypted — DD/MM/YYYY
  address?: string;           // Decrypted
  extraFields?: Record<string, string>; // Decrypted — type-specific fields
  issuingAuthority?: string;
  issuingCountry: string;
  issueDate?: number;
  expiryDate?: number;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
  // Computed
  isExpired: boolean;
  expiresInDays: number;
  docIcon: string;
}

export type NewIdentityDocument = Omit<IdentityDocument,
  'id' | 'createdAt' | 'updatedAt' | 'isExpired' | 'expiresInDays' | 'docIcon'
>;

// Document type metadata
export const DOC_METADATA: Record<DocType, {
  icon: string;
  color: string;
  fields: string[];
  hasExpiry: boolean;
}> = {
  'Aadhaar Card': {
    icon: '🪪',
    color: '#1B4F9A',
    fields: ['Aadhaar Number', 'Full Name', 'Date of Birth', 'Address'],
    hasExpiry: false,
  },
  'PAN Card': {
    icon: '💳',
    color: '#8B4513',
    fields: ['PAN Number', 'Full Name', 'Date of Birth', "Father's Name"],
    hasExpiry: false,
  },
  'Passport': {
    icon: '📕',
    color: '#002868',
    fields: ['Passport Number', 'Full Name', 'Date of Birth', 'Place of Birth'],
    hasExpiry: true,
  },
  'Driving License': {
    icon: '🚗',
    color: '#228B22',
    fields: ['License Number', 'Full Name', 'Date of Birth', 'Vehicle Class'],
    hasExpiry: true,
  },
  'Voter ID': {
    icon: '🗳️',
    color: '#800000',
    fields: ['Voter ID Number', 'Full Name', 'Constituency', 'Serial Number'],
    hasExpiry: false,
  },
  'Ration Card': {
    icon: '📋',
    color: '#FF8C00',
    fields: ['Card Number', 'Head of Family', 'Category', 'Members Count'],
    hasExpiry: false,
  },
  'Birth Certificate': {
    icon: '👶',
    color: '#4169E1',
    fields: ['Certificate Number', 'Full Name', 'Date of Birth', 'Place of Birth'],
    hasExpiry: false,
  },
  'Marriage Certificate': {
    icon: '💍',
    color: '#C71585',
    fields: ['Certificate Number', 'Groom Name', 'Bride Name', 'Marriage Date'],
    hasExpiry: false,
  },
  'Vehicle RC': {
    icon: '🚙',
    color: '#2E8B57',
    fields: ['Registration Number', 'Owner Name', 'Vehicle Model', 'Engine Number'],
    hasExpiry: true,
  },
  'GST Number': {
    icon: '🏢',
    color: '#4B0082',
    fields: ['GSTIN', 'Business Name', 'Registration Date', 'Business Type'],
    hasExpiry: false,
  },
  'Other': {
    icon: '📄',
    color: '#696969',
    fields: ['Document Number', 'Full Name'],
    hasExpiry: false,
  },
};

// ── Repository ───────────────────────────────────────

export class IdentityRepository {

  static getAll(): IdentityDocument[] {
    const db = DatabaseService.getDatabase();
    const result = db.execute(
      'SELECT * FROM identity_documents ORDER BY doc_nickname ASC'
    );
    return this.rowsToDocs(result.rows ?? []);
  }

  static getById(id: string): IdentityDocument | null {
    const db = DatabaseService.getDatabase();
    const result = db.execute(
      'SELECT * FROM identity_documents WHERE id = ?', [id]
    );
    if (!result.rows || result.rows.length === 0) return null;
    return this.rowToDoc(result.rows[0]);
  }

  static getByType(docType: DocType): IdentityDocument[] {
    const db = DatabaseService.getDatabase();
    const result = db.execute(
      'SELECT * FROM identity_documents WHERE doc_type = ?', [docType]
    );
    return this.rowsToDocs(result.rows ?? []);
  }

  static getExpiringDocuments(daysThreshold: number = 90): IdentityDocument[] {
    const cutoff = Date.now() + (daysThreshold * 24 * 60 * 60 * 1000);
    const db = DatabaseService.getDatabase();
    const result = db.execute(
      `SELECT * FROM identity_documents 
       WHERE expiry_date IS NOT NULL AND expiry_date < ?`,
      [cutoff]
    );
    return this.rowsToDocs(result.rows ?? []);
  }

  static add(doc: NewIdentityDocument): string {
    const vaultKey = MasterPasswordManager.getVaultKey();
    const db = DatabaseService.getDatabase();
    const id = uuidv4();
    const now = Date.now();

    db.execute(
      `INSERT INTO identity_documents (
        id, doc_type, doc_nickname, encrypted_doc_number,
        encrypted_full_name, encrypted_dob, encrypted_address,
        encrypted_extra, issuing_authority, issuing_country,
        issue_date, expiry_date, is_favorite, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        doc.docType,
        doc.docNickname,
        CryptoService.encrypt(doc.docNumber, vaultKey),
        CryptoService.encrypt(doc.fullName, vaultKey),
        doc.dob ? CryptoService.encrypt(doc.dob, vaultKey) : null,
        doc.address ? CryptoService.encrypt(doc.address, vaultKey) : null,
        doc.extraFields
          ? CryptoService.encrypt(JSON.stringify(doc.extraFields), vaultKey)
          : null,
        doc.issuingAuthority ?? null,
        doc.issuingCountry,
        doc.issueDate ?? null,
        doc.expiryDate ?? null,
        doc.isFavorite ? 1 : 0,
        now,
        now,
      ]
    );
    return id;
  }

  static update(id: string, doc: Partial<NewIdentityDocument>): void {
    const vaultKey = MasterPasswordManager.getVaultKey();
    const db = DatabaseService.getDatabase();
    const existing = this.getById(id);
    if (!existing) throw new Error('Document not found');

    db.execute(
      `UPDATE identity_documents SET
        doc_nickname=?, encrypted_doc_number=?, encrypted_full_name=?,
        encrypted_dob=?, encrypted_address=?, encrypted_extra=?,
        issuing_authority=?, expiry_date=?, is_favorite=?, updated_at=?
      WHERE id=?`,
      [
        doc.docNickname ?? existing.docNickname,
        CryptoService.encrypt(doc.docNumber ?? existing.docNumber, vaultKey),
        CryptoService.encrypt(doc.fullName ?? existing.fullName, vaultKey),
        (doc.dob ?? existing.dob)
          ? CryptoService.encrypt(doc.dob ?? existing.dob!, vaultKey)
          : null,
        (doc.address ?? existing.address)
          ? CryptoService.encrypt(doc.address ?? existing.address!, vaultKey)
          : null,
        (doc.extraFields ?? existing.extraFields)
          ? CryptoService.encrypt(
              JSON.stringify(doc.extraFields ?? existing.extraFields), vaultKey
            )
          : null,
        doc.issuingAuthority ?? existing.issuingAuthority ?? null,
        doc.expiryDate ?? existing.expiryDate ?? null,
        (doc.isFavorite ?? existing.isFavorite) ? 1 : 0,
        Date.now(),
        id,
      ]
    );
  }

  static delete(id: string): void {
    const db = DatabaseService.getDatabase();
    db.execute('DELETE FROM identity_documents WHERE id = ?', [id]);
  }

  static toggleFavorite(id: string, isFavorite: boolean): void {
    const db = DatabaseService.getDatabase();
    db.execute(
      'UPDATE identity_documents SET is_favorite = ? WHERE id = ?',
      [isFavorite ? 1 : 0, id]
    );
  }

  private static rowToDoc(row: any): IdentityDocument {
    const vaultKey = MasterPasswordManager.getVaultKey();
    const now = Date.now();
    const expiryDate = row.expiry_date;
    const expiresInDays = expiryDate
      ? Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24))
      : 999;

    let extraFields: Record<string, string> | undefined;
    if (row.encrypted_extra) {
      try {
        extraFields = JSON.parse(
          CryptoService.decrypt(row.encrypted_extra, vaultKey)
        );
      } catch {}
    }

    const docType = row.doc_type as DocType;

    return {
      id: row.id,
      docType,
      docNickname: row.doc_nickname,
      docNumber: CryptoService.decrypt(row.encrypted_doc_number, vaultKey),
      fullName: CryptoService.decrypt(row.encrypted_full_name, vaultKey),
      dob: row.encrypted_dob
        ? CryptoService.decrypt(row.encrypted_dob, vaultKey)
        : undefined,
      address: row.encrypted_address
        ? CryptoService.decrypt(row.encrypted_address, vaultKey)
        : undefined,
      extraFields,
      issuingAuthority: row.issuing_authority,
      issuingCountry: row.issuing_country,
      issueDate: row.issue_date,
      expiryDate: row.expiry_date,
      isFavorite: row.is_favorite === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isExpired: expiresInDays < 0,
      expiresInDays,
      docIcon: DOC_METADATA[docType]?.icon ?? '📄',
    };
  }

  private static rowsToDocs(rows: any[]): IdentityDocument[] {
    const results: IdentityDocument[] = [];
    for (const row of rows) {
      try { results.push(this.rowToDoc(row)); } catch {}
    }
    return results;
  }
}