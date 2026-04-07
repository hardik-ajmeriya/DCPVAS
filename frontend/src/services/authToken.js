let tokenGetter = null;

export function setTokenGetter(getter) {
  tokenGetter = typeof getter === 'function' ? getter : null;
}

export async function getAuthToken() {
  if (!tokenGetter) return null;
  try {
    const token = await tokenGetter();
    return token || null;
  } catch {
    return null;
  }
}
