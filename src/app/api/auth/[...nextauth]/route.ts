import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import crypto from "crypto";

const E2EE_SERVER_SECRET =
  process.env.NEXTAUTH_SECRET || "fallback_server_secret_32_bytes_long";

// 1. We must pad or truncate the secret to exactly 32 bytes for AES-256
const getDerivedKey = () =>
  crypto.createHash("sha256").update(String(E2EE_SERVER_SECRET)).digest();

/**
 * Wraps the raw RSA private key in a symmetric AES-256-GCM encryption layer
 * managed completely securely by the server environment.
 */
function wrapPrivateKey(privateKey: string): string {
  if (!privateKey) return "";
  try {
    const key = getDerivedKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    let encrypted = cipher.update(privateKey, "utf8", "base64");
    encrypted += cipher.final("base64");
    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      iv: iv.toString("base64"),
      encrypted,
      authTag: authTag.toString("base64"),
    });
  } catch (err) {
    console.error("AES Wrap error", err);
    return "";
  }
}

/**
 * Unwraps the AES-256-GCM layer to return the raw RSA private key
 * to be delivered back over secure HTTPS/JWE tunnel to the client's React memory.
 */
function unwrapPrivateKey(wrapped: string): string {
  if (!wrapped) return "";
  try {
    const { iv, encrypted, authTag } = JSON.parse(wrapped);
    const key = getDerivedKey();
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(authTag, "base64"));
    let decrypted = decipher.update(encrypted, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("AES Unwrap error", err);
    return "";
  }
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        publicKey: { label: "Public Key", type: "text" },
        privateKey: { label: "Private Key", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
        const res = await fetch(`${backendUrl}/api/auth/login`, {
          method: "POST",
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
          headers: { "Content-Type": "application/json" },
        });

        const data = await res.json();

        if (res.ok && data.user) {
          let finalWrappedPrivateKey = data.user.encryptedPrivateKey;
          let finalPublicKey = data.user.publicKey;

          // If the DB has no persistent keys but the client generated them (First login)
          if (
            !finalWrappedPrivateKey &&
            credentials.publicKey &&
            credentials.privateKey
          ) {
            finalWrappedPrivateKey = wrapPrivateKey(credentials.privateKey);
            finalPublicKey = credentials.publicKey;

            try {
              await fetch(`${backendUrl}/api/auth/keys`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${data.token}`,
                },
                body: JSON.stringify({
                  publicKey: credentials.publicKey,
                  encryptedPrivateKey: finalWrappedPrivateKey,
                }),
              });
            } catch (err) {
              console.error(
                "Failed to upload new E2EE keys to DB during NextAuth authorize",
                err,
              );
            }
          }

          return {
            id: data.user.id,
            email: data.user.email,
            role: data.user.role,
            is_active: data.user.is_active,
            publicKey: finalPublicKey,
            token: data.token,
            wrappedPrivateKey: finalWrappedPrivateKey,
          } as any;
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // Initial sign in
        const usr = user as any;
        token.id = usr.id;
        token.role = usr.role;
        token.is_active = usr.is_active;
        token.publicKey = usr.publicKey;
        token.accessToken = usr.token;

        // ATTACH THE PRE-WRAPPED PRIVATE KEY DIRECTLY
        if (usr.wrappedPrivateKey) {
          token.wrappedPrivateKey = usr.wrappedPrivateKey;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        // Map token values to session
        const anySessionUser = session.user as any;
        anySessionUser.id = token.id;
        anySessionUser.role = token.role;
        anySessionUser.is_active = token.is_active;
        anySessionUser.publicKey = token.publicKey;
        anySessionUser.token = token.accessToken;

        // UNWRAP THE PRIVATE KEY FOR CLIENT REACT MEMORY
        if (token.wrappedPrivateKey) {
          anySessionUser.privateKey = unwrapPrivateKey(
            token.wrappedPrivateKey as string,
          );
        }
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback_server_secret_32_bytes_long",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
