import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import { RemovalPolicy, DockerImage, CfnOutput } from "aws-cdk-lib";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Source } from "aws-cdk-lib/aws-s3-deployment";
import { Bucket, BlockPublicAccess, ObjectOwnership } from "aws-cdk-lib/aws-s3";
import { BucketDeployment } from "aws-cdk-lib/aws-s3-deployment";
import { ExecSyncOptions, execSync } from "child_process";
import { Construct } from "constructs";
import { copySync } from "fs-extra";
import { join } from "path";

export class CatalogOne extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    const destinationBucket = new Bucket(this, `EventCatalogBucket`, {
      removalPolicy: RemovalPolicy.DESTROY,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      autoDeleteObjects: true,
    });

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      `OriginAccessIdentity`
    );
    destinationBucket.grantRead(originAccessIdentity);

    const distribution = new cloudfront.Distribution(
      this,
      `EventCatalogDistribution`,
      {
        defaultRootObject: "index.html",
        defaultBehavior: {
          origin: new S3Origin(destinationBucket, { originAccessIdentity }),
        },
      }
    );
    const execOptions: ExecSyncOptions = {
      stdio: ["ignore", process.stderr, "inherit"],
    };
    const uiPath = join(__dirname, `../catalog/out`);
    const bundle = Source.asset(uiPath, {
      bundling: {
        command: ["sh", "-c", 'echo "Not Used"'],
        image: DockerImage.fromRegistry("alpine"), // required but not used
        local: {
          tryBundle(outputDir: string) {
            execSync("cd catalog && npm i");
            execSync("cd catalog && npm run build");
            copySync(uiPath, outputDir, {
              ...execOptions,
              recursive: true,
            });
            return true;
          },
        },
      },
    });
    new BucketDeployment(this, `DeployCatalog`, {
      destinationBucket,
      distribution,
      sources: [bundle],
      prune: true,
      memoryLimit: 1024,
    });

    new CfnOutput(this, `CatalogUrl`, {
      value: `https://${distribution.distributionDomainName}`,
    });
  }
}
