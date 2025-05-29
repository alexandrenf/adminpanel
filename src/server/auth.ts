import { PrismaAdapter } from "@auth/prisma-adapter";
import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
} from "next-auth";
import { type Adapter } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";

import { env } from "~/env";
import { db } from "~/server/db";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && account.access_token && profile) {
        try {
          // Fetch fresh user data from Google API
          const response = await fetch(
            "https://www.googleapis.com/oauth2/v1/userinfo?alt=json",
            {
              headers: {
                Authorization: `Bearer ${account.access_token}`,
              },
            }
          );

          if (response.ok) {
            const googleProfile = await response.json() as {
              id: string;
              name: string;
              email: string;
              picture: string;
            };

            // Update user in database with fresh data
            await db.user.update({
              where: { email: googleProfile.email },
              data: {
                name: googleProfile.name,
                email: googleProfile.email,
                image: googleProfile.picture,
              },
            });

            console.log(`Updated profile for user: ${googleProfile.email}`);
          }
        } catch (error) {
          console.error("Error updating user profile on sign in:", error);
          // Don't prevent sign in if profile update fails
        }
      }
      return true;
    },
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
  },
  adapter: PrismaAdapter(db) as Adapter,
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid email profile",
          access_type: "offline",
          prompt: "consent",
        },
      },
    })
  ],
};

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = () => getServerSession(authOptions);
