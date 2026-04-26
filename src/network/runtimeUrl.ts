export function isLoopbackHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

interface ChildlearnEndpointOptions {
  configuredUrl?: string;
  fallbackUrl: string;
  legacyPaths: string[];
  legacyPorts?: string[];
}

const DEFAULT_LEGACY_PORTS = ['8792'];

function runtimeOrigin() {
  if (typeof window === 'undefined') {
    return 'http://localhost';
  }

  return window.location?.origin || 'http://localhost';
}

function isLegacyLoopbackEndpoint(
  urlText: string,
  { legacyPaths, legacyPorts = DEFAULT_LEGACY_PORTS }: ChildlearnEndpointOptions,
) {
  try {
    const url = new URL(urlText, runtimeOrigin());
    return (
      isLoopbackHostname(url.hostname) &&
      legacyPorts.includes(url.port) &&
      legacyPaths.includes(url.pathname)
    );
  } catch {
    return false;
  }
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
    const pageHost = window.location?.hostname || 'localhost';
    if (!isLoopbackHostname(pageHost) && isLoopbackHostname(url.hostname)) {
      url.hostname = pageHost;
    }
    return url.toString();
  } catch {
    return urlText;
  }
}

export function resolveChildlearnEndpoint({
  configuredUrl,
  fallbackUrl,
  legacyPaths,
  legacyPorts,
}: ChildlearnEndpointOptions) {
  const fallback = resolveRuntimeUrl(fallbackUrl) || fallbackUrl;
  const urlText = configuredUrl?.trim();
  if (!urlText) {
    return fallback;
  }

  if (
    isLegacyLoopbackEndpoint(urlText, {
      configuredUrl,
      fallbackUrl,
      legacyPaths,
      legacyPorts,
    })
  ) {
    return fallback;
  }

  return resolveRuntimeUrl(urlText) || urlText;
}
