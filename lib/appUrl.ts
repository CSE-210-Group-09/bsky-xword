// VITE_APP_URL is for the deployed build, locally it just uses the current site.
export function getAppUrl(configured: string | undefined = import.meta.env.VITE_APP_URL): string {
  const url = configured?.trim() || window.location.origin;
  return url.endsWith('/') ? url : `${url}/`;
}
