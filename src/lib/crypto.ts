// Native Web Crypto API wrapper for End-to-End Encryption (E2EE)

/**
 * ArrayBuffer to Base64 String
 */
function bufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Base64 String to ArrayBuffer
 */
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generate a new RSA-OAEP Key Pair for a user (2048-bit)
 */
export async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
  return await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true, // extractable
    ["encrypt", "decrypt"],
  );
}

/**
 * Export Public Key to Base64 SPKI
 */
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  return bufferToBase64(exported);
}

/**
 * Import Public Key from Base64 SPKI
 */
export async function importPublicKey(spkiBase64: string): Promise<CryptoKey> {
  const buffer = base64ToBuffer(spkiBase64);
  return await window.crypto.subtle.importKey(
    "spki",
    buffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"],
  );
}

/**
 * Export Private Key to Base64 PKCS8
 */
export async function exportPrivateKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("pkcs8", key);
  return bufferToBase64(exported);
}

/**
 * Import Private Key from Base64 PKCS8
 */
export async function importPrivateKey(
  pkcs8Base64: string,
): Promise<CryptoKey> {
  const buffer = base64ToBuffer(pkcs8Base64);
  return await window.crypto.subtle.importKey(
    "pkcs8",
    buffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"],
  );
}

/**
 * Encrypt a message string for a receiver and the sender.
 * Generates an ephemeral AES-GCM key, encrypts the message,
 * then encrypts the AES key with both RSA public keys.
 */
export async function encryptE2EEMessage(
  plaintext: string,
  senderPublicKey: CryptoKey,
  receiverPublicKey: CryptoKey,
) {
  // 1. Generate ephemeral AES-GCM key
  const aesKey = await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );

  // 2. Encrypt plaintext
  const encoder = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedContentBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    aesKey,
    encoder.encode(plaintext),
  );

  // 3. Export raw AES key to encrypt it with RSA
  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

  // 4. Encrypt AES key for sender
  const encryptedKeyForSenderBuffer = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    senderPublicKey,
    rawAesKey,
  );

  // 5. Encrypt AES key for receiver
  const encryptedKeyForReceiverBuffer = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    receiverPublicKey,
    rawAesKey,
  );

  return JSON.stringify({
    iv: bufferToBase64(iv.buffer),
    encryptedData: bufferToBase64(encryptedContentBuffer),
    encryptedKeyForSender: bufferToBase64(encryptedKeyForSenderBuffer),
    encryptedKeyForReceiver: bufferToBase64(encryptedKeyForReceiverBuffer),
  });
}

/**
 * Decrypt an E2EE message string.
 */
export async function decryptE2EEMessage(
  payloadJson: string,
  privateKey: CryptoKey,
  isSender: boolean,
): Promise<string> {
  try {
    const payload = JSON.parse(payloadJson);
    const encryptedKeyB64 = isSender
      ? payload.encryptedKeyForSender
      : payload.encryptedKeyForReceiver;

    let rawAesKeyBuffer: ArrayBuffer;
    try {
      // 1. Decrypt the AES key
      rawAesKeyBuffer = await window.crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        base64ToBuffer(encryptedKeyB64),
      );
    } catch (primaryErr) {
      console.warn("Primary AES key decryption failed. Trying fallback key...");
      // 1b. Fallback attempt: if strict ID matching failed, try the OTHER key in the payload
      const fallbackKeyB64 = isSender
        ? payload.encryptedKeyForReceiver
        : payload.encryptedKeyForSender;
      rawAesKeyBuffer = await window.crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        base64ToBuffer(fallbackKeyB64),
      );
    }

    // 2. Import the AES key
    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      rawAesKeyBuffer,
      { name: "AES-GCM" },
      false,
      ["decrypt"],
    );

    // 3. Decrypt the message
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: base64ToBuffer(payload.iv),
      },
      aesKey,
      base64ToBuffer(payload.encryptedData),
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    console.error("Decryption failed", err);
    return "[Encrypted Message - Unable to Decrypt]";
  }
}
