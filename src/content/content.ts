chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'EXTRACT_PAGE') {
    const data = {
      html: document.documentElement.outerHTML,
      url: window.location.href,
      title: document.title,
      description: getMetaContent('description') || getMetaContent('og:description') || '',
    };
    sendResponse(data);
  }
  return true; // Keep message channel open for async
});

function getMetaContent(name: string): string {
  const el =
    document.querySelector(`meta[name="${name}"]`) ||
    document.querySelector(`meta[property="${name}"]`);
  return el?.getAttribute('content') || '';
}
