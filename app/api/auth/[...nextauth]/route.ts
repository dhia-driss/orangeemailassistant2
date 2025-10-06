import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";

// Ensure you have these environment variables set in your .env.local file
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!googleClientId || !googleClientSecret) {
  throw new Error("Missing Google OAuth environment variables");
}

/**
 * The configuration options for NextAuth.js.
 * Exporting this object allows us to use it in other parts of the application,
 * for example, to get the server-side session in our API routes.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      authorization: {
        params: {
          // Request the readonly scope to access Gmail
          scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly",
          // Request a refresh token to stay logged in
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Use a local `any`-typed variable to avoid TypeScript complaints about custom fields
      const t = token as any;

      // If this is the initial sign in, persist access and refresh tokens
      if (account) {
        t.accessToken = account.access_token;
        t.refreshToken = account.refresh_token;
        // Set an expiry time (ms). `expires_in` from the provider is in seconds.
        if (account.expires_in) {
          t.accessTokenExpires = Date.now() + Number(account.expires_in) * 1000;
        } else {
          // default to 1 hour if provider didn't return expires_in
          t.accessTokenExpires = Date.now() + 60 * 60 * 1000;
        }
        return t;
      }

      // If access token has not expired yet, just return it
      if (t.accessToken && t.accessTokenExpires && Date.now() < Number(t.accessTokenExpires)) {
        return t;
      }

      // Access token has expired, try to refresh it
      try {
        if (!t.refreshToken) {
          // No refresh token available - can't refresh
          return t;
        }

        // Use Google's OAuth token endpoint to refresh the access token
        const url = "https://oauth2.googleapis.com/token";
        const params = new URLSearchParams();
        params.append("client_id", googleClientId);
        params.append("client_secret", googleClientSecret);
        params.append("refresh_token", String(t.refreshToken));
        params.append("grant_type", "refresh_token");

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
        });

        if (!res.ok) {
          console.error("Failed to refresh access token", await res.text());
          return t;
        }

        const refreshed = await res.json();
        // refreshed: { access_token, expires_in, scope, token_type, id_token }
        t.accessToken = refreshed.access_token;
        if (refreshed.expires_in) {
          t.accessTokenExpires = Date.now() + Number(refreshed.expires_in) * 1000;
        } else {
          t.accessTokenExpires = Date.now() + 60 * 60 * 1000;
        }
        // The refresh token may or may not be returned. Preserve the old one if not.
        if (refreshed.refresh_token) {
          t.refreshToken = refreshed.refresh_token;
        }

        return t;
      } catch (err) {
        console.error("Error refreshing access token:", err);
        return t;
      }
    },
    async session({ session, token }) {
      // Send properties to the client, like an access_token.
      (session as any).accessToken = token.accessToken;
      (session as any).refreshToken = token.refreshToken;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

