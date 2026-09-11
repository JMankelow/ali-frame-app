// Deliberately has no server-only dependencies (no argon2 import) so it's
// safe for client components to import — e.g. to set an input's minLength
// or show the same validation message client-side before submitting.
export const MIN_PASSWORD_LENGTH = 12;

export function validatePasswordStrength(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
  }
  return null;
}
