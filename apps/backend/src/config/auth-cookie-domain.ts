const hostedOpenStatCookieDomain = "openstat.online";

export function resolveAuthCookieDomain(options: {
  apiPublicUrl: string;
  appWebUrl: string;
  configuredDomain?: string;
}) {
  const apiHostname = new URL(options.apiPublicUrl).hostname.toLowerCase();
  const webHostname = new URL(options.appWebUrl).hostname.toLowerCase();

  if (
    isHostnameInDomain(apiHostname, hostedOpenStatCookieDomain) &&
    isHostnameInDomain(webHostname, hostedOpenStatCookieDomain)
  ) {
    return `.${hostedOpenStatCookieDomain}`;
  }

  return options.configuredDomain;
}

function isHostnameInDomain(hostname: string, domain: string) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}
