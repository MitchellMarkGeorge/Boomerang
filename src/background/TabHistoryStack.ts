export interface TabItem {
    tabId: number,
    windowId: number
}
export class TabHistoryStack {
    maxStackSize: number;
    currentTabIndex: number;
    tabs: TabItem[];
}