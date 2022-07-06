import { StoredData, StoredDataKeys } from "./types";
import browser from "webextension-polyfill";

export async function getStoredData(keys: StoredDataKeys | keyof StoredData) {
  return (await browser.storage.local.get(keys)) as StoredData;
}

export async function updateStoredData(updatedData: Partial<StoredData>) {
    await browser.storage.local.set(updatedData)
}
