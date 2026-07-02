import bcrypt from 'bcryptjs';

const encoder = new TextEncoder();

function base64url(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlDecode(str: string) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Native JWT signing using Web Crypto API (fully compatible with Edge runtime / Middleware)
export async function signJWT(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64url(encoder.encode(JSON.stringify(header)));
  const encodedPayload = base64url(encoder.encode(JSON.stringify(payload)));
  const data = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );

  return `${data}.${base64url(new Uint8Array(signature))}`;
}

// Native JWT verifying using Web Crypto API (fully compatible with Edge runtime / Middleware)
export async function verifyJWT(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const verified = await crypto.subtle.verify(
      'HMAC',
      key,
      base64urlDecode(signature),
      encoder.encode(data)
    );

    if (!verified) return null;

    const payloadStr = new TextDecoder().decode(base64urlDecode(encodedPayload));
    return JSON.parse(payloadStr);
  } catch (error) {
    console.error('JWT verify error:', error);
    return null;
  }
}

// Password hashing helper (uses bcryptjs, runs in standard Node runtime)
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Password comparison helper (uses bcryptjs, runs in standard Node runtime)
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
