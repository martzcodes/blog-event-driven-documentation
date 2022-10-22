import {
  APIGatewayClient,
  GetExportCommand,
  GetRestApisCommand,
} from "@aws-sdk/client-api-gateway";
import {
  Change,
  CloudFormationClient,
  DescribeChangeSetCommand,
  DescribeStacksCommand,
  GetTemplateCommand,
  TemplateStage,
} from "@aws-sdk/client-cloudformation";
import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { EventBridgeEvent } from "aws-lambda";

interface CloudFormationStatus {
  "stack-id": string;
  "status-details": {
    status: string;
    "status-reason": string;
  };
}

const cf = new CloudFormationClient({});
const s3 = new S3Client({});
const api = new APIGatewayClient({});
const eb = new EventBridgeClient({});

export const handler = async (
  event: EventBridgeEvent<string, CloudFormationStatus>
) => {
  const StackName = event.detail["stack-id"];
  const describeCommand = new DescribeStacksCommand({ StackName });
  const stacks = await cf.send(describeCommand);
  const stack = stacks.Stacks?.[0];
  const ChangeSetName = stack?.ChangeSetId;

  const getChangeSets = async (NextToken?: string): Promise<boolean> => {
    const changeSet = await cf.send(
      new DescribeChangeSetCommand({
        StackName,
        ChangeSetName,
        NextToken,
      })
    );
    const apiChanged =
      (changeSet.Changes || []).filter((change) =>
        change.ResourceChange?.ResourceType?.startsWith("AWS::ApiGateway")
      ).length !== 0;
    if (apiChanged) {
      return true;
    }
    if (changeSet.NextToken) {
      return getChangeSets(changeSet.NextToken);
    }
    return false;
  };

  const apiChanged = await getChangeSets();
  if (!apiChanged) {
    return;
  }

  const getTemplateCommand = new GetTemplateCommand({
    StackName,
    TemplateStage: TemplateStage.Processed,
  });
  const template = await cf.send(getTemplateCommand);
  if (!template.TemplateBody) {
    return;
  }
  const resources: Record<string, any> = JSON.parse(
    template.TemplateBody
  )?.Resources;
  if (!resources) {
    return;
  }
  const getApis = new GetRestApisCommand({
    limit: 500,
  });
  const apiRes = await api.send(getApis);
  if (!apiRes.items) {
    return;
  }
  const apis = apiRes.items.reduce((p, c) => {
    if (c.tags?.["aws:cloudformation:stack-id"] !== StackName) {
      return p;
    }
    if (c.tags?.["aws:cloudformation:logical-id"]) {
      return { ...p, [c.tags?.["aws:cloudformation:logical-id"]]: c.id! };
    }
    return p;
  }, {} as Record<string, string>);
  const apiStages = Object.values(resources).filter(
    (res: any) => res.Type === "AWS::ApiGateway::Stage"
  );
  const apiSpecs: Record<string, any> = {};
  for (let j = 0; j < apiStages.length; j++) {
    const restApiId = apis[apiStages[j].Properties.RestApiId.Ref];
    const stageName = apiStages[j].Properties.StageName;
    const exportCommand = new GetExportCommand({
      accepts: "application/json",
      exportType: "oas30",
      restApiId,
      stageName,
    });
    const exportRes = await api.send(exportCommand);
    const oas = Buffer.from(exportRes.body!.buffer).toString();
    apiSpecs[`${restApiId}-${stageName}`] = JSON.parse(oas);
  }

  const fileLoc = {
    Bucket: process.env.SPEC_BUCKET,
    Key: `${StackName}/specs.json`,
  };

  const putObjectCommand = new PutObjectCommand({
    ...fileLoc,
    Body: JSON.stringify(apiSpecs),
  });
  await s3.send(putObjectCommand);

  const getObjectCommand = new GetObjectCommand({
    ...fileLoc,
  });
  const url = await getSignedUrl(s3, getObjectCommand, { expiresIn: 60 * 60 });

  const fwdEvent = {};

  const putEvent = new PutEventsCommand({
    Entries: [
      {
        Source: "blog.dev.portal",
        DetailType: "spec.openapi",
        Detail: JSON.stringify({
          openApiSpecs: url,
        }),
      },
    ],
  });
  await eb.send(putEvent);
};
