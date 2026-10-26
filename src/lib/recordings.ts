/**
 * 또박또박 책 녹음 — 아이 목소리를 기기 안(IndexedDB)에만 둔다. 서버(MongoDB)로는 보내지 않는다.
 * 키: "아이디:책:쪽"
 */

const DB = "todo-hangul-rec";
const STORE = "clips";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  try {
    const db = await open();
    return await new Promise<T | undefined>((resolve) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    });
  } catch {
    // 저장이 막힌 기기 — 녹음은 이번만 듣고 끝
    return undefined;
  }
}

export function clipKey(user: string, bookId: string, page: number): string {
  return `${user}:${bookId}:${page}`;
}

export function saveClip(key: string, blob: Blob): Promise<unknown> {
  return run("readwrite", (s) => s.put(blob, key));
}

export async function loadClip(key: string): Promise<Blob | null> {
  const b = await run<Blob>("readonly", (s) => s.get(key));
  return b instanceof Blob ? b : null;
}

/** 이 책에서 녹음해 둔 쪽들 */
export async function recordedPages(user: string, bookId: string, pages: number): Promise<number[]> {
  const out: number[] = [];
  for (let p = 0; p < pages; p++) if (await loadClip(clipKey(user, bookId, p))) out.push(p);
  return out;
}
