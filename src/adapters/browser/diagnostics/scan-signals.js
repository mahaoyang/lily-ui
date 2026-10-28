function collectBrowserScanSignals({ glInfo, fingerprintJsResult } = {}) {
  const nav = globalThis.navigator || {};
  const scr = globalThis.screen || {};

  const timezone = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch {
      return '';
    }
  })();

  const hasLocalStorage = (() => {
    try {
      return !!globalThis.localStorage;
    } catch {
      return false;
    }
  })();
  const hasSessionStorage = (() => {
    try {
      return !!globalThis.sessionStorage;
    } catch {
      return false;
    }
  })();

  const signals = {
    env: {
      userAgent: nav.userAgent || '',
      platform: nav.platform || '',
      languages: Array.isArray(nav.languages) ? nav.languages : (nav.language ? [nav.language] : []),
      timezone,
      cookiesEnabled: typeof nav.cookieEnabled === 'boolean' ? nav.cookieEnabled : null,
      doNotTrack: nav.doNotTrack ?? null,
      hardwareConcurrency: nav.hardwareConcurrency ?? null,
      deviceMemory: nav.deviceMemory ?? null,
      screen: scr.width && scr.height ? `${scr.width}×${scr.height}` : null,
      pixelRatio: globalThis.devicePixelRatio ?? null,
    },
    storage: {
      localStorage: hasLocalStorage,
      sessionStorage: hasSessionStorage,
      indexedDB: typeof globalThis.indexedDB !== 'undefined',
      serviceWorker: !!nav.serviceWorker,
    },
    graphics: {
      webgl: !!glInfo,
      vendor: glInfo?.vendor || '',
      renderer: glInfo?.renderer || '',
    },
    bot: {
      webdriver: nav.webdriver === true,
      pluginsCount: typeof nav.plugins?.length === 'number' ? nav.plugins.length : null,
      maxTouchPoints: typeof nav.maxTouchPoints === 'number' ? nav.maxTouchPoints : null,
      userAgentDataMobile: typeof nav.userAgentData?.mobile === 'boolean' ? nav.userAgentData.mobile : null,
    },
    fpjs: fingerprintJsResult || null,
  };
  return signals;
}


export { collectBrowserScanSignals };
