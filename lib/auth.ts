export const COOKIE_NAME = "factory-auth";
export const COOKIE_VALUE = "1";
export const COOKIE_MAX_AGE = 60 * 60 * 24; // 1 day

export function isFactoryAuthConfigured() {
  return Boolean(process.env.FACTORY_USER && process.env.FACTORY_PASS);
}

export function validateFactoryCredentials(username: string, password: string) {
  return username === process.env.FACTORY_USER && password === process.env.FACTORY_PASS;
}

export function createAuthCookieValue() {
  return COOKIE_VALUE;
}

export function isValidAuthCookie(value?: string | null) {
  return value === COOKIE_VALUE;
}
