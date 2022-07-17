import { StoredData, StoredDataKeys } from "./types";
import browser from "webextension-polyfill";

export async function getStoredData(keys: StoredDataKeys | keyof StoredData) {
  return browser.storage.local.get(keys) as Promise<StoredData>
}

export async function updateStoredData(updatedData: Partial<StoredData>) {
    return browser.storage.local.set(updatedData)
}
