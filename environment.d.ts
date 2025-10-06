// This file is used to declare the types for your environment variables.
// By doing this, you get autocompletion and type safety in your code.

declare namespace NodeJS {
  interface ProcessEnv {
    // Add your environment variables here with their expected types
    NEXT_PUBLIC_CLIENT_KEY: string;

    // Variables for NextAuth.js and Google Provider
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    NEXTAUTH_URL: string;
    NEXTAUTH_SECRET: string;
  }
}
