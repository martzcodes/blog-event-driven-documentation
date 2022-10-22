import { IEventBus, Rule } from "aws-cdk-lib/aws-events";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

const CLOUDFORMATION_SUCCESS = ["CREATE_COMPLETE", "UPDATE_COMPLETE", "IMPORT_COMPLETE"];

export interface CloudFormationListenerProps {
    bus: IEventBus;
    specBucket: Bucket;
}
export class CFListener extends Construct {
    constructor(scope: Construct, id: string, props: CloudFormationListenerProps) {
        super(scope, id);

        // create the lambda
        // add bus/bucket perms / env vars to lambda

        const cfRule = new Rule(this, `cfRule`, {
            eventBus: props.bus,
            eventPattern: {
                source: ["aws.cloudformation"],
                detailType: ["CloudFormation Stack Status Change"],
                detail: {
                    "stack-details": {
                        status: [...CLOUDFORMATION_SUCCESS],
                    }
                }
            }
        });
        
    }
}