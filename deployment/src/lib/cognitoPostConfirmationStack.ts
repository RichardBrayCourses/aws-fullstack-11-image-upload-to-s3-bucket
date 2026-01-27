import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { join } from "path";
import * as iam from "aws-cdk-lib/aws-iam";

interface CognitoPostConfirmationStackProps extends StackProps {
  systemName: string;
  databaseName: string;
}

export class CognitoPostConfirmationStack extends Stack {
  public readonly lambda: NodejsFunction;

  constructor(
    scope: Construct,
    id: string,
    props: CognitoPostConfirmationStackProps,
  ) {
    super(scope, id, props);

    const { systemName, databaseName } = props;

    const uniquePrefix = `${systemName}-post-confirmation`;

    this.lambda = new NodejsFunction(this, uniquePrefix, {
      entry: join(__dirname, "..", "lambdas", "postConfirmation.ts"),
      handler: "handler",
      functionName: uniquePrefix,
      runtime: Runtime.NODEJS_LATEST,
      environment: {
        CDK_POSTRGRESS_DATABASE_NAME: databaseName,
      },
      bundling: {
        nodeModules: [
          "pg",
          "@aws-sdk/client-secrets-manager",
          "@aws-sdk/client-ssm",
        ],
      },
    });

    // Grant permissions to read SSM parameters for RDS config
    this.lambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetParameter", "ssm:GetParameters"],
        resources: [
          `arn:aws:ssm:${this.region}:${this.account}:parameter/rds/*`,
        ],
      }),
    );

    // Grant permissions to read secrets (secret ARN will be loaded from SSM by db-utils)
    this.lambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: ["*"], // ARN will be determined at runtime from SSM
      }),
    );

    new CfnOutput(this, "PostConfirmationLambdaArn", {
      value: this.lambda.functionArn,
      description: "ARN of the PostConfirmation Lambda function",
    });
  }
}
