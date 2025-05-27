#!/usr/bin/env node

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

interface PrimeVueDoc {
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

class PrimeVueServer {
  private server: McpServer;
  private docs: Map<string, PrimeVueDoc> = new Map();
  private docsPath: string;

  constructor(docsPath: string) {
    this.docsPath = docsPath;
    this.server = new McpServer({
      name: 'primevue-docs',
      version: '0.1.0',
    });

    this.setupServer();
  }

  private async loadDocs() {
    try {
      await this.loadDocsRecursive(this.docsPath);
      console.error(`Loaded ${this.docs.size} PrimeVue documentation files`);
    } catch (error) {
      console.error('Error loading docs:', error);
    }
  }

  private async loadDocsRecursive(dirPath: string) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          await this.loadDocsRecursive(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const doc: PrimeVueDoc = JSON.parse(content);
            this.docs.set(doc.id, doc);
            console.error(`Loaded: ${doc.id} from ${fullPath}`);
          } catch (error) {
            console.error(`Error loading ${fullPath}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
    }
  }

  private setupServer() {
    // Dynamic resource for each documentation page
    this.server.resource(
      'primevue-docs',
      new ResourceTemplate('primevue://{docPath}', {
        docPath: z.string().describe('Document path (e.g., components/accordion)')
      }),
      async (uri, { docPath }) => {
        const docId = `/primevue/${docPath}`;
        const doc = this.docs.get(docId);
        
        if (!doc) {
          throw new Error(`Documentation not found: ${docPath}`);
        }

        return {
          contents: [{
            uri: uri.href,
            mimeType: 'text/markdown',
            text: doc.content.value
          }]
        };
      }
    );

    // Search tool
    this.server.tool(
      'search_primevue_docs',
      {
        query: z.string().describe('Search query for PrimeVue documentation'),
        component: z.string().optional().describe('Specific component name to search within')
      },
      async ({ query, component }) => {
        const results = [];
        const searchTerm = query.toLowerCase();

        for (const [id, doc] of this.docs) {
          if (component && !doc.title.toLowerCase().includes(component.toLowerCase())) {
            continue;
          }

          const content = doc.content.value.toLowerCase();
          const titleMatch = doc.title.toLowerCase().includes(searchTerm);
          const contentMatch = content.includes(searchTerm);
          const tagsMatch = doc.tags.some(tag => tag.toLowerCase().includes(searchTerm));

          if (titleMatch || contentMatch || tagsMatch) {
            const lines = doc.content.value.split('\n');
            const relevantLines = lines.filter(line => 
              line.toLowerCase().includes(searchTerm)
            ).slice(0, 3);

            const category = doc.metadata.file.split('/')[0] || 'Unknown';

            results.push({
              component: doc.title,
              category: category,
              id: doc.id,
              snippet: relevantLines.length > 0 ? relevantLines.join('\n') : `${doc.title} documentation`,
              uri: `primevue://${id.replace('/primevue/', '')}`,
              tags: doc.tags,
            });
          }
        }

        results.sort((a, b) => {
          const aTitle = a.component.toLowerCase().includes(searchTerm) ? 1 : 0;
          const bTitle = b.component.toLowerCase().includes(searchTerm) ? 1 : 0;
          return bTitle - aTitle;
        });

        return {
          content: [{
            type: 'text',
            text: `Found ${results.length} results for "${query}":\n\n${results
              .map(r => `**${r.component}** (${r.category})\nTags: ${r.tags.join(', ')}\n${r.snippet}\n(URI: ${r.uri})\n`)
              .join('\n')}`
          }]
        };
      }
    );

    // Get component API tool  
    this.server.tool(
      'get_component_api',
      {
        component: z.string().describe('Component name (e.g., "accordion", "button")')
      },
      async ({ component }) => {
        let doc = Array.from(this.docs.values()).find(d => 
          d.title.toLowerCase() === component.toLowerCase()
        );
        
        if (!doc) {
          const docId = `/primevue/components/${component.toLowerCase()}`;
          doc = this.docs.get(docId);
        }
        
        if (!doc) {
          const availableComponents = Array.from(this.docs.values())
            .map(d => ({
              title: d.title,
              category: d.metadata.file.split('/')[0] || 'Unknown'
            }))
            .sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));

          const componentsByCategory = availableComponents.reduce((acc, comp) => {
            if (!acc[comp.category]) acc[comp.category] = [];
            acc[comp.category].push(comp.title);
            return acc;
          }, {} as Record<string, string[]>);

          const availableList = Object.entries(componentsByCategory)
            .map(([category, components]) => 
              `**${category}**: ${components.join(', ')}`
            ).join('\n');

          return {
            content: [{
              type: 'text',
              text: `Component "${component}" not found.\n\nAvailable components:\n${availableList}`
            }]
          };
        }

        const content = doc.content.value;
        const apiStart = content.indexOf('### API');
        const apiContent = apiStart > -1 ? content.substring(apiStart) : content;

        return {
          content: [{
            type: 'text',
            text: `# ${doc.title} API Reference\nCategory: ${doc.metadata.file.split('/')[0]}\nTags: ${doc.tags.join(', ')}\n\n${apiContent}`
          }]
        };
      }
    );

    // List categories tool
    this.server.tool(
      'list_categories',
      {
        category: z.string().optional().describe('Filter by specific category')
      },
      async ({ category }) => {
        const categories = new Map<string, string[]>();
        
        for (const [id, doc] of this.docs) {
          const docCategory = doc.metadata.file.split('/')[0] || 'Unknown';
          if (category && docCategory.toLowerCase() !== category.toLowerCase()) {
            continue;
          }
          
          if (!categories.has(docCategory)) {
            categories.set(docCategory, []);
          }
          categories.get(docCategory)!.push(doc.title);
        }

        const result = Array.from(categories.entries())
          .map(([cat, components]) => {
            components.sort();
            return `**${cat}** (${components.length} items)\n${components.map(c => `  - ${c}`).join('\n')}`;
          })
          .join('\n\n');

        return {
          content: [{
            type: 'text',
            text: category 
              ? `Components in "${category}" category:\n\n${result}`
              : `PrimeVue Documentation Categories:\n\n${result}`
          }]
        };
      }
    );
  }

  async run() {
    await this.loadDocs();
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('PrimeVue MCP server running on stdio');
  }
}

async function main() {
  const docsPath = process.argv[2] || './mcp';
  const server = new PrimeVueServer(docsPath);
  await server.run();
}

main().catch(console.error);