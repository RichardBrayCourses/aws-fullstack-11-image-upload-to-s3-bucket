#!/usr/bin/env node
import "dotenv/config";
import * as cdk from "aws-cdk-lib";
import { CognitoPostConfirmationStack } from "../lib/cognitoPostConfirmationStack";
import { CognitoStack } from "../lib/cognitoStack";

const app = new cdk.App();

if (
  !process.env.CDK_UPTICK_DOMAIN_NAME ||
  !process.env.CDK_UPTICK_SYSTEM_NAME ||
  !process.env.CDK_DATABASE_NAME
)
  throw new Error(
    "Error: .env file must contain CDK_UPTICK_DOMAIN_NAME, CDK_UPTICK_SYSTEM_NAME, CDK_DATABASE_NAME",
  );

const postConfirmationStack = new CognitoPostConfirmationStack(
  app,
  "system-cognito-post-confirmation",
  {
    systemName: process.env.CDK_UPTICK_SYSTEM_NAME,
    databaseName: process.env.CDK_DATABASE_NAME,
  },
);

// Create Cognito stack
const cognitoStack = new CognitoStack(app, "system-cognito", {
  systemName: process.env.CDK_UPTICK_SYSTEM_NAME,
  domainName: process.env.CDK_UPTICK_DOMAIN_NAME,
  postConfirmationLambda: postConfirmationStack.lambda,
});

// Make cognito stack depend on post-confirmation stack
// This ensures the correct order of destruction when destroying both stacks together.
cognitoStack.addDependency(postConfirmationStack);
