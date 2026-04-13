import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyOtpSchema } from "@/types/schemas";

// In production, replace with real DB lookups and OTP verification.
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  providers: [
    CredentialsProvider({
      name: "Phone OTP",
      credentials: {
        phone: { label: "Phone", type: "text" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        const parsed = verifyOtpSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // TODO: verify OTP from Redis/DB and load user record
        // Placeholder — replace with real verification
        return {
          id: "placeholder-user-id",
          phone: parsed.data.phone,
          name: "Lumigift User",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.phone = (user as { phone?: string }).phone;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { phone?: string }).phone = token.phone as string;
      }
      return session;
    },
  },
};
