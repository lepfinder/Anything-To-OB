chrome.commands.onCommand.addListener((command) => {
  if (command === 'save-to-obsidian') {
    triggerSave();
  }
});

async function triggerSave(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  // Check if the tab is a valid page
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_PAGE' });
  } catch {
    // Content script not injected — ignore
  }
}
