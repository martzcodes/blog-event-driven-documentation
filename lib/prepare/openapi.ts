import {
  S3Client,
  ListObjectsCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { streamToString } from "./utils";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { makeDomain } from "./domain";

export const processOpenApi = async ({s3Client, Bucket}: {s3Client: S3Client; Bucket: string; }) => {
  try {
    const listBucketObjectsCommand = new ListObjectsCommand({
      Bucket,
      Prefix: "openapi/",
    });
    const bucketObjects = await s3Client.send(listBucketObjectsCommand);
    const specs = bucketObjects.Contents!.map((content) => {
      const key = content.Key!;
      const splitKey = key.split("/");
      const account = splitKey[1];
      const stack = splitKey[2];
      const apiId = splitKey[3].split(".")[0];
      return { key, account, stack, apiId };
    });

    for (let j = 0; j < specs.length; j++) {
      const specMeta = specs[j];
      const getSpecCommand = new GetObjectCommand({
        Bucket,
        Key: specMeta.key,
      });

      const specObj = await s3Client.send(getSpecCommand);
      const spec = await streamToString(specObj.Body as Readable);
      const specJson = JSON.parse(spec);
      const apiName = specJson.info.title;
      const domainPath = makeDomain(specMeta.account);
      const basePath = join(domainPath, `./services/${apiName}`);
      mkdirSync(basePath, { recursive: true });
      writeFileSync(join(basePath, `./openapi.json`), spec);
      if (!existsSync(join(basePath, `./index.md`))) {
        const apiMd = [
          `---`,
          `name: ${apiName}`,
          `summary: |`,
          `  This is the automatically stubbed documentation for the ${apiName} API (${specMeta.apiId}) in the ${specMeta.stack} stack. Please replace this.`,
          `---`,
          ``,
          `<OpenAPI />`,
        ];
        writeFileSync(join(basePath, `./index.md`), apiMd.join("\n"));
      }
    }
  } catch (e) {
    console.log(e);
  }
};
