import { CfnOutput, RemovalPolicy, Stack } from "aws-cdk-lib";
import { EventBus, IEventBus, Rule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { AccountPrincipal } from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Bucket, BlockPublicAccess, ObjectOwnership } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { join } from "path";
import { BlogDetailTypes, Source } from "../../shared";

export interface WatcherSpecConstructProps {
  watchedAccounts?: string[];
}

export class WatcherSpecConstruct extends Construct {
  bus: IEventBus;
  specBucket: Bucket;
  constructor(scope: Construct, id: string, props: WatcherSpecConstructProps) {
    super(scope, id);

    this.bus = EventBus.fromEventBusName(this, `bus`, "default");

    const { watchedAccounts = [] } = props;
    watchedAccounts.forEach((watchedAccount) => {
      if (watchedAccount !== Stack.of(this).account) {
        this.bus.grantPutEventsTo(new AccountPrincipal(watchedAccount));
      }
    });

    this.specBucket = new Bucket(this, `WatcherSpecBucket`, {
      removalPolicy: RemovalPolicy.DESTROY,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      autoDeleteObjects: true,
    });
    new CfnOutput(this, `WatcherSpecBucketOutput`, {
      value: this.specBucket.bucketName,
    });

    this.addRule({
      detailType: BlogDetailTypes.OPEN_API,
      lambdaName: `apiWatcher`,
    });
  }

  addRule({
    detailType,
    lambdaName,
  }: {
    detailType: BlogDetailTypes;
    lambdaName: string;
  }) {
    const cfFn = new NodejsFunction(this, lambdaName, {
      runtime: Runtime.NODEJS_16_X,
      entry: join(__dirname, `./${lambdaName}.ts`),
      logRetention: RetentionDays.ONE_DAY,
    });
    cfFn.addEnvironment("SPEC_BUCKET", this.specBucket.bucketName);
    this.bus.grantPutEventsTo(cfFn);

    new Rule(this, `${lambdaName}Rule`, {
      eventBus: this.bus,
      eventPattern: {
        source: [Source],
        detailType: [detailType],
      },
      targets: [new LambdaFunction(cfFn)],
    });
  }
}
