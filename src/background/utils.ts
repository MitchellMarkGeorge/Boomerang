import browser from "webextension-polyfill";
import { TabStackItem } from "../common/types";
import { Mutex } from "./Mutex";
import { TabStack } from "./TabStack";

let MAX_ITEMS = 3;


// https://blog.jcoglan.com/2016/07/12/mutexes-and-javascript/#:~:text=In%20threaded%20languages%2C%20one%20solution,threads%20must%20acquire%20the%20lock.
const mutex = new Mutex();
// using mutexes make sure there are no dataraces when using storage
// lifo
export async function addToTabStack(item: TabStackItem) {
  // shuld not be able to add duplicates
  // if it is already in the list, it should be removed and added to the top
  // wait till you can use
    const unlock = await mutex.lock();
  let tabStack = await getTabStack();
  let tabStackItemIndex = tabStack.findIndex(
    (tabStackItem) =>
      tabStackItem.tabId === item.tabId &&
      tabStackItem.windowId === item.windowId
  );
  if (tabStackItemIndex !== -1) {
    // // if for whatever reason it is already at the top, return
    // if (tabStackItemIndex === 0) {
        // unlock();
    //     return;
    // }
    tabStack.splice(tabStackItemIndex, 1); // remove item
    tabStack.unshift(item); // "re-add" item to the top if he stack
    // meaning there is already an item in the tab stack with the same value
    // the tab is already in the stack
  } else if (tabStack.length === MAX_ITEMS) {
    tabStackItemIndex = 0; // reset it to 0
    // meaning that given tabStackItem is a new onw
    // remove last item
    tabStack.pop();
    // add tab item to the top of stack
    tabStack.unshift(item);
  } else {
    // simply add to the top (it is less than MAX_ITEMS)
    tabStackItemIndex = 0; // reset it to 0
    tabStack.unshift(item);
  }

  // could also put the mutex.lock() here as well
  await browser.storage.local.set({ tabStack });
  console.log("Item added to tab stack: ", item, tabStack);
    unlock();
}

export async function removeFromTabStack(item: TabStackItem) {
  // if the item dows not exist, it will remain the same
    const unlock = await mutex.lock();
  const tabStack = await getTabStack();
  // remove item from the stack
  const tabStackItemIndex = tabStack.findIndex(
    (tabStackItem) =>
      tabStackItem.tabId === item.tabId &&
      tabStackItem.windowId === item.windowId
  );

  if (tabStackItemIndex !== -1) {
    tabStack.splice(tabStackItemIndex, 1);
    await browser.storage.local.set({ tabStack });
    console.log("Item removed to tab stack: ", item, tabStack);
  }
    unlock();
}

export async function getTabStack(): Promise<TabStackItem[]> {
  const { tabStack } = await browser.storage.local.get("tabStack");
  return (tabStack as TabStackItem[]) ?? []; // if not present, return empty array
}
