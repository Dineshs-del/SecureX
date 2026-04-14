import { Alert } from 'react-native';

export class NotificationService {
  /**
   * Checks if a given date string is expiring within the specified threshold.
   * Supports YYYY-MM-DD and MM/YY (Bank Card) formats.
   */
  static isExpiringSoon(expiryDateStr: string, thresholdDays: number = 30): boolean {
    if (!expiryDateStr) return false;
    
    let expiryTime = 0;
    if (expiryDateStr.includes('/')) {
      const parts = expiryDateStr.split('/');
      if (parts.length === 2) {
        const month = parseInt(parts[0], 10);
        let year = parseInt(parts[1], 10);
        if (year < 100) year += 2000;
        // Set to last day of expiration month
        expiryTime = new Date(year, month, 0).getTime();
      }
    } else {
      expiryTime = new Date(expiryDateStr).getTime();
    }

    if (isNaN(expiryTime) || expiryTime === 0) return false;

    const now = Date.now();
    const diffTime = expiryTime - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Expiring within the threshold, or already expired (cap at showing for 30 days past expiry)
    return diffDays <= thresholdDays && diffDays >= -30;
  }

  /**
   * Pure logic alert trigger. Without installing native push dependencies, 
   * we utilize the standard OS dialogue system to emulate in-app scheduled alerts.
   */
  static triggerExpiryAlert(itemName: string, type: 'Card' | 'Document' | 'Medication' | 'Generic'): void {
    const titles = {
      Card: 'Card Expiring Soon',
      Document: 'Document Expiring Soon',
      Medication: 'Medication Reminder',
      Generic: 'Vault Reminder'
    };
    
    Alert.alert(
      titles[type],
      `Your ${itemName.toLowerCase()} requires your attention.`,
      [{ text: 'Dismiss', style: 'cancel' }, { text: 'View', style: 'default' }]
    );
  }
}
