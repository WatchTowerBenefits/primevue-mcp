# PrimeVue MCP Server

A Proof of Concept Model Context Protocol (MCP) server that provides access to PrimeVue 4 documentation for AI assistants like Claude Desktop. This project scrapes the official PrimeVue documentation, converts it to a structured format, and serves it through an MCP server for enhanced AI-powered development workflows.

## Features

- **Complete Documentation Scraping** - Scrapes all PrimeVue 4 documentation including components, guides, installation instructions, and API references
- **MCP Server** - Provides standardized access to documentation through the Model Context Protocol
- **Search Functionality** - Very basic search functionality to search across all documentation with component-specific filtering
- **Component API Access** - Get detailed API information for any PrimeVue component
- **Category Browsing** - Browse documentation by categories (Components, Guides, Installation, etc.)
- **Real-time Updates** - Easy re-scraping to keep documentation current

## Perfect for

- **Storybook Story Generation** - Use with AI to generate comprehensive component stories
- **Component Development** - Quick access to API references and usage examples
- **Documentation Lookup** - Fast search across all PrimeVue documentation
- **Learning & Development** - Interactive exploration of PrimeVue capabilities

## Prerequisites

- Node.js 20+ 
- npm or yarn
- Claude Desktop (for MCP integration)

## Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd primevue-mcp
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

## Usage

### Step 1: Scrape Documentation

Scrape the latest PrimeVue documentation:

```bash
npm run scrape
```

This will create markdown files in the `./markdown` directory.

### Step 2: Convert to MCP Format

Convert the markdown files to MCP-compatible JSON:

```bash
npm run convert  
```

This will create structured JSON files in the `./mcp` directory.

### Step 3: Start the MCP Server

For development:
```bash
npm run dev
```

For production:
```bash
npm run serve
```

### Full Pipeline

Run all steps at once:
```bash
npm run build
```

## Claude Desktop Integration

### 1. Find Your Claude Desktop Config

**macOS:**
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```bash
%APPDATA%\Claude\claude_desktop_config.json
```

### 2. Update Your Configuration

Copy the `claude_desktop_config.json.template` file and customize it for your environment:

```json
{
  "mcpServers": {
    "primevue-dev": {
      "command": "/path/to/your/node/bin/npx",
      "args": ["tsx", "/full/path/to/primevue-mcp/src/server.ts", "/full/path/to/primevue-mcp/mcp"],
      "env": {
        "PATH": "/path/to/your/node/bin:/usr/local/bin:/usr/bin:/bin"
      }
    }
  }
}
```

### 3. Customize Paths

You need to update several paths in the configuration:

#### Find Your Node Path
```bash
which npm
# Example output: /Users/youruser/.local/share/mise/installs/node/20.18.3/bin/npm
```

Use the directory containing npm for both the `command` and `PATH` environment variable.

#### Update Project Paths
Replace `/Users/youruser/src/primevue-mcp` with your actual project directory path.

#### Example Configurations

**Using mise/asdf (Development Server):**
```json
{
  "mcpServers": {
    "primevue-dev": {
      "command": "/Users/youruser/.local/share/mise/installs/node/20.18.3/bin/npx",
      "args": ["tsx", "/Users/youruser/src/primevue-mcp/src/server.ts", "/Users/youruser/src/primevue-mcp/mcp"],
      "env": {
        "PATH": "/Users/youruser/.local/share/mise/installs/node/20.18.3/bin:/usr/local/bin:/usr/bin:/bin"
      }
    }
  }
}
```

**Using nvm (Development Server):**
```json
{
  "mcpServers": {
    "primevue-dev": {
      "command": "/Users/youruser/.nvm/versions/node/v20.18.3/bin/npx",
      "args": ["tsx", "/Users/youruser/src/primevue-mcp/src/server.ts", "/Users/youruser/src/primevue-mcp/mcp"],
      "env": {
        "PATH": "/Users/youruser/.nvm/versions/node/v20.18.3/bin:/usr/local/bin:/usr/bin:/bin"
      }
    }
  }
}
```

**Using Built Server (Production):**
```json
{
  "mcpServers": {
    "primevue-prod": {
      "command": "/Users/youruser/.local/share/mise/installs/node/20.18.3/bin/node",
      "args": ["/Users/youruser/src/primevue-mcp/build/server.js"],
      "env": {
        "PATH": "/Users/youruser/.local/share/mise/installs/node/20.18.3/bin:/usr/local/bin:/usr/bin:/bin"
      }
    }
  }
}
```

### 4. Restart Claude Desktop

After updating the configuration, completely quit and restart Claude Desktop.

## MCP Tools Available

Once connected to Claude Desktop, you'll have access to these tools:

### `search_primevue_docs`
Search across all PrimeVue documentation
```
Parameters:
- query (string): Search term
- component (string, optional): Filter by specific component
```

### `get_component_api`  
Get detailed API reference for a specific component
```
Parameters:
- component (string): Component name (e.g., "accordion", "button")
```

### `list_categories`
Browse documentation by categories
```
Parameters:
- category (string, optional): Filter by specific category
```

## Example Usage with Claude

After setup, you can ask Claude:

- *"Search PrimeVue docs for accordion examples"*
- *"Get the API for the Button component"* 
- *"List all Components in the documentation"*
- *"Generate a Storybook story for the DataTable component"*

## Development

### Project Structure

```
primevue-mcp/
├── src/
│   ├── scraper.ts          # Documentation scraper
│   ├── converter.ts        # Markdown to MCP converter  
│   └── server.ts           # MCP server implementation
├── markdown/               # Scraped markdown files
├── mcp/                   # MCP-formatted JSON files
├── build/                 # Compiled TypeScript
└── claude_desktop_config.json.template
```

### Scripts

- `npm run scrape` - Scrape PrimeVue documentation
- `npm run convert` - Convert markdown to MCP format
- `npm run build` - Full pipeline (scrape + convert + compile)
- `npm run dev` - Start MCP server in development mode
- `npm run serve` - Start compiled MCP server

### Updating Documentation

To get the latest PrimeVue documentation:

1. Run `npm run scrape` to get fresh content
2. Run `npm run convert` to regenerate MCP files  
3. Restart your MCP server

## Troubleshooting

### MCP Server Not Connecting

1. **Check paths** - Ensure all paths in your Claude config are absolute and correct
2. **Verify Node installation** - Make sure `npx` and `tsx` are available at the specified paths
3. **Check logs** - Look at Claude Desktop's MCP logs for specific error messages
4. **Test manually** - Try running the server directly: `npm run dev`

### Common Path Issues

- **Use absolute paths** - Relative paths like `~` may not work in Claude Desktop configs
- **Check Node version managers** - mise, nvm, asdf users need to specify full paths to their Node installation
- **Environment variables** - The `PATH` environment variable must include your Node.js bin directory

### No Documentation Found

If the MCP server shows empty results:
1. Verify the `mcp/` directory contains JSON files
2. Check that the scraper successfully created markdown files
3. Ensure the converter ran without errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Claude Desktop
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built for [PrimeVue](https://primevue.org/) - the ultimate collection of design-agnostic, flexible and accessible Vue UI Components
- Uses [Model Context Protocol](https://modelcontextprotocol.io/) for standardized AI integration
- Powered by [Playwright](https://playwright.dev/) for reliable web scraping