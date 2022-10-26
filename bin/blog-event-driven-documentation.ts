#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BlogDevCatalogStack } from '../lib/watcher/blog-dev-catalog-watcher-stack';
import { AccountStack } from '../lib/account/account-stack';

const app = new cdk.App();
new BlogDevCatalogStack(app, 'BlogDevCatalogWatcherStack', {
  env: {
    region: process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT
  }
});

new AccountStack(app, `BlogDevCatalogAccountStack`);