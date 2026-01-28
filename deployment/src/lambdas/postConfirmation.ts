import { PostConfirmationTriggerEvent } from "aws-lambda";
import { createDbClient } from "@root/db-utils";

interface RegisteredUser {
  sub: string;
  email: string;
}

async function insertUser(userData: RegisteredUser): Promise<void> {
  if (!process.env.CDK_DATABASE_NAME)
    throw new Error("Error: CDK_DATABASE_NAME environment variable is not set");

  // Use SSL for RDS connections (required by AWS RDS)
  const client = await createDbClient(process.env.CDK_DATABASE_NAME);

  try {
    await client.query(
      `INSERT INTO registered_user (sub, email)
       VALUES ($1, $2)
       ON CONFLICT (sub) DO NOTHING`,
      [userData.sub, userData.email],
    );
  } finally {
    await client.end();
  }
}

export const handler = async (
  event: PostConfirmationTriggerEvent,
): Promise<PostConfirmationTriggerEvent> => {
  console.log("Entering Cognito PostConfirmationTriggerEvent Lambda Handler");
  console.log(JSON.stringify(event));
  const sub = event.request?.userAttributes?.sub;
  const email = event.request?.userAttributes?.email;

  try {
    await insertUser({ sub, email });
  } catch (err) {
    console.error("DB handler error:", err);
  }

  return event;
};
