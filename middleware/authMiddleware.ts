import { Role } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

export function requireRole(roles: Role[]) {
  return async (
    req: NextApiRequest,
    res: NextApiResponse,
    next: () => void
  ) => {
    // Implement your JWT/session validation here
    const user = req.user; // Assuming you have user data in request

    if (!user || !roles.some((role) => user.roles.includes(role))) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    next();
  };
}
