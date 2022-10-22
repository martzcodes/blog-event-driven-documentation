import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import { RemovalPolicy, DockerImage, CfnOutput } from "aws-cdk-lib";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Source } from "aws-cdk-lib/aws-s3-deployment";
import { Bucket, BlockPublicAccess, ObjectOwnership } from "aws-cdk-lib/aws-s3";
import { BucketDeployment } from "aws-cdk-lib/aws-s3-deployment";
import { Code, Runtime } from "aws-cdk-lib/aws-lambda";
import { ExecSyncOptions, execSync } from "child_process";
import { Construct } from "constructs";
import { copySync } from "fs-extra";
import { join } from "path";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { ViewerProtocolPolicy } from "aws-cdk-lib/aws-cloudfront";

export class CatalogTwo extends Construct {
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

    const edgeFn = new cloudfront.experimental.EdgeFunction(
      this,
      `EdgeRedirect`,
      {
        code: Code.fromInline(
          '"use strict";var n=Object.defineProperty;var u=Object.getOwnPropertyDescriptor;var c=Object.getOwnPropertyNames;var d=Object.prototype.hasOwnProperty;var a=(e,r)=>{for(var i in r)n(e,i,{get:r[i],enumerable:!0})},o=(e,r,i,s)=>{if(r&&typeof r=="object"||typeof r=="function")for(let t of c(r))!d.call(e,t)&&t!==i&&n(e,t,{get:()=>r[t],enumerable:!(s=u(r,t))||s.enumerable});return e};var f=e=>o(n({},"__esModule",{value:!0}),e);var l={};a(l,{handler:()=>h});module.exports=f(l);var h=async e=>{let r=e.Records[0].cf.request;return r.uri!=="/"&&(r.uri.endsWith("/")||r.uri.lastIndexOf(".")<r.uri.lastIndexOf("/"))&&(r.uri=r.uri.concat(`${r.uri.endsWith("/")?"":"/"}index.html`)),r};0&&(module.exports={handler});'
        ),
        handler: "index.handler",
        runtime: Runtime.NODEJS_16_X,
        logRetention: RetentionDays.ONE_DAY,
      }
    );

    const distribution = new cloudfront.Distribution(
      this,
      `EventCatalogDistribution`,
      {
        defaultRootObject: "index.html",
        defaultBehavior: {
          origin: new S3Origin(destinationBucket, { originAccessIdentity }),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          edgeLambdas: [
            {
              functionVersion: edgeFn.currentVersion,
              eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
            },
          ],
        },
      }
    );
    const execOptions: ExecSyncOptions = {
      stdio: ["ignore", process.stderr, "inherit"],
    };
    const uiPath = join(__dirname, `../../../catalog/out`);
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
