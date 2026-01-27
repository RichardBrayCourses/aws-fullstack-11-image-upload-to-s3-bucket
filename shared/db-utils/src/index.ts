import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { Client } from "pg";

export interface DbCredentials {
  username: string;
  password: string;
  host: string;
  port: number;
}

const secretsClient = new SecretsManagerClient({});
const ssmClient = new SSMClient({});

let secretArn: string | undefined;
let credentials: DbCredentials | undefined;

let dbClient: Client | undefined;

async function getSecretArn(): Promise<string> {
  if (!secretArn) {
    secretArn = (
      await ssmClient.send(new GetParameterCommand({ Name: "/rds/secret-arn" }))
    ).Parameter?.Value;
  }
  return secretArn!;
}

export async function getRdsCredentials(): Promise<DbCredentials> {
  if (!credentials) {
    const arn = await getSecretArn();
    const secretString = (
      await secretsClient.send(new GetSecretValueCommand({ SecretId: arn }))
    ).SecretString!;
    const secret = JSON.parse(secretString);
    credentials = {
      username: secret.username,
      password: secret.password,
      host: secret.host,
      port: secret.port,
    };
  }
  return credentials;
}

export async function getRdsEndpoint(): Promise<string> {
  const creds = await getRdsCredentials();
  return creds.host;
}

export async function createDbClient(dbName: string): Promise<Client> {
  if (dbClient) return dbClient;

  const { username, password, host, port } = await getRdsCredentials();

  dbClient = new Client({
    host,
    port,
    database: dbName,
    user: username,
    password,
    ssl: { rejectUnauthorized: false },
  });

  await dbClient.connect();
  return dbClient;
}

export async function ensureDatabase(dbName: string): Promise<void> {
  const { username, password, host, port } = await getRdsCredentials();

  const adminClient = new Client({
    host,
    port,
    database: "postgres",
    user: username,
    password,
    ssl: { rejectUnauthorized: false },
  });

  await adminClient.connect();

  const result = await adminClient.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [dbName],
  );
  if (result.rows.length === 0) {
    await adminClient.query(`CREATE DATABASE ${dbName}`);
  }

  await adminClient.end();
}
