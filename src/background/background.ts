import { addToTabStack, removeFromTabStack } from "./utils";
import browser from "webextension-polyfill";
// import { Mutex, MutexQueue } from "./Mutex";
import { Mutex } from "async-mutex";
import { Commands, StoredData, TabStackItem } from "../common/types";
import { TabStack } from "./TabStack";

// might be able to just use the activeTab permission

const mutex = new Mutex();
// just use the mutex out here!

browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.clear();
  browser.storage.local.set({ currentIndex: 0 });
  //   browser.action.setBadgeText({ text: "0" });
  TabStack.setDefaults();

  // on install should it add the current tab to the tab stack, and currentIndex
});
// on browse close or if the all the windows close, the stack updated

// browser.storage.onChanged.addListener((changes) => {
//   const newValue = changes["tabStack"]?.newValue as [] | undefined

//   if (newValue) {
//       browser.action.setBadgeText({ text: `${(newValue as []).length ?? 0}` });
//     }
// });

// right now, the number calculations work correctly and the stack is being updated as expected
// the problem is that by the time we want to move to a tab, the positions of those tabs have already been updated (due to new items being added to the stack)
// and they dont move to the expected tab
// the solution to this is to go to the previous index of the tab we want, as that is the context as to which we are commanding the boomerang
browser.commands.onCommand.addListener((command) => {
  if (
    command === Commands.BOOMERANG_LEFT ||
    command === Commands.BOOMERANG_RIGHT
  ) { // only load the tab stack if it is wither of these commands
    TabStack.load(mutex).then(async (tabStack) => {
      // should i create wrapper methods for using storage???
      // the current index will most times be the most recent
      // if (
      //   command === Commands.BOOMERANG_LEFT ||
      //   command === Commands.BOOMERANG_RIGHT
      // ) {
      if (tabStack.getLength() > 1) {
        await mutex.runExclusive(async () => {
          if (!tabStack.getIsBoomeranging()) {
            await tabStack.updateIsBoomeranging(true);
          }
          const currentIndex = tabStack.getCurrentIndex();
          // const previousIndex = tabStack.getPreviousIndex();
          // think of prevous index as the previous position of the tab before it became the mru tab
          const tabStackLength = tabStack.getLength();
          console.log("currentIndex: ", currentIndex);
          // console.log("previousIndex: ", previousIndex);

          console.log(command);
          // https://stackoverflow.com/questions/19999877/loop-seamlessly-over-an-array-forwards-or-backwards-given-an-offset-larger-than
          let newIndex: number;
          if (command === Commands.BOOMERANG_RIGHT) {
            // decreases as we are moving up/forwards in the stack (moving towards the more recent items in the stack)
            newIndex =
              (((currentIndex - 1) % tabStackLength) + tabStackLength) %
              tabStackLength;
          } else {
            // increases as we are going down/backwards in the stack (moving towards less recent items in the stack)
            newIndex =
              (((currentIndex + 1) % tabStackLength) + tabStackLength) %
              tabStackLength;
          }
          // need to figure this one out
          console.log("newIndex", newIndex);
          await boomerangToTab(tabStack.getItemAtIndex(newIndex));
          // mutex.runExclusive(async () => {
          //   await tabStack.updatePreviousIndex(currentIndex);
          await tabStack.updateCurrentIndex(newIndex);
          // });
        });
        //   }
      }
    });
  }
});

async function boomerangToTab(tab: TabStackItem) {
  console.log(tab);
  await browser.windows.update(tab.windowId, { focused: true });
  await browser.tabs.update(tab.tabId, { active: true });
}

// browser.tabs.onActivated.addListener(({ tabId, windowId }) => {
//   // hanlde manual selection of a tab in the tabstack (updates the current index)
//   TabStack.load().then(async (tabStack) => {
//     const tabItem = { tabId, windowId };
//     const tabItemIndex = tabStack.findIndex(tabItem);
//     if (tabItemIndex !== -1) {
//       // if it is in the tab stack, update the current index
//       await tabStack.updateCurrentIndex(tabItemIndex);
//     }
//   });
// });


browser.tabs.onActivated.addListener(({ tabId, windowId }) => {
  console.log("active");
  TabStack.load(mutex).then(async (tabStack) => {
    mutex.runExclusive(async () => {
      // need to reset when "exiting" the boomeranging state 
      // we only exit the boomeranging state when (review these):
      // - we create a new tab (think about this)
      // - we close a tab
      // - we switch to a tab using an actual click
      // on exit, the current index is reset to 0 and isBoomeranging is set to 0
      // the tabstack should be unfrozen and should be allowed to change
      if (!tabStack.getIsBoomeranging()) {
        // doing this makes sure the tabstack remain "frozen" in the boomeranging state
        await tabStack.addToTabStack({ windowId, tabId });
      }
    });
  });
});

browser.windows.onFocusChanged.addListener((windowId) => {
  console.log("window focused");
  TabStack.load(mutex).then(async (tabStack) => {
    mutex.runExclusive(async () => {
      // need to reset when "exiting" the boomeranging state 
      // we only exit the boomeranging state when (review these):
      // - we create a new tab (think about this)
      // - we close a tab
      // - we switch to a tab using an actual click
      // on exit, the current index is reset to 0 and isBoomeranging is set to 0
      // the tabstack should be unfrozen and should be allowed to change
      if (!tabStack.getIsBoomeranging()) {
        // doing this makes sure the tabstack remain "frozen" in the boomeranging state
        // get the active in this window
        const [currentlyActiveTab]  = await chrome.tabs.query({ active: true, windowId})
        if (currentlyActiveTab && currentlyActiveTab.id) {
            await tabStack.addToTabStack({ windowId, tabId: currentlyActiveTab.id });
        }
      }
    });
  });
});

// browser.action.onClicked.addListener((tab) => {
//   // also add
//   // should I use async await inside this method
//   TabStack.load().then(async (tabStack) => {
//     if (tab?.id && tab.id !== browser.tabs.TAB_ID_NONE && tab.windowId) {
//       await tabStack.addToTabStack({ tabId: tab.id, windowId: tab.windowId });
//     }
//   });
// });

browser.tabs.onAttached.addListener((tabId, { newWindowId }) => {
  TabStack.load(mutex).then(async (tabStack) => {
    mutex.runExclusive(async () => {
      await tabStack.updateItemWindowId(tabId, newWindowId);
    });
  });
  // tab moves from one window to another
});

browser.tabs.onRemoved.addListener((tabId, { windowId }) => {
  console.log("here");
  TabStack.load(mutex).then(async (tabStack) => {
    if (tabStack.getIsBoomeranging()) {
        await tabStack.reset();
    }
    mutex.runExclusive(async () => {
      await tabStack.removeFromTabStack({ tabId, windowId });
    });
  });
});
