import { prisma } from "@/lib/prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import NextAuth, { type AuthOptions } from "next-auth";

const googleClient = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export const authConfig: AuthOptions = {
  adapter: PrismaAdapter(prisma) as any,

  providers: [
    // ---------------------------------------------------------
    // 1. NORMAL CREDENTIALS LOGIN
    // ---------------------------------------------------------
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing fields");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        if (!user) throw new Error("Email not found");
        if (!user.password) throw new Error("No password set");

        const valid = await bcrypt.compare(credentials.password, user.password);

        if (!valid) throw new Error("Wrong password");

        const { password, ...safeUser } = user;
        return safeUser as any;
      },
    }),

    // ---------------------------------------------------------
    // 2. GOOGLE ONE TAP LOGIN  (ID TOKEN BASED)
    // ---------------------------------------------------------
    Credentials({
      id: "google-one-tap",
      name: "Google One Tap",
      credentials: {
        credential: { label: "Credential", type: "text" },
      },

      async authorize(credentials) {
        if (!credentials?.credential) {
          throw new Error("No credential provided");
        }

        try {
          const ticket = await googleClient.verifyIdToken({
            idToken: credentials.credential,
            audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          });

          const payload = ticket.getPayload();

          if (!payload || !payload.email) {
            throw new Error("Invalid token payload");
          }

          // Lookup or create the user
          const email = payload.email.toLowerCase().trim();
          let user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user) {
            user = await prisma.user.create({
              data: {
                email,
                name: payload.name || null,
                image: payload.picture || null,
                emailVerified: payload.email_verified ? new Date() : null,
              },
            });
            // The panels read `avatarUrl` (not in the Prisma model): keep it in sync with `image`
            if (payload.picture) {
              await prisma
                .$runCommandRaw({ update: "User", updates: [{ q: { _id: user.id }, u: { $set: { avatarUrl: payload.picture } } }] })
                .catch(() => {});
            }
          } else {
            // Only fill what is missing: a name or photo the user set themselves is never overwritten
            const data: { name?: string; image?: string; emailVerified?: Date } = {};
            if (!user.name && payload.name) data.name = payload.name;
            if (!user.image) {
              // A photo uploaded in the client panel lives in `avatarUrl` (not in the Prisma model)
              const raw = ((await prisma.user
                .findRaw({ filter: { _id: user.id }, options: { limit: 1, projection: { avatarUrl: 1 } } })
                .catch(() => [])) as unknown as any[])[0];
              const photo = (typeof raw?.avatarUrl === "string" && raw.avatarUrl) || payload.picture;
              if (photo) data.image = photo;
            }
            if (!user.emailVerified && payload.email_verified) data.emailVerified = new Date();
            if (Object.keys(data).length) {
              user = await prisma.user.update({ where: { id: user.id }, data });
            }
            if (data.image) {
              await prisma
                .$runCommandRaw({ update: "User", updates: [{ q: { _id: user.id, avatarUrl: { $in: [null, ""] } }, u: { $set: { avatarUrl: data.image } } }] })
                .catch(() => {});
            }
          }

          // ---------------------------------------------------------
          // FIX: LINK GOOGLE ONE TAP AS AN ACCOUNT ENTRY
          // PREVENTS OAuthAccountNotLinked ERROR
          // (lookup and create use the same provider, or the second sign-in hits the unique constraint)
          // ---------------------------------------------------------
          await prisma.account.upsert({
            where: {
              provider_providerAccountId: {
                provider: "google",
                providerAccountId: payload.sub, // Google unique ID
              },
            },
            // Shared with the Google OAuth provider: keep its access token, only refresh the ID token
            update: {
              id_token: credentials.credential,
            },
            create: {
              userId: user.id,
              provider: "google",
              providerAccountId: payload.sub,
              type: "oauth",
              access_token: credentials.credential,
              id_token: credentials.credential,
              token_type: "id_token",
            },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (error) {
          console.error("Google One Tap verification error:", error);
          throw new Error("Authentication failed");
        }
      },
    }),

    // ---------------------------------------------------------
    // 3. NORMAL GOOGLE OAUTH LOGIN
    // ---------------------------------------------------------
    Google({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      clientSecret: process.env.NEXT_GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  // ---------------------------------------------------------
  // PAGES
  // ---------------------------------------------------------
  pages: {
    signIn: "/",
    signOut: "/",
    error: "/",
  },

  // ---------------------------------------------------------
  // CALLBACKS
  // ---------------------------------------------------------
  callbacks: {
    async signIn({ user, account }: { user: any; account: any }) {
      // AUTO-LINK NORMAL GOOGLE OAUTH (OPTIONAL EXTRA SAFETY)
      if (account?.provider === "google") {
        const existing = await prisma.user.findUnique({
          where: { email: user.email },
          include: { accounts: true },
        });

        if (
          existing &&
          !existing.accounts.some((a) => a.provider === "google")
        ) {
          await prisma.account.create({
            data: {
              userId: existing.id,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              type: account.type,
              access_token: account.access_token,
              expires_at: account.expires_at,
              refresh_token: account.refresh_token,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
            },
          });
        }
      }

      return true;
    },

    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      if (url && (url.startsWith("http://localhost:5000") || url.startsWith("http://localhost:3000"))) {
        return url;
      }
      return baseUrl;
    },

    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.image = token.image;
        session.user.role = token.role;
      }

      if (token?.accessToken) {
        session.accessToken = token.accessToken;
      }

      return session;
    },

    jwt({ token, user, trigger, session }: { token: any; user?: any; trigger?: string; session?: any }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.image = user.image;
        token.role = user.role;
      }

      if (trigger === "update" && session?.user) {
        token.name = session.user.name;
      }

      return token;
    },
  },

  // ---------------------------------------------------------
  // FINAL SETTINGS
  // ---------------------------------------------------------
  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
};

const authResult = NextAuth(authConfig);

export const handlers = authResult;
// export async function auth() {
//     const { getServerSession } = await import("next-auth/next");
//     return getServerSession(authConfig);
// }
// src/app/api/auth/[...nextauth]/route.ts  (or auth.ts)
// import { prisma } from "@/lib/prisma";
// import { PrismaAdapter } from "@auth/prisma-adapter";
// import NextAuth from "next-auth";
// import Google from "next-auth/providers/google";
// import Credentials from "next-auth/providers/credentials";
// import bcrypt from "bcryptjs";
// import { OAuth2Client } from "google-auth-library";

// const googleClient = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

// export const authConfig = {
//   adapter: PrismaAdapter(prisma),
//   providers: [
//     // 1. Regular email/password
//     Credentials({
//       name: "Credentials",
//       credentials: {
//         email: { label: "Email", type: "text" },
//         password: { label: "Password", type: "password" },
//       },
//       async authorize(credentials) {
//         if (!credentials?.email || !credentials?.password) return null;

//         const user = await prisma.user.findUnique({
//           where: { email: credentials.email },
//         });

//         if (!user || !user.password) return null;

//         const isValid = await bcrypt.compare(credentials.password, user.password);
//         if (!isValid) return null;

//         return {
//           id: user.id,
//           email: user.email,
//           name: user.name,
//           image: user.image,
//           role: user.role,
//         };
//       },
//     }),

//     // 2. Google (handles BOTH regular OAuth + One Tap)
//     Google({
//       clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
//       clientSecret: process.env.NEXT_GOOGLE_CLIENT_SECRET!,
//       authorization: {
//         params: {
//           prompt: "consent",
//           access_type: "offline",
//           response_type: "code",
//         },
//       },
//       // THIS IS THE KEY: handle One Tap token manually
//       async profile(profile, tokens) {
//         // If we have an `id_token` from One Tap (passed via client), verify it
//         if (tokens.id_token) {
//           try {
//             const ticket = await googleClient.verifyIdToken({
//               idToken: tokens.id_token as string,
//               audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
//             });
//             const payload = ticket.getPayload();
//             if (payload) {
//               return {
//                 id: payload.sub,
//                 name: payload.name ?? null,
//                 email: payload.email!,
//                 image: payload.picture ?? null,
//                 email_verified: payload.email_verified ?? false,
//               };
//             }
//           } catch (error) {
//             console.error("One Tap ID token verification failed:", error);
//             // Fall back to regular OAuth flow
//           }
//         }

//         // Regular Google OAuth flow
//         return {
//           id: profile.sub,
//           name: profile.name,
//           email: profile.email,
//           image: profile.picture?.replace("=s96-c", "=s384-c"), // optional: bigger image
//           email_verified: profile.email_verified,
//         };
//       },
//     }),
//   ],

//   callbacks: {
//     async jwt({ token, user, account, trigger, session }) {
//       if (user) {
//         token.id = user.id;
//         token.role = user.role;
//       }
//       if (trigger === "update" && session?.name) {
//         token.name = session.name;
//       }
//       return token;
//     },

//     async session({ session, token }) {
//       if (token) {
//         session.user.id = token.id as string;
//         session.user.role = token.role as string;
//       }
//       return session;
//     },
//   },

//   pages: {
//     signIn: "/",
//     error: "/",
//   },

//   session: {
//     strategy: "jwt",
//     maxAge: 30 * 24 * 60 * 60, // 30 days
//   },

//   secret: process.env.NEXTAUTH_SECRET,
// };

// export const handlers = NextAuth(authConfig);
