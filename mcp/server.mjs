#!/usr/bin/env node
// Allow MCP server (stdio). Claude Desktop, Claude Code, Cursor, any MCP client.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools.mjs";

const server = new McpServer({ name: "allow", version: "0.1.0" });
registerTools(server);
await server.connect(new StdioServerTransport());
