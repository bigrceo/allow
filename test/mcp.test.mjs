// Starts the stdio MCP server like Claude would and calls it with the official client.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

test("MCP exposes the six tools and answers budget", async () => {
  const client = new Client({ name: "test", version: "0" });
  await client.connect(new StdioClientTransport({ command: "node", args: ["mcp/server.mjs"], env: { ...process.env } }));
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ["allot_budget", "allot_history", "allot_pay", "allot_quote", "allot_swap", "allot_wallet"]);
  const r = await client.callTool({ name: "allot_budget", arguments: {} });
  assert.match(r.content[0].text, /perActionUsd|No agent wallet/);
  await client.close();
});
