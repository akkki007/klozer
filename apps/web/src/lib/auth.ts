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
      managerId: string | null;
      onboardingDone: boolean;
      mustChangePassword: boolean;
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
        identifier: { label: "Email or Employee Code", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null;
        const res = await fetch(`${process.env.API_BASE_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identifier: credentials.identifier,
            password: credentials.password,
          }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return {
          id: data.user_id,
          name: data.name,
          email: (credentials.identifier as string).includes("@")
            ? (credentials.identifier as string)
            : null,
          accessToken: data.access_token,
          orgId: data.org_id,
          role: data.role,
          managerId: null,
          onboardingDone: true,
          isNewUser: false,
          mustChangePassword: data.must_change_password ?? false,
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
        (user as any).managerId = null;
        (user as any).onboardingDone = data.onboarding_done;
        (user as any).isNewUser = data.is_new_user;
        (user as any).mustChangePassword = data.must_change_password ?? false;
        (user as any).id = data.user_id;
      }
      return true;
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.accessToken = (user as any).accessToken;
        token.orgId = (user as any).orgId;
        token.role = (user as any).role;
        token.managerId = (user as any).managerId ?? null;
        token.onboardingDone = (user as any).onboardingDone;
        token.isNewUser = (user as any).isNewUser;
        token.mustChangePassword = (user as any).mustChangePassword ?? false;
      }
      // Allow the client to refresh the token/flag after a password change.
      if (trigger === "update" && session) {
        if (session.accessToken) token.accessToken = session.accessToken;
        if (typeof session.mustChangePassword === "boolean") {
          token.mustChangePassword = session.mustChangePassword;
        }
      }
      return token;
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.user.orgId = token.orgId as string;
      session.user.role = token.role as string;
      session.user.managerId = (token.managerId as string | null) ?? null;
      session.user.onboardingDone = token.onboardingDone as boolean;
      session.user.mustChangePassword = (token.mustChangePassword as boolean) ?? false;
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
