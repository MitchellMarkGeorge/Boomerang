import browser from "webextension-polyfill";
import { StoredData, TabStackItem } from "../common/types";
import { Mutex } from "./Mutex";
export class TabStack {
  // maxStackSize: number;
  // currentTabIndex: number;
  // tabs: TabItem[];
  private mutex: Mutex;
  // can also use the mutex queue
  private constructor(
    private maxStackSize: number = 3,
    private currentIndex: number = 0,
    private stackItems: TabStackItem[] = []
  ) {
    this.mutex = new Mutex();
  }

  getCurrentIndex() {
    return this.currentIndex;
  }

  async updateCurrentIndex(newIndex: number) {
    this.currentIndex = newIndex;
    const unlock = await this.mutex.lock();
    await browser.storage.local.set({ currentIndex: newIndex });
    unlock();
  }

  getLength() {
    return this.stackItems.length;
  }

  getItemAtIndex(index: number) {
    return this.stackItems[index];
  }

  findIndex(item: TabStackItem) {
    return this.stackItems.findIndex(
      (tabStackItem) =>
        tabStackItem.tabId === item.tabId &&
        tabStackItem.windowId === item.windowId
    );
  }

  async addToTabStack(item: TabStackItem) {
    // shuld not be able to add duplicates
    // if it is already in the list, it should be removed and added to the top
    // wait till you can use
    const unlock = await this.mutex.lock();
    let tabStackItemIndex = this.stackItems.findIndex(
      (tabStackItem) =>
        tabStackItem.tabId === item.tabId &&
        tabStackItem.windowId === item.windowId
    );
    if (tabStackItemIndex !== -1) {
      // meaning it is already in the stack
      // // if for whatever reason it is already at the top, return
      unlock();
      // not possible
      return;
      // meaning there is already an item in the tab stack with the same value
      // the tab is already in the stack
    } else if (this.stackItems.length === this.maxStackSize) {
      // meaning that given tabStackItem is a new onw
      // remove last item
      this.stackItems.pop();
      // add tab item to the top of stack
      this.stackItems.unshift(item);
    } else {
      // simply add to the top (it is less than MAX_ITEMS)
      this.stackItems.unshift(item);
    }

    // could also put the mutex.lock() here as well
    await browser.storage.local.set({
      tabStack: this.stackItems,
      currentIndex: 0, // if it is being added, it is the new item at the top if the stack
    });
    console.log("Item added to tab stack: ", item, this.stackItems);
    unlock();
  }

  async updateItemWindowId(tabId: number, newWindowId: number) {
    const unlock = await this.mutex.lock();
    // first check if it exists
    let tabStackItemIndex = this.stackItems.findIndex(
      (tabStackItem) => tabStackItem.tabId === tabId
    );
    // check if there is an item in the tabstack with the same tabId (tabIds should be unique enough that only one would exist)
    if (tabStackItemIndex !== -1) {
      this.stackItems[tabStackItemIndex].windowId = newWindowId;
      await browser.storage.local.set({
        tabStack: this.stackItems,
        currentIndex: tabStackItemIndex,
      });
    }

    unlock();
  }
  async removeFromTabStack(item: TabStackItem) {
    // if the item dows not exist, it will remain the same
    const unlock = await this.mutex.lock();
    // remove item from the stack
    const tabStackItemIndex = this.stackItems.findIndex(
      (tabStackItem) =>
        tabStackItem.tabId === item.tabId &&
        tabStackItem.windowId === item.windowId
    );

    if (tabStackItemIndex !== -1) {
      this.stackItems.splice(tabStackItemIndex, 1);
      await browser.storage.local.set({ tabStack: this.stackItems });
      console.log("Item removed to tab stack: ", item, this.stackItems);
    }
    unlock();
  }
  static setDefaults() {
    // create wraper functions to handle storage reads and writes
    // should still retun defaults if this method fails
    return browser.storage.local.set({
      currentIndex: 0,
      tabStack: [],
      maxStackSize: 3,
    });
  }
  static async load() {
    const unlock = await new Mutex().lock();
    const { currentIndex, tabStack, maxStackSize } =
      (await browser.storage.local.get([
        "currentIndex",
        "tabStack",
        "maxStackSize",
      ])) as StoredData;
      unlock();

    // return a new TabStack object
    return new TabStack(maxStackSize, currentIndex, tabStack);
  }
}
