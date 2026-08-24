const DB_NAME = "hookcut-source-v1";
const STORE = "files";

type Record = { name: string; type: string; blob: Blob };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveSourceFile(projectId: string, file: File) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put({ name: file.name, type: file.type, blob: file } satisfies Record, projectId);
  });
}

export async function getSourceFile(projectId: string): Promise<File | null> {
  const db = await openDb();
  const rec = await new Promise<Record | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(projectId);
    req.onsuccess = () => resolve(req.result as Record | undefined);
    req.onerror = () => reject(req.error);
  });
  if (!rec?.blob) return null;
  return new File([rec.blob], rec.name, { type: rec.type || "video/mp4" });
}
