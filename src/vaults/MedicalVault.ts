import { create } from 'zustand';
import { encryptData, decryptData } from './encryption';
import { VaultStorage } from './storage';
import { NotificationService } from './notifications';

const STORE_KEY = 'securex_medical';

export interface MedicationReminder {
  id: string;
  medicationName: string;
  time: string; // e.g., "08:00"
  frequency: string; // e.g., "Daily", "Weekly"
}

export interface MedicalRecord {
  id: string;
  title: string;
  emergencyAccess: boolean; // Logic flag: if true, can be configured to bypass standard lock checks in emergencies
  encryptedPayload: string; // JSON holding detailed health PII
}

export interface MedicalInput {
  title: string;
  emergencyAccess: boolean;
  bloodGroup?: string;
  insuranceInfo?: string;
  allergies?: string[];
  doctorInfo?: string;
  prescriptions?: string[];
  vaccinations?: string[];
  reminders?: MedicationReminder[];
}

interface MedicalVaultState {
  records: MedicalRecord[];
  loadRecords: () => Promise<void>;
  addRecord: (input: MedicalInput) => Promise<void>;
  updateRecord: (id: string, input: Partial<MedicalInput>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  triggerMedicationReminders: () => void;
  getRawRecord: (id: string) => MedicalInput | null;
}

export const useMedicalVault = create<MedicalVaultState>((set, get) => ({
  records: [],

  loadRecords: async () => {
    try {
      const stored = await VaultStorage.loadItems<MedicalRecord>(STORE_KEY);
      set({ records: stored });
      // In a real app, you'd schedule push notifications here
      get().triggerMedicationReminders(); 
    } catch (e) {
      console.error('Failed to load medical records:', e);
    }
  },

  addRecord: async (input) => {
    const payload = {
      bloodGroup: input.bloodGroup,
      insuranceInfo: input.insuranceInfo,
      allergies: input.allergies,
      doctorInfo: input.doctorInfo,
      prescriptions: input.prescriptions,
      vaccinations: input.vaccinations,
      reminders: input.reminders || []
    };

    const newRecord: MedicalRecord = {
      id: Date.now().toString(),
      title: input.title || 'Health Record',
      emergencyAccess: input.emergencyAccess || false,
      encryptedPayload: encryptData(JSON.stringify(payload))
    };

    const updated = [...get().records, newRecord];
    set({ records: updated });
    await VaultStorage.saveItems(STORE_KEY, updated);
  },

  updateRecord: async (id, input) => {
    const { records } = get();
    const updated = records.map(record => {
      if (record.id === id) {
        let newTitle = record.title;
        let newEmergency = record.emergencyAccess;
        
        if (input.title !== undefined) newTitle = input.title;
        if (input.emergencyAccess !== undefined) newEmergency = input.emergencyAccess;

        // Decrypt old payload to merge updates
        let mergedPayload = {};
        try {
          const rawPayload = decryptData(record.encryptedPayload);
          if (rawPayload) mergedPayload = JSON.parse(rawPayload);
        } catch (e) {}

        const newPayload = { ...mergedPayload, ...input };
        // Clean out root properties from the payload
        delete (newPayload as any).title;
        delete (newPayload as any).emergencyAccess;

        return {
          ...record,
          title: newTitle,
          emergencyAccess: newEmergency,
          encryptedPayload: encryptData(JSON.stringify(newPayload))
        };
      }
      return record;
    });

    set({ records: updated });
    await VaultStorage.saveItems(STORE_KEY, updated);
  },

  deleteRecord: async (id) => {
    const updated = get().records.filter(r => r.id !== id);
    set({ records: updated });
    await VaultStorage.saveItems(STORE_KEY, updated);
  },

  triggerMedicationReminders: () => {
    // Pure logic simulation of a reminder check
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    get().records.forEach(record => {
      try {
        const payloadStr = decryptData(record.encryptedPayload);
        if (!payloadStr) return;
        const payload = JSON.parse(payloadStr);
        const reminders: MedicationReminder[] = payload.reminders || [];
        
        reminders.forEach(r => {
          if (r.time === currentTime) {
            NotificationService.triggerExpiryAlert(r.medicationName, 'Medication');
          }
        });
      } catch (e) {}
    });
  },

  getRawRecord: (id) => {
    const record = get().records.find(r => r.id === id);
    if (!record) return null;

    try {
      const payloadStr = decryptData(record.encryptedPayload);
      const payload = payloadStr ? JSON.parse(payloadStr) : {};
      
      return {
        title: record.title,
        emergencyAccess: record.emergencyAccess,
        ...payload
      };
    } catch {
      return null;
    }
  }
}));
