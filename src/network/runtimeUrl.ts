export function isLoopbackHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function resolveRuntimeUrl(configuredUrl?: string) {
  const urlText = configuredUrl?.trim();
  if (!urlText) {
    return '';
  }

  if (typeof window === 'undefined') {
    return urlText;
  }

  try {
    const url = new URL(urlText);
    const pageHost = window.location.hostname;
    if (!isLoopbackHostname(pageHost) && isLoopbackHostname(url.hostname)) {
      url.hostname = pageHost;
    }
    return url.toString();
  } catch {
    return urlText;
  }
}
