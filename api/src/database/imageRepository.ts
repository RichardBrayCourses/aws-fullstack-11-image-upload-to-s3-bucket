import { createDbClient } from "@root/db-utils";

export interface ImageRecord {
  id: number;
  sub: string;
  uuid_filename: string;
  image_name: string;
  created_at: string;
}

const DB_NAME = process.env.POSTRGRESS_DATABASE_NAME || "postgres";

export async function insertImage(imageData: {
  sub: string;
  uuidFilename: string;
  imageName: string;
}): Promise<ImageRecord | null> {
  const client = await createDbClient(DB_NAME);
  const result = await client.query(
    `INSERT INTO images (sub, uuid_filename, image_name, created_at) 
     VALUES ($1, $2, $3, NOW()) 
     RETURNING id, sub, uuid_filename, image_name, created_at`,
    [imageData.sub, imageData.uuidFilename, imageData.imageName],
  );

  return result.rows[0] || null;
}
