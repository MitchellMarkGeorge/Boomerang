export const enum Commands {
    BOOMERANG_LEFT = "boomerang-left",
    BOOMERANG_RIGHT = "boomerang-right" 
}

export interface TabStackItem {
    tabId: number;
    windowId: number;
}

export interface StoredData {
    currentIndex: number,
    maxStackSize: number
    tabStack: TabStackItem[]
}