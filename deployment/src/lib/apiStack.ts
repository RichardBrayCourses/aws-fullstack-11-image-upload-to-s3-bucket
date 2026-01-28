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
import {
  Bucket,
  BlockPublicAccess,
  CorsRule,
  HttpMethods,
} from "aws-cdk-lib/aws-s3";
import { join } from "path";

interface ApiStackProps extends StackProps {
  domainName: string;
  hostedZoneId: string;
  hostedZoneName: string;
  apiSubdomain: string;
  databaseName: string;
  bucketName: string;
}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const {
      domainName,
      hostedZoneId,
      hostedZoneName,
      apiSubdomain,
      databaseName,
      bucketName,
    } = props;

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

    const imagesBucket = new Bucket(this, "ImagesBucket", {
      bucketName,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedMethods: [
            HttpMethods.GET,
            HttpMethods.POST,
            HttpMethods.PUT,
            HttpMethods.DELETE,
            HttpMethods.HEAD,
          ],
          allowedOrigins: [
            "http://localhost:3001",
            "https://*.cloudfront.net",
            "https://*.uptickart.com",
          ],
          allowedHeaders: ["*"],
          exposedHeaders: ["ETag", "x-amz-version-id"],
          maxAge: 3000,
        },
      ] as CorsRule[],
    });

    const lambdaFunction = new NodejsFunction(this, "ApiServiceFunction", {
      entry: join(__dirname, "..", "..", "..", "api", "src", "index.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_LATEST,
      timeout: Duration.seconds(30), // Aurora database can take 15 seconds to spin up from cold, so our Lambda needs longer than that.
      environment: {
        DATABASE_NAME: databaseName,
        IMAGES_BUCKET_NAME: imagesBucket.bucketName,
      },
      bundling: {
        nodeModules: [
          "pg",
          "@aws-sdk/client-secrets-manager",
          "@aws-sdk/client-ssm",
          "@aws-sdk/client-s3",
          "@aws-sdk/s3-request-presigner",
          "uuid",
        ],
      },
    });

    lambdaFunction.addToRolePolicy(
      new PolicyStatement({
        actions: ["ssm:GetParameter"],
        resources: [
          `arn:aws:ssm:${this.region}:${this.account}:parameter/cognito/*`,
        ],
      }),
    );

    lambdaFunction.addToRolePolicy(
      new PolicyStatement({
        actions: ["ssm:GetParameter", "ssm:GetParameters"],
        resources: [
          `arn:aws:ssm:${this.region}:${this.account}:parameter/rds/*`,
        ],
      }),
    );

    lambdaFunction.addToRolePolicy(
      new PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: ["*"],
      }),
    );

    imagesBucket.grantPut(lambdaFunction);
    imagesBucket.grantRead(lambdaFunction);

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
