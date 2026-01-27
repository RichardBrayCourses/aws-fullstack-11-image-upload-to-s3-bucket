// controllers/configController.ts
import type { Request, Response } from "express";
import { loadConfig, getCognitoConfig } from "../utils/config";
import { logger } from "../utils/logger";

export async function getConfig(_: Request, res: Response) {
  logger.info("getConfig", "--- getConfig() entry ---");

  try {
    await loadConfig();

    const config = getCognitoConfig();

    logger.info("getConfig", "Loaded config OK", {
      domain: config.domain,
      cognitoClientId: config.clientId,
    });

    res.status(200).json({
      success: true,
      cognitoDomain: config.domain,
      cognitoClientId: config.clientId,
    });
  } catch (err) {
    logger.error("getConfig", err);
    res.status(500).json({ success: false, error: "Failed to load config" });
  }
}
