import type { NextAuthConfig } from "next-auth";
import { ROLE_HOME } from "@/lib/roles";
import type { Role } from "@/generated/prisma/client";

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request }) {
      const user = auth?.user;
      const { pathname } = request.nextUrl;

      const protectedPrefixes = ["/admin", "/mentor", "/student"] as const;
      const matchedPrefix = protectedPrefixes.find((prefix) =>
        pathname.startsWith(prefix)
      );

      if (!matchedPrefix) return true;
      if (!user) return false;

      const expectedPrefix = ROLE_HOME[user.role];
      if (!pathname.startsWith(expectedPrefix)) {
        return Response.redirect(new URL(expectedPrefix, request.nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
