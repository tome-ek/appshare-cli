import Conf from 'conf/dist/source';

export enum StorageKey {
  RefreshToken = 'REFRESH_TOKEN',
}

export interface StorageProvider {
  get: (key: StorageKey) => string | undefined;
  set: (value: string, key: StorageKey) => void;
  exists: (key: StorageKey) => boolean;
}

export const storageProvider = (): StorageProvider => {
  const storage = new Conf();
  return {
    get: key => {
      const value = storage.get(key);
      if (typeof value === 'string') {
        return value;
      } else {
        return undefined;
      }
    },
    set: (value, key) => storage.set(key, value),
    exists: key => storage.has(key),
  };
};
