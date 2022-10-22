import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { EventBridgeEvent } from "aws-lambda";
import fetch from "node-fetch";

const s3 = new S3Client({});

export const handler = async (event: EventBridgeEvent<string, any>) => {
  const res = await fetch(event.detail.openApiSpecs);
  const specs = (await res.json()) as Record<string, any>;

  const gateways = Object.keys(specs);
  for (let j = 0; j < gateways.length; j++) {
    const fileLoc = {
      Bucket: process.env.SPEC_BUCKET,
      Key: `openapi/${event.account}/${event.detail.stackName}/${gateways[j]}/openapi.json`,
    };

    const putObjectCommand = new PutObjectCommand({
      ...fileLoc,
      Body: JSON.stringify(specs[gateways[j]], null, 2),
    });
    const putRes = await s3.send(putObjectCommand);
    console.log(JSON.stringify(putRes));
  }
};
