import { Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { EventBus } from "aws-cdk-lib/aws-events";
import { AccountPrincipal } from "aws-cdk-lib/aws-iam";
import { BlockPublicAccess, Bucket, ObjectOwnership } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { CFListener } from "./cloudformation/cf-listener-construct";

export class AccountStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const bus = EventBus.fromEventBusName(this, `bus`, "default");
    const specBucket = new Bucket(this, `AccountSpecBucket`, {
      removalPolicy: RemovalPolicy.DESTROY,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      lifecycleRules: [
        {
          abortIncompleteMultipartUploadAfter: Duration.minutes(30),
          expiration: Duration.days(7),
        },
      ],
      autoDeleteObjects: true,
    });

    new CFListener(this, `ApiListener`, {
      bus,
      specBucket,
    });
  }
}
