#!/usr/bin/env tsx
import "dotenv/config";
import { execSync } from "child_process";
import { join } from "path";
import {
  getRdsEndpoint,
  getRdsCredentials,
  ensureDatabase,
} from "@root/db-utils";

const SQL_SCRIPTS_DIR = "sql";
const RETRIES = 2;

async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes("reset");

  if (!process.env.CDK_DATABASE_NAME)
    throw new Error("Error: .env file must contain CDK_DATABASE_NAME");

  if (process.env.PROFILE) {
    process.env.AWS_PROFILE = process.env.PROFILE;
  }

  // Ensure the database exists
  await ensureDatabase(process.env.CDK_DATABASE_NAME);

  const endpoint = await getRdsEndpoint();
  const credentials = await getRdsCredentials();

  const jdbcUrl = `jdbc:postgresql://${endpoint}:5432/${process.env.CDK_DATABASE_NAME}?sslmode=require`;
  // Go up two levels from src/bin to get to deployment root
  const deploymentDir = join(__dirname, "..", "..");

  const flywayCommand = reset ? "clean" : "migrate";
  const cleanDisabledFlag = reset ? "-cleanDisabled=false" : "";

  execSync(
    `flyway -connectRetries=${RETRIES} -url="${jdbcUrl}" -user="${credentials.username}" -password="${credentials.password}" -locations="filesystem:${SQL_SCRIPTS_DIR}" ${cleanDisabledFlag} ${flywayCommand}`.trim(),
    { stdio: "inherit", cwd: deploymentDir },
  );

  console.log(`✅ Flyway ${flywayCommand} complete!`);
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
