import { Construct } from "constructs";
import {
  Stack,
  StackProps,
  CfnOutput,
  RemovalPolicy,
  Duration,
} from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import {
  RestApi,
  DomainName,
  EndpointType,
  SecurityPolicy,
  LambdaIntegration,
  Cors,
} from "aws-cdk-lib/aws-apigateway";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import {
  HostedZone,
  ARecord,
  AaaaRecord,
  RecordTarget,
} from "aws-cdk-lib/aws-route53";
import { ApiGatewayDomain } from "aws-cdk-lib/aws-route53-targets";
import {
  Certificate,
  CertificateValidation,
} from "aws-cdk-lib/aws-certificatemanager";
import { join } from "path";

interface ApiStackProps extends StackProps {
  domainName?: string;
  hostedZoneId?: string;
  hostedZoneName?: string;
  apiSubdomain?: string;
  databaseName?: string;
}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { domainName, hostedZoneId, hostedZoneName, apiSubdomain, databaseName } = props;

    if (!hostedZoneName || !hostedZoneId || !domainName || !apiSubdomain) {
      throw new Error(
        "Unexpected missing hostedZoneName || hostedZoneId || domainName || apiSubdomain",
      );
    }

    const apiDomainName = `${apiSubdomain}.${domainName}`;

    const zone = HostedZone.fromHostedZoneAttributes(
      this,
      "ImportedHostedZone",
      { hostedZoneId, zoneName: hostedZoneName },
    );

    const certificate = new Certificate(this, "ApiCertificate", {
      domainName: apiDomainName,
      validation: CertificateValidation.fromDns(zone),
    });
    certificate.applyRemovalPolicy(RemovalPolicy.RETAIN);

    const lambdaFunction = new NodejsFunction(this, "ImageServiceFunction", {
      entry: join(__dirname, "..", "..", "..", "api", "src", "index.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_LATEST,
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: databaseName
        ? {
            CDK_POSTRGRESS_DATABASE_NAME: databaseName,
          }
        : undefined,
      bundling: {
        nodeModules: [
          "pg",
          "@aws-sdk/client-secrets-manager",
          "@aws-sdk/client-ssm",
        ],
      },
    });

    // SSM permissions for Cognito config
    lambdaFunction.addToRolePolicy(
      new PolicyStatement({
        actions: ["ssm:GetParameter"],
        resources: [
          `arn:aws:ssm:${this.region}:${this.account}:parameter/cognito/*`,
        ],
      }),
    );

    // SSM permissions for RDS config
    lambdaFunction.addToRolePolicy(
      new PolicyStatement({
        actions: ["ssm:GetParameter", "ssm:GetParameters"],
        resources: [
          `arn:aws:ssm:${this.region}:${this.account}:parameter/rds/*`,
        ],
      }),
    );

    // Grant permissions to read secrets (secret ARN will be loaded from SSM by db-utils)
    lambdaFunction.addToRolePolicy(
      new PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: ["*"], // ARN will be determined at runtime from SSM
      }),
    );

    const api = new RestApi(this, "ApiServer", {
      restApiName: "Image Service API",
      description: "API Gateway for Image Service",
      endpointConfiguration: { types: [EndpointType.REGIONAL] },

      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization"],
      },
    });

    // Create a catch-all proxy resource that forwards all requests to Lambda
    const lambdaIntegration = new LambdaIntegration(lambdaFunction, {
      proxy: true,
    });

    // Add a catch-all resource for all paths
    const proxyResource = api.root.addResource("{proxy+}");
    proxyResource.addMethod("ANY", lambdaIntegration);

    // Also add method for root path
    api.root.addMethod("ANY", lambdaIntegration);

    const apiDomain = new DomainName(this, "ApiDomain", {
      domainName: apiDomainName,
      certificate,
      securityPolicy: SecurityPolicy.TLS_1_2,
      endpointType: EndpointType.REGIONAL,
    });

    apiDomain.addBasePathMapping(api, { basePath: "" });

    new ARecord(this, "ApiARecord", {
      zone,
      recordName: apiSubdomain,
      target: RecordTarget.fromAlias(new ApiGatewayDomain(apiDomain)),
    });

    new AaaaRecord(this, "ApiAaaaRecord", {
      zone,
      recordName: apiSubdomain,
      target: RecordTarget.fromAlias(new ApiGatewayDomain(apiDomain)),
    });

    new CfnOutput(this, "ApiUrl", { value: `https://${apiDomainName}` });
    new CfnOutput(this, "ApiGatewayUrl", { value: api.url });
  }
}
