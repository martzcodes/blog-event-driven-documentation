import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Catalog } from './catalog';

export class BlogDevPortalStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Construct is split out for blog-demo purposes.
    // CatalogOne for initial deploy
    // new CatalogOne(this, `Catalog`);
    // new CatalogTwo(this, `Catalog`);
    
    // Catalog is the final iteration.
    new Catalog(this, `Catalog`);
  }
}
