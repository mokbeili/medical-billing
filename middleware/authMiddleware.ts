import { Role } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: number;
    email: string;
    roles: Role[];
  };
}

export function requireRole(roles: Role[]) {
  return async (
    req: AuthenticatedRequest,
    res: NextApiResponse,
    next: () => void
  ) => {
    // Implement your JWT/session validation here
    const user = req.user;

    if (!user || !roles.some((role) => user.roles.includes(role))) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    next();
  };
}
