import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Catalog } from './catalog';

export interface BlogDevCatalogStackProps extends StackProps {
  hostDomain?: string;
}

export class BlogDevCatalogStack extends Stack {
  constructor(scope: Construct, id: string, props: BlogDevCatalogStackProps) {
    super(scope, id, props);

    const { hostDomain } = props;

    // Construct is split out for blog-demo purposes.
    // CatalogOne for initial deploy
    // new CatalogOne(this, `Catalog`);
    // new CatalogTwo(this, `Catalog`);
    
    // Catalog is the final iteration.
    new Catalog(this, `Catalog`, {
      hostDomain,
    });
  }
}
