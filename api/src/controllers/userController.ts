import type { Request, Response } from "express";
import { z } from "zod";
import { getUserBySub, updateUserNickname } from "../database/userRepository";
import { logger } from "../utils/logger";
import { createDbClient } from "@root/db-utils";

// Zod schema: validates req.params
const subParamSchema = z.object({
  sub: z // contains a "sub" field
    .string(), // that is a string
});

// Zod schema: validates the request body
// Note that we *do* allow a blank nickname so that users can "clear/reset" their nickname back to not having one
// The UI is/should also be designed to allow this.
const updateNicknameSchema = z.object({
  nickname: z // contains a nickname field
    .string() // nickname must be a string (if provided)
    .max(20) // maximum length of 20 characters
    .nullable() // allows the value to be null
    .optional() // allows the field to be missing (undefined)
    .transform((val): string | null => val ?? null), // converts undefined to null, so we always get string | null (never undefined)
});

if (!process.env.DATABASE_NAME) {
  throw new Error("DATABASE_NAME environment variable is required");
}
const DATABASE_NAME = process.env.DATABASE_NAME;

export async function getUser(req: Request, res: Response) {
  try {
    // parse() will throw ZodError if validation fails
    const { sub } = subParamSchema.parse(req.params);
    const client = await createDbClient(DATABASE_NAME);

    const user = await getUserBySub(client, sub);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.status(200).json({ success: true, user });
  } catch (err) {
    // Check if the error is from Zod validation (invalid input format)
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    logger.error("getUser", err);
    return res.status(500).json({ error: "Failed to fetch user data" });
  }
}

export async function updateNickname(req: Request, res: Response) {
  try {
    // Validate route parameter (sub must be a string)
    // parse() will throw ZodError if validation fails
    const { sub } = subParamSchema.parse(req.params);
    // Validate request body (nickname is optional, max 20 chars if provided)
    // After transform, nickname will be string | null (never undefined)
    const { nickname } = updateNicknameSchema.parse(req.body);
    const client = await createDbClient(DATABASE_NAME);

    const user = await updateUserNickname(client, sub, nickname);
    return res.status(200).json({ success: true, user });
  } catch (err: any) {
    // Zod validation error: client sent invalid data (wrong types, too long, etc.)
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    if (err.message === "User not found") {
      return res.status(404).json({ error: err.message });
    }
    logger.error("updateNickname", err);
    return res.status(500).json({ error: "Failed to update nickname" });
  }
}
