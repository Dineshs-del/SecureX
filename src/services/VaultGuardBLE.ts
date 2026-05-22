import { BleManager, Device, Characteristic, Subscription } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';
import { Buffer } from 'buffer';

const bleManager = new BleManager();

const VAULTGUARD_NAME = 'VaultGuard';
const SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
const CHARACTERISTIC_UUID = 'abcd1234-ab12-ab12-ab12-abcdef123456';

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
  const hasPermission = await requestPermissions();
  if (!hasPermission) return false;

  return new Promise((resolve) => {
    let isResolved = false;

    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        bleManager.stopDeviceScan();
        resolve(false);
      }
    }, 12000);

    bleManager.startDeviceScan(null, null, async (error, device) => {
      if (error) {
        console.error("BLE Scan Error:", error);
        return;
      }

      if (device && device.name === VAULTGUARD_NAME) {
        bleManager.stopDeviceScan();
        
        try {
          const connected = await device.connect();
          await connected.discoverAllServicesAndCharacteristics();
          connectedDevice = connected;

          // Setup disconnect listener
          connected.onDisconnected((err, disconnectedDevice) => {
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
          console.error("Connection failed:", e);
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeout);
            resolve(false);
          }
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
      subscription = connectedDevice.monitorCharacteristicForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        (error, characteristic) => {
          if (error) return;
          if (characteristic && characteristic.value) {
            const response = Buffer.from(characteristic.value, 'base64').toString('ascii');
            if (!isResolved) {
              isResolved = true;
              clearTimeout(timeout);
              subscription?.remove();
              callback(response, resolve);
            }
          }
        }
      );

      const base64Command = Buffer.from(command).toString('base64');
      await connectedDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        base64Command
      );

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

export const enrollNewFingerprint = async (): Promise<VaultGuardEnrollResult> => {
  return writeAndMonitor('ENROLL', 45000, (response, resolve) => {
    if (response === 'ENROLLED' || response === 'ENROLL_FAIL') {
      resolve(response as VaultGuardEnrollResult);
    } else {
      resolve('TIMEOUT');
    }
  });
};

export const disconnectVaultGuard = async (): Promise<void> => {
  if (connectedDevice) {
    await connectedDevice.cancelConnection();
    connectedDevice = null;
  }
};
