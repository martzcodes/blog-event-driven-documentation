#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BlogDevCatalogStack } from '../lib/blog-dev-catalog-watcher-stack';

const app = new cdk.App();
new BlogDevCatalogStack(app, 'BlogDevCatalogStack', {
  env: {
    region: process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT
  }
});