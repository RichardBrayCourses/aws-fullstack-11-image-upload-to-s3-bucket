import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { logger } from "./logger";

const ssmClient = new SSMClient({});

let domain: string = "";
let clientId: string = "";

export async function loadConfig() {
  if (domain) return;

  try {
    clientId =
      (
        await ssmClient.send(
          new GetParameterCommand({ Name: "/cognito/client-id" }),
        )
      ).Parameter?.Value ?? "";
    domain =
      (
        await ssmClient.send(
          new GetParameterCommand({ Name: "/cognito/domain" }),
        )
      ).Parameter?.Value ?? "";

    if (!clientId || !domain) {
      throw new Error("Missing configuration");
    }
  } catch (err) {
    logger.error("loadConfig", err);
    throw err;
  }
}

export function getCognitoConfig() {
  return {
    domain,
    clientId,
  };
}
