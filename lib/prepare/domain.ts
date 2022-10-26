import { mkdirSync, existsSync, writeFileSync } from "fs-extra";
import { join } from "path";

export const makeDomain = (account: string) => {
  const domain = `acct-${account}`;
  const domainPath = join(__dirname, `../../catalog/domains/${domain}/`);
  mkdirSync(domainPath, { recursive: true });
  if (!existsSync(join(domainPath, `./index.md`))) {
    const domainMd = [
      `---`,
      `name: ${domain}`,
      `summary: |`,
      `  This is the automatically stubbed documentation. Please replace this by clicking the edit button above.`,
      `owners:`,
      `  - martzcodes`,
      `---`,
    ];
    writeFileSync(join(domainPath, `./index.md`), domainMd.join("\n"));
  }
  return domainPath;
};
