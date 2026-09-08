import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface User extends DefaultUser {
    role?: string;
    id?: string;
    accessToken?: string;
  }

  interface Session extends DefaultSession {
    user: {
      role?: string;
      id?: string;
    } & DefaultSession["user"];
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    id?: string;
    accessToken?: string;
  }
}
