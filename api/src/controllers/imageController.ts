import type { Request, Response } from "express";
import { z } from "zod";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import { insertImage } from "../database/imageRepository";
import type { AuthUser } from "../middleware/auth";
import { logger } from "../utils/logger";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "eu-west-2",
});

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
if (!S3_BUCKET_NAME) {
  throw new Error("S3_BUCKET_NAME environment variable is required");
}

const presignedUrlSchema = z.object({
  imageName: z
    .string()
    .trim()
    .min(1, "Image name is required")
    .max(40, "Image name must be 40 characters or less"),
});

export async function getPresignedUrl(req: Request, res: Response) {
  try {
    const auth = (req as any).auth as AuthUser | undefined;
    if (!auth?.sub) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { imageName } = presignedUrlSchema.parse(req.body);
    const uuidFilename = uuidv4();

    const presignedUrl = await getSignedUrl(
      s3Client,
      new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: uuidFilename,
        ContentType: "image/*",
      }),
      { expiresIn: 900 }
    );

    const imageRecord = await insertImage({
      sub: auth.sub,
      uuidFilename,
      imageName: imageName.trim(),
    });

    if (!imageRecord) {
      logger.error("getPresignedUrl", "Failed to insert image record");
      return res.status(500).json({ error: "Failed to create image record" });
    }

    return res.status(200).json({
      success: true,
      presignedUrl,
      imageId: imageRecord.id,
      uuidFilename,
      message: "Presigned URL generated successfully",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    logger.error("getPresignedUrl", err);
    return res.status(500).json({ error: "Failed to generate presigned URL" });
  }
}
