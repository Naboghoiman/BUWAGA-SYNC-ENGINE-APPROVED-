/**
 * IndexedDB persistence for user-uploaded audio files (WAV, MP3, etc.)
 * Ensures custom loops and samples persist across browser refreshes and sessions.
 */

const DB_NAME = 'BuwagaAudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'userAudioFiles';

interface StoredAudioRecord {
  id: string; // e.g. 'looper_track_1'
  fileName: string;
  fileType: string;
  data: ArrayBuffer;
  savedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open audio IndexedDB'));
  });
}

/**
 * Saves an uploaded audio File into IndexedDB
 */
export async function saveAudioFile(id: string, file: File): Promise<void> {
  try {
    const db = await openDB();
    const arrayBuffer = await file.arrayBuffer();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const record: StoredAudioRecord = {
        id,
        fileName: file.name,
        fileType: file.type || 'audio/wav',
        data: arrayBuffer,
        savedAt: Date.now(),
      };

      const putReq = store.put(record);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    });
  } catch (err) {
    console.warn('Failed to save audio file to IndexedDB:', err);
  }
}

/**
 * Loads a stored audio File from IndexedDB
 */
export async function loadAudioFile(id: string): Promise<File | null> {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);

      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const record = getReq.result as StoredAudioRecord | undefined;
        if (!record || !record.data) {
          resolve(null);
          return;
        }

        const blob = new Blob([record.data], { type: record.fileType || 'audio/wav' });
        const file = new File([blob], record.fileName, { type: record.fileType || 'audio/wav' });
        resolve(file);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (err) {
    console.warn('Failed to load audio file from IndexedDB:', err);
    return null;
  }
}

/**
 * Removes a stored audio File from IndexedDB
 */
export async function deleteAudioFile(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const delReq = store.delete(id);
      delReq.onsuccess = () => resolve();
      delReq.onerror = () => reject(delReq.error);
    });
  } catch (err) {
    console.warn('Failed to delete audio file from IndexedDB:', err);
  }
}
