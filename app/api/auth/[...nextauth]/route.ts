import { authOptions } from "@/lib/auth";
import NextAuth from "next-auth";

// Mark this route as dynamic
export const dynamic = "force-dynamic";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
