import fs from 'fs/promises';
import path from 'path';

interface McpDocument {
  schema: string;
  id: string;
  title: string;
  tags: string[];
  content: {
    type: string;
    value: string;
  };
  metadata: {
    source: string;
    file: string;
    created: string;
    updated: string;
  };
}

const INPUT_DIR = './markdown';
const OUTPUT_DIR = './mcp';

// Recursively collect all markdown files
async function getMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const res = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await getMarkdownFiles(res));
    } else if (entry.name.endsWith('.md')) {
      files.push(res);
    }
  }

  return files;
}

// Convert a single markdown file to MCP JSON
async function convertToMCP(mdPath: string): Promise<void> {
  const content = await fs.readFile(mdPath, 'utf-8');
  const mdBody = content;

  const relativePath = path.relative(INPUT_DIR, mdPath);
  const segments = relativePath.split(path.sep);
  const [category, ...rest] = segments;
  const filename = rest.pop();
  
  if (!filename) {
    throw new Error(`Invalid file path: ${mdPath}`);
  }
  
  const name = filename.replace(/\.md$/, '');

  const mcp: McpDocument = {
    schema: '1.0',
    id: `/primevue/${category.toLowerCase()}/${name}`,
    title: name.replace(/-/g, ' '),
    tags: [category],
    content: {
      type: 'text/markdown',
      value: mdBody.trim()
    },
    metadata: {
      source: 'https://primevue.org',
      file: relativePath.replace(/\\/g, '/'),
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    }
  };

  const outputPath = path.join(OUTPUT_DIR, category, `${name}.json`);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(mcp, null, 2), 'utf-8');
  console.log(`✅ Converted: ${relativePath} → ${path.relative('.', outputPath)}`);
}

async function main(): Promise<void> {
  const files = await getMarkdownFiles(INPUT_DIR);
  if (files.length === 0) {
    throw new Error(`❌ No markdown files found in "${INPUT_DIR}". Please run npm run scrape first.`);
  }

  for (const file of files) {
    await convertToMCP(file);
  }

  console.log('🎉 All MCP files generated.');
}

main().catch((err) => {
  const errorMessage = err instanceof Error ? err.message : String(err);
  console.error(errorMessage);
});