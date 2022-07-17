import browser from "webextension-polyfill";
// import { Mutex, MutexQueue } from "./Mutex";
import { Mutex } from "async-mutex";
import { Commands, isSameTab, StoredData, TabInfo } from "./types";
import { updateStoredData, getStoredData } from "./storage";

// might need to change the shortcuts

// might be able to just use the activeTab permission
// focus on just the previous tab, not the entire tab stack
const mutex = new Mutex();
// just use the mutex out here!


// FOR ALL BROWSER LISTENERS: DO NOT USE ASYNC


browser.runtime.onInstalled.addListener(({ reason }) => {
  browser.storage.local.clear(); // for development
  // should we get the current activetab?
  // on install, add the current tab
  // if (reason === "install") {
  browser.tabs.query({ active: true, currentWindow: true }).then((results) => {
    const [currentTab] = results;
    // how do we handle dev tool windows? they may only have a window id
    // think about this
    if (currentTab.id && currentTab.windowId) {
      updateStoredData({
        currentTab: { windowId: currentTab.windowId, tabId: currentTab.id },
      });
    }
  });
  // }
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
  console.log(tab);
  await browser.windows.update(tab.windowId, { focused: true });
  await browser.tabs.update(tab.tabId, { active: true });
}

browser.tabs.onActivated.addListener(({ tabId, windowId }) => {
  mutex.runExclusive(async () => {
  console.log("active")
    const { currentTab: oldCurrentTab } = await getStoredData("currentTab");
    // what if the oldCurrentTab is undefined (the oldcurrtn tab was removed)
    // this will make the previous tab undefined
    const newCurrentTab = { tabId, windowId };
    console.log("new current tab", newCurrentTab);
    console.log("new previous tab", oldCurrentTab);
    await updateStoredData({
      currentTab: newCurrentTab,
      previousTab: oldCurrentTab,
    });
  });
});

browser.tabs.onRemoved.addListener((tabId, { windowId }) => {
  // what happens if the current tab is removed?
  // what happens if the previous tab is removed?
  mutex.runExclusive(async () => {
  console.log("removed")
    const removedTab = { tabId, windowId };
    console.log("removed tab", removedTab);
    const { currentTab, previousTab } = await getStoredData([
      "currentTab",
      "previousTab",
    ]);
    if (currentTab && isSameTab(currentTab, removedTab)) {
      await updateStoredData({ currentTab: previousTab });
      console.log("updated currentTab");
    } else if (previousTab && isSameTab(previousTab, removedTab)) {
      await updateStoredData({ previousTab: undefined });
      console.log("updated previousTab");
    }
  });
});

// this is basically the same code as the onActive listener
// browser.windows.onFocusChanged.addListener((windowId) => {
//   console.log("window focused");
//   TabStack.load(mutex).then(async (tabStack) => {
//     mutex.runExclusive(async () => {
//       // need to reset when "exiting" the boomeranging state
//       // we only exit the boomeranging state when (review these):
//       // - we create a new tab (think about this)
//       // - we close a tab
//       // - we switch to a tab using an actual click
//       // on exit, the current index is reset to 0 and isBoomeranging is set to 0
//       // the tabstack should be unfrozen and should be allowed to change
//       if (!tabStack.getIsBoomeranging()) {
//         // doing this makes sure the tabstack remain "frozen" in the boomeranging state
//         // get the active in this window
//         const [currentlyActiveTab]  = await chrome.tabs.query({ active: true, windowId})
//         if (currentlyActiveTab && currentlyActiveTab.id) {
//             await tabStack.addToTabStack({ windowId, tabId: currentlyActiveTab.id });
//         }
//       } else {

//             // await tabStack.exitBoomerangMode()
//             // console.log("EXITING BOOMERANGMODE")
//             // await tabStack.addToTabStack();
//       }
//     });
//   });
// });

browser.tabs.onAttached.addListener((tabId, { newWindowId }) => {
  mutex.runExclusive(async () => {
    const { currentTab, previousTab } = await getStoredData(["currentTab", "previousTab"]);
    if (currentTab?.tabId === tabId) {
      currentTab.windowId = newWindowId;
      await updateStoredData({ currentTab })
    } else if (previousTab?.tabId === tabId) {
      previousTab.windowId = newWindowId;
      updateStoredData({ previousTab });
    }
  })

});
