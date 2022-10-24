import { Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import { EventBus as EventBusTarget } from "aws-cdk-lib/aws-events-targets";
import { BlockPublicAccess, Bucket, ObjectOwnership } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { Source } from "../shared";
import { CFListener } from "./cloudformation/cf-listener-construct";

export interface AccountStackProps extends StackProps {
  watcherAccount?: string;
}

export class AccountStack extends Stack {
  constructor(scope: Construct, id: string, props: AccountStackProps) {
    super(scope, id, props);

    const bus = EventBus.fromEventBusName(this, `bus`, "default");
    const { watcherAccount } = props;
if (watcherAccount && watcherAccount !== Stack.of(this).account) {
  new Rule(this, `WatcherFwd`, {
    eventPattern: {
      source: [Source],
    },
    targets: [new EventBusTarget(
      EventBus.fromEventBusArn(this, `watcher-bus`, `arn:aws:events:${Stack.of(this).region}:${watcherAccount}:event-bus/default`)
    )]
  });
}

    const specBucket = new Bucket(this, `AccountSpecBucket`, {
      removalPolicy: RemovalPolicy.DESTROY,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      lifecycleRules: [ { expiration: Duration.days(7), }, ],
      autoDeleteObjects: true,
    });

    new CFListener(this, `ApiListener`, {
      bus,
      specBucket,
    });
  }
}
