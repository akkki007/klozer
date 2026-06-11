import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import FacebookProvider from "next-auth/providers/facebook";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken: string;
    isNewUser: boolean;
    user: {
      orgId: string;
      role: string;
      onboardingDone: boolean;
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    FacebookProvider({
      clientId: process.env.AUTH_FACEBOOK_ID!,
      clientSecret: process.env.AUTH_FACEBOOK_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const res = await fetch(`${process.env.API_BASE_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: credentials.email, password: credentials.password }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return {
          id: data.user_id,
          name: data.name,
          email: credentials.email as string,
          accessToken: data.access_token,
          orgId: data.org_id,
          role: data.role,
          onboardingDone: true,
          isNewUser: false,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "facebook" && profile) {
        const res = await fetch(`${process.env.API_BASE_URL}/api/auth/social`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: "facebook",
            fb_id: profile.id ?? profile.sub,
            name: profile.name,
            email: profile.email,
          }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        (user as any).accessToken = data.access_token;
        (user as any).orgId = data.org_id;
        (user as any).role = data.role;
        (user as any).onboardingDone = data.onboarding_done;
        (user as any).isNewUser = data.is_new_user;
        (user as any).id = data.user_id;
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as any).accessToken;
        token.orgId = (user as any).orgId;
        token.role = (user as any).role;
        token.onboardingDone = (user as any).onboardingDone;
        token.isNewUser = (user as any).isNewUser;
      }
      return token;
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.user.orgId = token.orgId as string;
      session.user.role = token.role as string;
      session.user.onboardingDone = token.onboardingDone as boolean;
      session.isNewUser = token.isNewUser as boolean;
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
});
