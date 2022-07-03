import { addToTabStack, removeFromTabStack } from "./utils";
import browser from "webextension-polyfill";
import { MutexQueue } from "./Mutex";
import { Commands, StoredData, TabStackItem } from "../common/types";
import { TabStack } from "./TabStack";

// PROBLEM - tabstack data might be stale when read in by multiple events
// need some kind of semaphore/mutex
// declare a mutex queue

browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.clear();
  browser.storage.local.set({ currentIndex: 0 });
  TabStack.setDefaults();

  // on install should it add the current tab to the tab stack, and currentIndex
});

browser.commands.onCommand.addListener((command) => {
  TabStack.load().then(async (tabStack) => {
    // should i create wrapper methods for using storage???
    // the current index will most times be the most recent
    if (
      command === Commands.BOOMERANG_LEFT ||
      command === Commands.BOOMERANG_RIGHT
    ) {
      if (tabStack.getLength() > 1) {
        const currentIndex = tabStack.getCurrentIndex();
        const tabStackLength = tabStack.getLength();
        console.log("currentIndex: ", currentIndex);
        console.log(command);
        // https://stackoverflow.com/questions/19999877/loop-seamlessly-over-an-array-forwards-or-backwards-given-an-offset-larger-than
        let newIndex =
          (((currentIndex + (command === Commands.BOOMERANG_RIGHT ? -1 : 1)) %
            tabStackLength) +
            tabStackLength) %
          tabStackLength;
        console.log(newIndex);
        await boomerangToTab(tabStack.getItemAtIndex(newIndex));
        await tabStack.updateCurrentIndex(newIndex);
      }
    }
  });
});

async function boomerangToTab(tab: TabStackItem) {
  console.log(tab);
  await browser.windows.update(tab.windowId, { focused: true });
  await browser.tabs.update(tab.tabId, { active: true });
}

browser.tabs.onActivated.addListener(({ tabId, windowId }) => {
  // hanlde manual selection of a tab in the tabstack (updates the current index)
  TabStack.load().then(async (tabStack) => {
    const tabItem = { tabId, windowId };
    const tabItemIndex = tabStack.findIndex(tabItem);
    if (tabItemIndex !== -1) {
      // if it is in the tab stack, update the current index
      await tabStack.updateCurrentIndex(tabItemIndex);
    }
  });
});

browser.action.onClicked.addListener((tab) => {
    // also add
  // should I use async await inside this method
  TabStack.load().then(async (tabStack) => {
    if (tab?.id && tab.id !== browser.tabs.TAB_ID_NONE && tab.windowId) {
      await tabStack.addToTabStack({ tabId: tab.id, windowId: tab.windowId });
    }
  });
});

browser.tabs.onAttached.addListener((tabId, { newWindowId }) => {
    TabStack.load().then(async tabStack => {
        await tabStack.updateItemWindowId(tabId, newWindowId)
    })
    // tab moves from one window to another
    
});

browser.tabs.onRemoved.addListener((tabId, { windowId }) => {
  TabStack.load().then(async (tabStack) => {
    await tabStack.removeFromTabStack({ tabId, windowId });
  });
});
