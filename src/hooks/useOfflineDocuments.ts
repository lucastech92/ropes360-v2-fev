import { useState, useEffect, useCallback } from "react";

export interface OfflineDocument {
  id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  category: string;
  blob: Blob;
  savedAt: string;
}

const DB_NAME = "ropes360_offline_docs";
const DB_VERSION = 1;
const STORE_NAME = "documents";

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("category", "category", { unique: false });
        store.createIndex("savedAt", "savedAt", { unique: false });
      }
    };
  });
};

export const useOfflineDocuments = () => {
  const [offlineDocIds, setOfflineDocIds] = useState<Set<string>>(new Set());
  const [offlineDocuments, setOfflineDocuments] = useState<OfflineDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageUsed, setStorageUsed] = useState(0);

  const loadOfflineIds = useCallback(async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAllKeys();

      request.onsuccess = () => {
        setOfflineDocIds(new Set(request.result as string[]));
      };

      // Calculate storage used
      const allRequest = store.getAll();
      allRequest.onsuccess = () => {
        const docs = allRequest.result as OfflineDocument[];
        const totalSize = docs.reduce((acc, doc) => acc + (doc.file_size || 0), 0);
        setStorageUsed(totalSize);
      };

      db.close();
    } catch (error) {
      console.error("Error loading offline doc IDs:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllOfflineDocuments = useCallback(async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      return new Promise<OfflineDocument[]>((resolve, reject) => {
        request.onsuccess = () => {
          const docs = request.result as OfflineDocument[];
          setOfflineDocuments(docs);
          resolve(docs);
        };
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
      });
    } catch (error) {
      console.error("Error loading offline documents:", error);
      return [];
    }
  }, []);

  useEffect(() => {
    loadOfflineIds();
  }, [loadOfflineIds]);

  const saveDocumentOffline = async (
    document: Omit<OfflineDocument, "blob" | "savedAt">,
    blob: Blob
  ): Promise<boolean> => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      const offlineDoc: OfflineDocument = {
        ...document,
        blob,
        savedAt: new Date().toISOString(),
      };

      return new Promise((resolve, reject) => {
        const request = store.put(offlineDoc);
        request.onsuccess = () => {
          setOfflineDocIds((prev) => new Set([...prev, document.id]));
          setStorageUsed((prev) => prev + (document.file_size || 0));
          resolve(true);
        };
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
      });
    } catch (error) {
      console.error("Error saving document offline:", error);
      return false;
    }
  };

  const removeDocumentOffline = async (id: string): Promise<boolean> => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      // Get document size before deleting
      const getRequest = store.get(id);
      
      return new Promise((resolve, reject) => {
        getRequest.onsuccess = () => {
          const doc = getRequest.result as OfflineDocument | undefined;
          const fileSize = doc?.file_size || 0;

          const deleteRequest = store.delete(id);
          deleteRequest.onsuccess = () => {
            setOfflineDocIds((prev) => {
              const newSet = new Set(prev);
              newSet.delete(id);
              return newSet;
            });
            setStorageUsed((prev) => Math.max(0, prev - fileSize));
            resolve(true);
          };
          deleteRequest.onerror = () => reject(deleteRequest.error);
        };
        getRequest.onerror = () => reject(getRequest.error);
        transaction.oncomplete = () => db.close();
      });
    } catch (error) {
      console.error("Error removing document offline:", error);
      return false;
    }
  };

  const getOfflineDocument = async (id: string): Promise<OfflineDocument | null> => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          resolve(request.result as OfflineDocument | null);
        };
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
      });
    } catch (error) {
      console.error("Error getting offline document:", error);
      return null;
    }
  };

  const isDocumentOffline = (id: string): boolean => {
    return offlineDocIds.has(id);
  };

  const clearAllOfflineDocuments = async (): Promise<boolean> => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => {
          setOfflineDocIds(new Set());
          setOfflineDocuments([]);
          setStorageUsed(0);
          resolve(true);
        };
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
      });
    } catch (error) {
      console.error("Error clearing offline documents:", error);
      return false;
    }
  };

  const formatStorageSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return {
    offlineDocIds,
    offlineDocuments,
    loading,
    storageUsed,
    formatStorageSize,
    saveDocumentOffline,
    removeDocumentOffline,
    getOfflineDocument,
    isDocumentOffline,
    loadAllOfflineDocuments,
    clearAllOfflineDocuments,
  };
};

