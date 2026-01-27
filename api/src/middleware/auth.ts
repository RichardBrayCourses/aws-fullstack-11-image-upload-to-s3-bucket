import { Request, Response, NextFunction } from "express";

const { getCurrentInvoke } = require("@vendia/serverless-express");

export interface AuthUser {
  sub: string;
  email?: string;
  groups: string[];
}

type Claims = {
  sub?: string;
  email?: string;
  "cognito:groups"?: string | string[];
};

function parseGroups(raw: Claims["cognito:groups"]): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);
  }
  return [];
}

export async function attachAuth(req: Request, _res: Response, next: NextFunction) {
  const invoke = getCurrentInvoke?.();
  const claims: Claims | undefined = invoke?.event?.requestContext?.authorizer?.claims;

  if (claims?.sub) {
    (req as any).auth = {
      sub: claims.sub,
      email: claims.email,
      groups: parseGroups(claims["cognito:groups"]),
    } as AuthUser;
    return next();
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.substring(7);
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
      if (payload.sub) {
        (req as any).auth = {
          sub: payload.sub,
          email: payload.email,
          groups: parseGroups(payload["cognito:groups"]),
        } as AuthUser;
      }
    } catch (err) {
      // Ignore
    }
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = (req as any).auth as AuthUser | undefined;
  if (!auth?.sub) {
    return res.status(401).json({ error: "Authentication required" });
  }
  return next();
}

export function requireGroup(groupName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = (req as any).auth as AuthUser | undefined;
    if (!auth?.groups?.includes(groupName)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    return next();
  };
}
