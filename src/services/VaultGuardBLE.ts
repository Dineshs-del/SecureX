import { BleManager, Device, Characteristic, Subscription } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';
import { Buffer } from 'buffer';

const bleManager = new BleManager();

const VAULTGUARD_NAME = 'SecureX_ESP32';
const SERVICE_UUID = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E'.toLowerCase();
const CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // Standard RX
const CHARACTERISTIC_UUID_TX = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // Standard TX

let connectedDevice: Device | null = null;

export type VaultGuardAuthResult = 'GRANTED' | 'DENIED' | 'LOCKED_TEMP' | 'LOCKED_PERM' | 'LOCKED' | 'TIMEOUT' | 'NOT_FOUND';
export type VaultGuardEnrollResult = 'ENROLLED' | 'ENROLL_FAIL' | 'TIMEOUT';

export const isVaultGuardConnected = (): boolean => {
  return connectedDevice !== null;
};

const requestPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'android' && Platform.Version >= 31) {
    const statuses = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    return (
      statuses[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
      statuses[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED
    );
  } else if (Platform.OS === 'android') {
    const status = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    return status === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
};

export const connectToVaultGuard = async (): Promise<boolean> => {
  console.log("[BLE] Starting connection process...");
  const hasPermission = await requestPermissions();
  console.log("[BLE] Permissions granted:", hasPermission);
  if (!hasPermission) return false;

  return new Promise(async (resolve) => {
    let isResolved = false;

    const timeout = setTimeout(() => {
      if (!isResolved) {
        console.log("[BLE] Connection timed out after 12s");
        isResolved = true;
        bleManager.stopDeviceScan();
        resolve(false);
      }
    }, 12000);

    const setupDevice = async (device: Device) => {
      console.log(`[BLE] Attempting to setup device: ${device.name || 'Unknown'} (${device.id})`);
      try {
        console.log("[BLE] Connecting to device...");
        const connected = await device.connect();
        console.log("[BLE] Discovering services...");
        await connected.discoverAllServicesAndCharacteristics();
        connectedDevice = connected;
        console.log("[BLE] Setup complete! Device connected.");

        // Setup disconnect listener
        connected.onDisconnected((err, disconnectedDevice) => {
           console.log("[BLE] Device disconnected unexpectedly.");
           if (connectedDevice?.id === disconnectedDevice.id) {
             connectedDevice = null;
           }
        });

        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          resolve(true);
        }
      } catch (e) {
        console.error("[BLE] Connection setup failed:", e);
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          resolve(false);
        }
      }
    };

    try {
      // 1. Check if it's already connected in the OS
      console.log(`[BLE] Checking for OS-connected devices with service: ${SERVICE_UUID}`);
      const connectedDevices = await bleManager.connectedDevices([SERVICE_UUID]);
      console.log(`[BLE] Found ${connectedDevices.length} already connected devices.`);
      if (connectedDevices.length > 0) {
        console.log("[BLE] Found device already connected via OS! Using it:", connectedDevices[0].id);
        bleManager.stopDeviceScan();
        setupDevice(connectedDevices[0]);
        return;
      }
    } catch (e) {
      console.warn('[BLE] Failed to get connected devices', e);
    }

    // 2. Fallback to scanning if not already connected
    console.log(`[BLE] Starting scan for ALL devices (ESP32 might not broadcast UUID)...`);
    bleManager.startDeviceScan(null, null, async (error, device) => {
      if (error) {
        console.error("[BLE] Scan Error:", error);
        return;
      }

      if (device && device.name) {
        console.log(`[BLE] Seen device: ${device.name} | ID: ${device.id}`);
        // If it matches VaultGuard, or has the UUID in serviceUUIDs
        if (device.name.includes(VAULTGUARD_NAME) || 
           (device.serviceUUIDs && device.serviceUUIDs.includes(SERVICE_UUID))) {
          console.log(`[BLE] Found match! Attempting connect...`);
          bleManager.stopDeviceScan();
          setupDevice(device);
        }
      }
    });
  });
};

const writeAndMonitor = (
  command: string, 
  timeoutMs: number, 
  callback: (response: string, resolve: (val: any) => void) => void
): Promise<any> => {
  return new Promise(async (resolve) => {
    if (!connectedDevice) {
      resolve('NOT_FOUND');
      return;
    }

    let isResolved = false;
    let subscription: Subscription | null = null;

    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        if (subscription) subscription.remove();
        resolve('TIMEOUT');
      }
    }, timeoutMs);

    try {
      console.log(`[BLE] Subscribing to TX characteristic ${CHARACTERISTIC_UUID_TX}...`);
      subscription = connectedDevice.monitorCharacteristicForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID_TX,
        (error, characteristic) => {
          if (error) {
            if (error.message && error.message.includes('cancelled')) {
              console.log("[BLE] Monitor cancelled (Timeout or disconnected)");
            } else {
              console.warn("[BLE] Monitor error:", error);
            }
            return;
          }
          if (characteristic && characteristic.value) {
            // Trim and sanitize response
            const rawResponse = Buffer.from(characteristic.value, 'base64').toString('ascii');
            const response = rawResponse.replace(/\0/g, '').trim();
            console.log(`[BLE] Received response from ESP32: "${response}" (Raw length: ${rawResponse.length})`);
            
            if (!isResolved) {
              isResolved = true;
              clearTimeout(timeout);
              subscription?.remove();
              callback(response, resolve);
            }
          }
        }
      );

      console.log(`[BLE] Writing command "${command}" to RX ${CHARACTERISTIC_UUID}...`);
      const base64Command = Buffer.from(command).toString('base64');
      await connectedDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        base64Command
      );
      console.log(`[BLE] Command "${command}" sent successfully.`);

    } catch (e) {
      console.error("Write error:", e);
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeout);
        if (subscription) subscription.remove();
        resolve('NOT_FOUND');
      }
    }
  });
};

export const requestVaultGuardAuth = async (): Promise<VaultGuardAuthResult> => {
  return writeAndMonitor('AUTH', 15000, (response, resolve) => {
    // Exact matching for auth responses
    if (response === 'GRANTED' || response === 'DENIED' || response === 'LOCKED_TEMP' || 
        response === 'LOCKED_PERM' || response === 'LOCKED' || response === 'TIMEOUT') {
      resolve(response as VaultGuardAuthResult);
    } else {
      resolve('NOT_FOUND');
    }
  });
};

export const enrollNewFingerprint = async (
  onProgress?: (message: string) => void
): Promise<VaultGuardEnrollResult> => {
  return new Promise(async (resolve) => {
    if (!connectedDevice) {
      resolve('TIMEOUT');
      return;
    }

    let isResolved = false;
    let subscription: Subscription | null = null;

    // Enrollment can take a long time (user needs to place finger twice)
    const timeout = setTimeout(() => {
      if (!isResolved) {
        console.log("[BLE] Enrollment timed out after 60s");
        isResolved = true;
        if (subscription) subscription.remove();
        resolve('TIMEOUT');
      }
    }, 60000); // 60 second timeout for full enrollment

    try {
      console.log("[BLE] Subscribing for enrollment responses...");
      subscription = connectedDevice.monitorCharacteristicForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID_TX,
        (error, characteristic) => {
          if (error) {
            if (error.message && error.message.includes('cancelled')) {
              console.log("[BLE] Enrollment monitor cancelled");
            } else {
              console.warn("[BLE] Enrollment monitor error:", error);
            }
            return;
          }
          if (characteristic && characteristic.value) {
            const rawResponse = Buffer.from(characteristic.value, 'base64').toString('ascii');
            const response = rawResponse.replace(/\0/g, '').trim();
            console.log(`[BLE] Enrollment response: "${response}"`);

            // Only resolve on final responses — ignore intermediate progress
            if (response === 'ENROLLED') {
              if (!isResolved) {
                isResolved = true;
                clearTimeout(timeout);
                subscription?.remove();
                resolve('ENROLLED');
              }
            } else if (response === 'ENROLL_FAIL') {
              if (!isResolved) {
                isResolved = true;
                clearTimeout(timeout);
                subscription?.remove();
                resolve('ENROLL_FAIL');
              }
            } else {
              // Intermediate progress message from ESP32 (e.g. step updates)
              console.log(`[BLE] Enrollment progress: ${response}`);
              if (onProgress) {
                onProgress(response);
              }
            }
          }
        }
      );

      console.log("[BLE] Sending ENROLL command...");
      const base64Command = Buffer.from('ENROLL').toString('base64');
      await connectedDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        base64Command
      );
      console.log("[BLE] ENROLL command sent successfully.");

    } catch (e) {
      console.error("[BLE] Enrollment write error:", e);
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeout);
        if (subscription) subscription.remove();
        resolve('TIMEOUT');
      }
    }
  });
};

export const disconnectVaultGuard = async (): Promise<void> => {
  if (connectedDevice) {
    await connectedDevice.cancelConnection();
    connectedDevice = null;
  }
};
