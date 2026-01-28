import { Client } from "pg";

export interface UserData {
  sub: string;
  email: string;
  nickname: string | null;
}

export async function getUserBySub(
  client: Client,
  sub: string,
): Promise<UserData | null> {
  const result = await client.query(
    `SELECT sub, email, nickname FROM registered_user WHERE sub = $1`,
    [sub],
  );
  return result.rows[0] || null;
}

export async function updateUserNickname(
  client: Client,
  sub: string,
  nickname: string | null,
): Promise<UserData> {
  const result = await client.query(
    `UPDATE registered_user SET nickname = $1 WHERE sub = $2 RETURNING sub, email, nickname`,
    [nickname, sub],
  );
  if (result.rows.length === 0) throw new Error("User not found");
  return result.rows[0];
}
