import speakeasy from "speakeasy";

export function generateTotpSecret(userEmail: string) {
  const secret = speakeasy.generateSecret({
    length: 20,
    name: `Zlobodan Couverture (${userEmail})`,
    issuer: "Zlobodan Couverture SRL",
  });

  return {
    ascii: secret.ascii,
    hex: secret.hex,
    base32: secret.base32,
    otpauth_url: secret.otpauth_url,
  };
}

export function verifyTotpToken(secretBase32: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret: secretBase32,
    encoding: "base32",
    token: token.trim(),
    window: 1, // Allow 30 seconds drift
  });
}
