import { Construct } from "constructs";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import {
  CachePolicy,
  Distribution,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import {
  AaaaRecord,
  ARecord,
  HostedZone,
  RecordTarget,
} from "aws-cdk-lib/aws-route53";
import {
  Certificate,
  CertificateValidation,
} from "aws-cdk-lib/aws-certificatemanager";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import { StringParameter } from "aws-cdk-lib/aws-ssm";

interface UiCloudFrontStackProps extends StackProps {
  bucketName: string;
  domainName: string;
  hostedZoneName: string;
  hostedZoneId: string;
}

export class UiCloudFrontStack extends Stack {
  constructor(scope: Construct, id: string, props: UiCloudFrontStackProps) {
    super(scope, id, props);
    const { domainName, hostedZoneId, hostedZoneName, bucketName } = props;

    // Create S3 bucket for UI
    const uiBucket = new Bucket(this, "UiBucket", {
      bucketName,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    });

    const wwwSubdomain = `www.${domainName}`;

    const zone = HostedZone.fromHostedZoneAttributes(
      this,
      "ImportedHostedZone",
      {
        hostedZoneId,
        zoneName: hostedZoneName,
      },
    );

    const cert = new Certificate(this, "UsEastCert", {
      domainName,
      subjectAlternativeNames: [wwwSubdomain],
      validation: CertificateValidation.fromDns(zone),
    });
    cert.applyRemovalPolicy(RemovalPolicy.RETAIN);

    const distribution = new Distribution(this, "ui-distribution", {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(uiBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: CachePolicy.CACHING_DISABLED,
      },
      defaultRootObject: "/index.html",
      domainNames: [wwwSubdomain],
      certificate: cert,

      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: Duration.seconds(0),
        },
      ],
    });
    // Apex domain -> CloudFront
    // When zone name matches domain name, use empty string for apex
    const apexRecordName = domainName === hostedZoneName ? "" : domainName;
    new ARecord(this, "ApexARecord", {
      zone,
      recordName: apexRecordName,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });

    new AaaaRecord(this, "ApexAaaaRecord", {
      zone,
      recordName: apexRecordName,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });

    new ARecord(this, "WwwA", {
      zone,
      recordName: "www",
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });

    new AaaaRecord(this, "WwwAAAA", {
      zone,
      recordName: "www",
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });

    new StringParameter(this, "CloudFrontDistributionId", {
      parameterName: `/cloudfront/ui/distribution-id`,
      stringValue: distribution.distributionId,
    });
  }
}
