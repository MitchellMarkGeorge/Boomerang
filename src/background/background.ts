import browser from "webextension-polyfill";
// import { Mutex, MutexQueue } from "./Mutex";
import { Mutex } from "async-mutex";
import { Commands, isSameTab, StoredData, TabInfo } from "./types";
import { updateStoredData, getStoredData } from "./storage";

// might need to change the shortcuts
// think of best command
// might be able to just use the activeTab permission
const mutex = new Mutex();
// FOR ALL BROWSER LISTENERS: DO NOT USE ASYNC

browser.runtime.onInstalled.addListener(({ reason }) => {
  // browser.storage.local.clear(); // for development
  // on install, add the current tab
  if (reason === "install") {
    getActiveTab().then((currentTab) => {
      // how do we handle dev tool windows? they may only have a window id
      // think about this
      if (
        currentTab?.id &&
        currentTab.id !== browser.tabs.TAB_ID_NONE &&
        currentTab.windowId &&
        currentTab.windowId !== browser.windows.WINDOW_ID_NONE
      ) {
        updateStoredData({
          currentTab: { windowId: currentTab.windowId, tabId: currentTab.id },
          previousTab: null,
        });
      }
    });
  }
});
browser.commands.onCommand.addListener((command) => {
  if (command === Commands.BOOMERANG) {
    // go to the previous tab
    mutex.runExclusive(async () => {
      const { previousTab } = await getStoredData("previousTab");
      if (previousTab) {
        // if there is a previousTab, boomerang to it
        await boomerangToTab(previousTab);
        // the onActive listerner will hanlde the switch
      }
    });
  }
});

async function boomerangToTab(tab: TabInfo) {
  await browser.windows.update(tab.windowId, { focused: true });
  await browser.tabs.update(tab.tabId, { active: true });
}

async function getActiveTab() {
  const result = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  return result[0];
}

browser.tabs.onActivated.addListener(({ tabId, windowId }) => {
  mutex.runExclusive(async () => {
    console.log("active");
    const { currentTab: oldCurrentTab } = await getStoredData("currentTab");
    // what if the oldCurrentTab is undefined (the oldcurrtn tab was removed)
    // this will make the previous tab undefined
    const newCurrentTab = { tabId, windowId };
    // there is the case that when switching beteen a tab and a window, the new active tab and the old current will be the same
    // this happens when the window focus event has already handles the tab order but the active event wantw to handle it again
    if (oldCurrentTab && isSameTab(newCurrentTab, oldCurrentTab)) {
      return;
    }
    console.log("new current tab", newCurrentTab);
    console.log("new previous tab", oldCurrentTab);
    await updateStoredData({
      currentTab: newCurrentTab,
      previousTab: oldCurrentTab,
    });
  });
});

// this is basically the same code as the onActive listener
browser.windows.onFocusChanged.addListener((windowId) => {
  console.log(windowId);
  mutex.runExclusive(async () => {
    console.log("focused");
    const { currentTab: oldCurrentTab } = await getStoredData("currentTab");
    console.log("new previous tab", oldCurrentTab);
    const [activeTab] = await browser.tabs.query({ active: true, windowId });
    console.log("active tab", activeTab);
    if (
      activeTab &&
      activeTab.id &&
      activeTab.id !== browser.tabs.TAB_ID_NONE &&
      windowId !== browser.windows.WINDOW_ID_NONE
    ) {
      const newCurrentTab: TabInfo = { tabId: activeTab.id, windowId };
      // this is needed as when all the browser windows have lost focus, this event is also called
      // when it refocuses on the browser, it thinks that the currently acive tab is new so we have to tell the extension to ignore it
      // so when it refocuses, the "current" tab will be will be refocused and will become the previous as well

      if (oldCurrentTab && isSameTab(newCurrentTab, oldCurrentTab)) {
        return;
      }
      await updateStoredData({
        currentTab: newCurrentTab,
        previousTab: oldCurrentTab,
      });
    }
  });
});

browser.tabs.onRemoved.addListener((tabId, { windowId, isWindowClosing }) => {
  mutex.runExclusive(async () => {
    console.log("removed");
    const removedTab = { tabId, windowId };
    console.log("removed tab", removedTab);
    const { currentTab, previousTab } = await getStoredData([
      "currentTab",
      "previousTab",
    ]);
    if (currentTab && isSameTab(currentTab, removedTab)) {
      await updateStoredData({ currentTab: null }); // cant use undefined value
      console.log("updated currentTab");
    } else if (previousTab && isSameTab(previousTab, removedTab)) {
      await updateStoredData({ previousTab: null });
      console.log("updated previousTab");
    }
  });
});

browser.tabs.onAttached.addListener((tabId, { newWindowId }) => {
  mutex.runExclusive(async () => {
    console.log("attached");
    const { currentTab, previousTab } = await getStoredData([
      "currentTab",
      "previousTab",
    ]);
    if (currentTab?.tabId === tabId) {
      currentTab.windowId = newWindowId;
      await updateStoredData({ currentTab });
    } else if (previousTab?.tabId === tabId) {
      previousTab.windowId = newWindowId;
      updateStoredData({ previousTab });
    }
  });
});
