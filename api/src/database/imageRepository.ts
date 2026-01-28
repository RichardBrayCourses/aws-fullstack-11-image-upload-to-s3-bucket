import { Client } from "pg";

export interface ImageRecord {
  id: number;
  sub: string;
  uuid_filename: string;
  image_name: string;
  created_at: string;
}

export async function insertImage(
  client: Client,
  imageData: {
    sub: string;
    uuidFilename: string;
    imageName: string;
    imageDescription?: string;
  },
): Promise<ImageRecord | null> {
  const result = await client.query(
    `INSERT INTO images (sub, uuid_filename, image_name, image_description, created_at) 
     VALUES ($1, $2, $3, $4, NOW()) 
     RETURNING id, sub, uuid_filename, image_name, image_description, created_at`,
    [
      imageData.sub,
      imageData.uuidFilename,
      imageData.imageName,
      imageData.imageDescription,
    ],
  );

  return result.rows[0] || null;
}
