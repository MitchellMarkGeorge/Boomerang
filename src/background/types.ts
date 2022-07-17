export const enum Commands {
    BOOMERANG = "boomerang"
}

export interface TabInfo {
    tabId: number;
    windowId: number;
}

export interface StoredData {
    currentTab: TabInfo | null; // cant be undefined
    previousTab: TabInfo | null;
}

export type StoredDataKeys = (keyof StoredData)[]

export function isSameTab(a: TabInfo, b: TabInfo) {
    return a.tabId === b.tabId && a.windowId === b.windowId;
}
