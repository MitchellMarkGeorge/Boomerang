import browser from "webextension-polyfill";
import { StoredData, TabStackItem } from "./types";
// import { Mutex, MutexQueue } from "./Mutex";
import { Mutex } from "async-mutex";
// should I set a max size (3)?
// I dont think people would go bast more than that
// most people might only focus on 2 tabs at a time
// the use should also have the option to change this value
export class TabStack {
  // maxStackSize: number;
  // currentTabIndex: number;
  // tabs: TabItem[];
  //   private mutex: Mutex;
  // can also use the mutex queue
  private constructor(
    // private maxStackSize: number = 3,
    private currentIndex: number = 0,
    private stackItems: TabStackItem[] = [],
    private previousIndex: number = 0,
    // private mutex: Mutex,
    private isBoomeranging: boolean = false //
  ) {}

  async exitBoomerangMode() {
    this.isBoomeranging = false;
    this.currentIndex = 0;
    await browser.storage.local.set({ currentIndex: 0, isBoomeranging: false });
  }

  getCurrentIndex() {
    return this.currentIndex;
  }

  async updateCurrentIndex(newIndex: number) {
    // const unlock = await this.mutex.lock();
    // await this.mutex.runExclusive(async () => {
    this.currentIndex = newIndex;
    await browser.storage.local.set({ currentIndex: newIndex });
    // });
    // unlock();
  }

  getIsBoomeranging() {
    return this.isBoomeranging;
  }

  async updateIsBoomeranging(isBoomeranging: boolean) {
    this.isBoomeranging = isBoomeranging;
    await browser.storage.local.set({ isBoomeranging });
  }
  async enterBoomerangMode() {
    this.isBoomeranging = true;
    await browser.storage.local.set({ isBoomeranging : true });
  }

  getPreviousIndex() {
    return this.previousIndex;
  }

  async updatePreviousIndex(currentIndex: number) {
    // await this.mutex.runExclusive(async ()=> {

    this.previousIndex = currentIndex;
    // const unlock = await this.mutex.lock();
    await browser.storage.local.set({ previousIndex: currentIndex });
    // unlock();
    // })
  }

  getStackLength() {
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
    // await this.mutex.runExclusive(async () => {

    // should there be a maximum num of recent tabs to keep in memory?
    // if it is already in the list, it should be removed and added to the top
    // const unlock = await this.mutex.lock();
    let tabStackItemIndex = this.stackItems.findIndex(
      (tabStackItem) =>
        tabStackItem.tabId === item.tabId &&
        tabStackItem.windowId === item.windowId
    );
    console.log(tabStackItemIndex);
    if (tabStackItemIndex !== -1) {
      // meaning it is already in the stack
      // // if for whatever reason it is already at the top, return
      //   if (tabStackItemIndex === 0) {
      //     unlock();
      //     return;
      //   }
      // update the prevoious index of this item
      await this.updatePreviousIndex(tabStackItemIndex);

      // remove the item from its previous position
      this.stackItems.splice(tabStackItemIndex, 1);
      // ass it to the top
      this.stackItems.unshift(item);

      // remove item from where it is
      // put it on top
      // not possible
      // meaning there is already an item in the tab stack with the same value
      // the tab is already in the stack
    } else {
      // simply add to the top
      this.stackItems.unshift(item);
    }
    // could also put the mutex.lock() here as well
    await browser.storage.local.set({
      tabStack: this.stackItems,
      //   currentIndex: 0, // if it is being added, it is the new item at the top if the stack
    });
    console.log("Item added to tab stack: ", item, this.stackItems);
    // unlock();
    // }).catch(err => console.log(err))
  }

  async updateItemWindowId(tabId: number, newWindowId: number) {
    // this.mutex.runExclusive(async () => {

    // const unlock = await this.mutex.lock();
    // first check if it exists
    let tabStackItemIndex = this.stackItems.findIndex(
      (tabStackItem) => tabStackItem.tabId === tabId
    );
    // check if there is an item in the tabstack with the same tabId (tabIds should be unique enough that only one would exist)
    if (tabStackItemIndex !== -1) {
      //   await this.updatePreviousIndex(tabStackItemIndex);
      this.stackItems[tabStackItemIndex].windowId = newWindowId;
      await browser.storage.local.set({
        tabStack: this.stackItems,
      });
    }

    // unlock();
    // })
  }
  async removeFromTabStack(item: TabStackItem) {
    // await this.mutex.runExclusive(async () => {

    // if the item dows not exist, it will remain the same
    // const unlock = await this.mutex.lock();
    // remove item from the stack
    const tabStackItemIndex = this.stackItems.findIndex(
      (tabStackItem) =>
        tabStackItem.tabId === item.tabId &&
        tabStackItem.windowId === item.windowId
    );

    console.log(tabStackItemIndex);

    if (tabStackItemIndex !== -1) {
      console.log(this.stackItems);
      //   await this.updatePreviousIndex(0);
      console.log(this.stackItems.splice(tabStackItemIndex, 1));
      await browser.storage.local.set({ tabStack: this.stackItems });
      console.log("Item removed to tab stack: ", item, this.stackItems);
    }
    // unlock();
    // })
  }
  static setDefaults() {
    // create wraper functions to handle storage reads and writes
    // should still retun defaults if this method fails
    return browser.storage.local.set({
      currentIndex: 0,
      tabStack: [],
      maxStackSize: 3,
      previousIndex: 0,
      isBoomeranging: false,
    });
  }
  static async load(mutex: Mutex) {
    // const unlock = await mutex.lock();
    return await mutex.runExclusive(async () => {
      const { currentIndex, tabStack, previousIndex, isBoomeranging } =
        (await browser.storage.local.get([
          "currentIndex",
          "tabStack",
          "previousIndex",
          "isBoomeranging",
          // "maxStackSize",
        ])) as StoredData;
      // unlock();

      // return a new TabStack object
      return new TabStack(
        currentIndex,
        tabStack,
        previousIndex,
        isBoomeranging
      );
    });
  }
}
