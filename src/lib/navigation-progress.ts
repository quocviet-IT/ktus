type ClickLike = {
  button?: number;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
};

function normalizedPath(url: URL): string {
  return `${url.pathname}${url.search}`;
}

export function isInternalNavigationTarget(currentHref: string, targetHref: string, origin: string): boolean {
  let current: URL;
  let target: URL;
  try {
    current = new URL(currentHref, origin);
    target = new URL(targetHref, origin);
  } catch {
    return false;
  }

  if (target.origin !== origin) return false;
  return normalizedPath(current) !== normalizedPath(target);
}

export function isInternalTarget(targetHref: string, origin: string): boolean {
  try {
    return new URL(targetHref, origin).origin === origin;
  } catch {
    return false;
  }
}

export function shouldStartNavigationForClick(event: ClickLike, target?: string | null): boolean {
  if ((event.button ?? 0) !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (target && target !== "_self") return false;
  return true;
}
