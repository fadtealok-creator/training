import "server-only";
import sample from "@/data/sample-data.json";
import type { Dataset } from "./types";

/**
 * The one place screens get data from. Today it returns the bundled sample
 * (built by `businessdesk-ingest`); the next step swaps this for a Supabase
 * query scoped to the signed-in user's business, with the same return shape.
 */
export async function getDataset(): Promise<Dataset> {
  return sample as unknown as Dataset;
}
