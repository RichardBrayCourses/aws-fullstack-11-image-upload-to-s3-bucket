#!/usr/bin/env node
import "dotenv/config";
import * as cdk from "aws-cdk-lib";
import { AppStack } from "../lib/uiBucketStack.js";

const app = new cdk.App();

if (!process.env.CDK_UI_BUCKETNAME)
  throw new Error("Error: .env file must contain CDK_UI_BUCKETNAME");

new AppStack(app, "system-ui-bucket", {
  env: { region: "us-east-1" },
  bucketName: process.env.CDK_UI_BUCKETNAME,
});
