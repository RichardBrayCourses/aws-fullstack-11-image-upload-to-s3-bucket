import { createDbClient } from "@root/db-utils";

export interface UserData {
  sub: string;
  email: string;
  nickname: string | null;
}

const DB_NAME = process.env.POSTRGRESS_DATABASE_NAME || "postgres";

export async function getUserBySub(sub: string): Promise<UserData | null> {
  const client = await createDbClient(DB_NAME);
  const result = await client.query(
    `SELECT sub, email, nickname FROM registered_user WHERE sub = $1`,
    [sub],
  );
  return result.rows[0] || null;
}

export async function updateUserNickname(
  sub: string,
  nickname: string | null,
): Promise<UserData> {
  const client = await createDbClient(DB_NAME);
  const result = await client.query(
    `UPDATE registered_user SET nickname = $1 WHERE sub = $2 RETURNING sub, email, nickname`,
    [nickname, sub],
  );
  if (result.rows.length === 0) throw new Error("User not found");
  return result.rows[0];
}
