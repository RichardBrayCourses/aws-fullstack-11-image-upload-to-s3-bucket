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
import { PolicyStatement, ServicePrincipal } from "aws-cdk-lib/aws-iam";
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
} from "aws-cdk-lib/aws-s3";
import {
  Distribution,
  ViewerProtocolPolicy,
  CachePolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { join } from "path";

interface ApiStackProps extends StackProps {
  domainName?: string;
  hostedZoneId?: string;
  hostedZoneName?: string;
  apiSubdomain?: string;
  databaseName?: string;
  imagesBucketName?: string;
}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { domainName, hostedZoneId, hostedZoneName, apiSubdomain, databaseName, imagesBucketName } = props;

    if (!hostedZoneName || !hostedZoneId || !domainName || !apiSubdomain || !imagesBucketName) {
      throw new Error(
        "Unexpected missing hostedZoneName || hostedZoneId || domainName || apiSubdomain || imagesBucketName",
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

    const imagesBucket = new Bucket(this, "ImagesBucket", {
      bucketName: imagesBucketName,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    });

    const imagesDistribution = new Distribution(this, "ImagesDistribution", {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(imagesBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      },
    });

    new StringParameter(this, "S3BucketNameParam", {
      parameterName: "/images/bucket-name",
      stringValue: imagesBucket.bucketName,
      description: "S3 bucket name for images",
    });

    new StringParameter(this, "CloudFrontDomainParam", {
      parameterName: "/images/cloudfront-domain",
      stringValue: imagesDistribution.distributionDomainName,
      description: "CloudFront distribution domain for images",
    });

    const lambdaFunction = new NodejsFunction(this, "ImageServiceFunction", {
      entry: join(__dirname, "..", "..", "..", "api", "src", "index.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_LATEST,
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        ...(databaseName ? { CDK_POSTRGRESS_DATABASE_NAME: databaseName } : {}),
        S3_BUCKET_NAME: imagesBucket.bucketName,
        CLOUDFRONT_DOMAIN: imagesDistribution.distributionDomainName,
        AWS_REGION: this.region,
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
