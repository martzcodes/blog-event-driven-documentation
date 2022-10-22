import { S3Client } from "@aws-sdk/client-s3";
import { processOpenApi } from "./openapi";

const Bucket = process.argv[2];
console.log(`Bucket ${Bucket}`);

const s3Client = new S3Client({ region: "us-east-1" });

const main = async () => {
  if (!Bucket) {
    return;
  }
  await processOpenApi({ s3Client, Bucket });
  console.log("processed OpenApi");
};

main();
