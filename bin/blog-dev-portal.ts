#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BlogDevPortalStack } from '../lib/blog-dev-portal-stack';

const app = new cdk.App();
new BlogDevPortalStack(app, 'BlogDevPortalStack', {
  env: {
    region: 'us-east-1',
    account: process.env.CDK_DEFAULT_ACCOUNT
  }
});