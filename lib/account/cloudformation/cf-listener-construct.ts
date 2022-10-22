import { IEventBus, Rule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { join } from "path";

const CLOUDFORMATION_SUCCESS = [
  "CREATE_COMPLETE",
  "UPDATE_COMPLETE",
  "IMPORT_COMPLETE",
];

export interface CloudFormationListenerProps {
  bus: IEventBus;
  specBucket: Bucket;
}
export class CFListener extends Construct {
  constructor(
    scope: Construct,
    id: string,
    props: CloudFormationListenerProps
  ) {
    super(scope, id);
    const { bus, specBucket } = props;

    const cfFn = new NodejsFunction(this, `cfStatusFn`, {
        runtime: Runtime.NODEJS_16_X,
        entry: join(__dirname, `./cf-listener-lambda.ts`),
        logRetention: RetentionDays.ONE_DAY,
        initialPolicy: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['cloudformation:Describe*', 'cloudformation:Get*', 'cloudformation:List*', 'apigateway:Get*'],
            resources: ['*']
          }),
        ],
    });
    specBucket.grantReadWrite(cfFn);
    cfFn.addEnvironment('SPEC_BUCKET', specBucket.bucketName);
    bus.grantPutEventsTo(cfFn);

    new Rule(this, `cfRule`, {
      eventBus: props.bus,
      eventPattern: {
        source: ["aws.cloudformation"],
        detailType: ["CloudFormation Stack Status Change"],
        detail: {
          "status-details": {
            status: [...CLOUDFORMATION_SUCCESS],
          },
        },
      },
      targets: [new LambdaFunction(cfFn)]
    });
  }
}
