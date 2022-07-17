export const enum Commands {
    BOOMERANG = "boomerang"
}

export interface TabInfo {
    tabId: number;
    windowId: number;
}

export interface StoredData {
    currentTab?: TabInfo // wont be null as it is set on install
    previousTab?: TabInfo;
}

export type StoredDataKeys = (keyof StoredData)[]

export function isSameTab(a: TabInfo, b: TabInfo) {
    return a.tabId === b.tabId && a.windowId === b.windowId;
}
