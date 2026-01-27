import { Construct } from "constructs";
import { join } from "path";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Distribution } from "aws-cdk-lib/aws-cloudfront";
import { Stack, StackProps } from "aws-cdk-lib";

interface AppStackProps extends StackProps {
  bucketName: string;
}

export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const appDist = join(__dirname, "..", "..", "..", "ui", "dist");

    const { bucketName } = props;

    const bucket = Bucket.fromBucketName(this, "ImportedBucket", bucketName);

    const distId = StringParameter.valueForStringParameter(
      this,
      `/cloudfront/ui/distribution-id`,
    );
    const distribution = Distribution.fromDistributionAttributes(
      this,
      "ImportedDist",
      {
        distributionId: distId,
        domainName: `${distId}.cloudfront.net`, // required but not used for deployment
      },
    );

    new BucketDeployment(this, `uptick-cloudfront-uptickart-deployment`, {
      sources: [Source.asset(appDist)],
      destinationBucket: bucket,
      distribution,
      distributionPaths: ["/*"],
    });
  }
}
