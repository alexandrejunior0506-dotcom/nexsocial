import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

/**
 * NexSocial is a single-user app: there is exactly one login,
 * defined via APP_LOGIN_EMAIL and APP_LOGIN_PASSWORD_HASH env vars.
 * Generate the hash with: node -e "console.log(require('bcryptjs').hashSync('sua-senha', 10))"
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email?.toString().trim().toLowerCase();
        const password = credentials?.password?.toString();
        const expectedEmail = process.env.APP_LOGIN_EMAIL?.trim().toLowerCase();
        const expectedHash = process.env.APP_LOGIN_PASSWORD_HASH;

        if (!email || !password || !expectedEmail || !expectedHash) return null;
        if (email !== expectedEmail) return null;

        const valid = await bcrypt.compare(password, expectedHash);
        if (!valid) return null;

        return { id: "owner", email };
      },
    }),
  ],
});
