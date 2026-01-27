#!/usr/bin/env node
import "dotenv/config";
import * as cdk from "aws-cdk-lib";
import { UiCloudFrontStack } from "../lib/uiCloudFrontStack";

const app = new cdk.App();
if (
  !process.env.CDK_UI_BUCKETNAME ||
  !process.env.CDK_UPTICK_DOMAIN_NAME ||
  !process.env.CDK_UPTICK_ZONE_NAME ||
  !process.env.CDK_UPTICK_ZONE_ID
)
  throw new Error(
    "Error: .env file must contain CDK_UI_BUCKETNAME, CDK_UPTICK_DOMAIN_NAME, CDK_UPTICK_ZONE_NAME, CDK_UPTICK_ZONE_ID",
  );

new UiCloudFrontStack(app, "system-ui-cloudfront", {
  env: { region: "us-east-1" },
  bucketName: process.env.CDK_UI_BUCKETNAME,
  domainName: process.env.CDK_UPTICK_DOMAIN_NAME,
  hostedZoneName: process.env.CDK_UPTICK_ZONE_NAME,
  hostedZoneId: process.env.CDK_UPTICK_ZONE_ID,
});
