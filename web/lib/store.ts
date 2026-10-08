import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { TableName } from "./types";

/**
 * Where confirmed uploads are kept until the Supabase database is connected.
 * A JSON file on the server's disk: fine for a local demo or a single pilot
 * machine, not for hosting (serverless disks are temporary). The same
 * functions will be backed by the `imports` and data tables in supabase/.
 */
export type StoredImport = {
  id: string; table: TableName; file: string; sheet: string;
  rows: Record<string, unknown>[]; warnings: string[]; importedAt: string;
};

const dir = () => process.env.BUSINESSDESK_DATA_DIR ?? path.join(process.cwd(), ".data");
const file = () => path.join(dir(), "imports.json");

export async function listImports(): Promise<StoredImport[]> {
  try {
    return JSON.parse(await fs.readFile(file(), "utf8")) as StoredImport[];
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

async function write(all: StoredImport[]) {
  await fs.mkdir(dir(), { recursive: true });
  const tmp = `${file()}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(all));
  await fs.rename(tmp, file());
}

/** Saves an upload. It replaces earlier uploads for the same table, so a new month's file is one step. */
export async function saveImport(i: Omit<StoredImport, "id" | "importedAt">): Promise<StoredImport> {
  const rec = { ...i, id: randomUUID(), importedAt: new Date().toISOString() };
  await write([...(await listImports()).filter(x => x.table !== i.table), rec]);
  return rec;
}

export async function removeImport(id: string) {
  await write((await listImports()).filter(x => x.id !== id));
}
