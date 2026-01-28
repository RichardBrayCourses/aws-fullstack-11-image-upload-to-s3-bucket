#!/usr/bin/env node
import "dotenv/config";
import * as cdk from "aws-cdk-lib";
import { ApiStack } from "../lib/apiStack";

const app = new cdk.App();

if (
  !process.env.CDK_UPTICK_DOMAIN_NAME ||
  !process.env.CDK_UPTICK_ZONE_NAME ||
  !process.env.CDK_UPTICK_ZONE_ID ||
  !process.env.CDK_DATABASE_NAME ||
  !process.env.CDK_IMAGES_BUCKET_NAME
)
  throw new Error(
    "Error: .env file must contain CDK_UPTICK_DOMAIN_NAME, CDK_UPTICK_ZONE_NAME, CDK_UPTICK_ZONE_ID, CDK_DATABASE_NAME, and CDK_IMAGES_BUCKET_NAME",
  );

const domainName = process.env.CDK_UPTICK_DOMAIN_NAME;
const hostedZoneName = process.env.CDK_UPTICK_ZONE_NAME;
const hostedZoneId = process.env.CDK_UPTICK_ZONE_ID;
const databaseName = process.env.CDK_DATABASE_NAME;
const bucketName = process.env.CDK_IMAGES_BUCKET_NAME;

// Create Image API stack (depends on Cognito stack)
new ApiStack(app, "system-api-server", {
  domainName,
  hostedZoneName,
  hostedZoneId,
  apiSubdomain: "api",
  databaseName,
  bucketName,
});
