#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(here, "..", "package.json"), "utf8"),
) as { version: string; name: string };

// Distinctive UA so Apify run meta.userAgent marks MCP-originated runs.
const USER_AGENT = `mambalabs-mcp ${pkg.name}@${pkg.version}`;

type ToolResult = {
  isError?: boolean;
  content: Array<{ type: "text"; text: string }>;
};

// Drop undefined values so optional inputs are not sent to the actor.
function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

// Shared caller. actorPath is the actor's immutable Apify actor ID (a stable key
// that survives Store renames). The /v2/acts/{id} endpoint accepts it directly,
// so a Store rename never breaks these calls.
//
// The token is read here rather than at module load, so the tool registers
// unconditionally and a server started without APIFY_TOKEN still advertises its
// capabilities instead of reporting none.
async function runActor(
  actorPath: string,
  actorLabel: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  if (!APIFY_TOKEN) {
    return { isError: true, content: [{ type: "text", text: "APIFY_TOKEN is not set. Create a token at https://console.apify.com/account/integrations and set it as the APIFY_TOKEN environment variable." }] };
  }

  const url = `https://api.apify.com/v2/acts/${actorPath}/run-sync-get-dataset-items?timeout=300`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${APIFY_TOKEN}`,
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify(input),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { isError: true, content: [{ type: "text", text: `Could not reach the Apify API: ${message}` }] };
  }

  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body?.error?.message) detail = ` ${body.error.message}`;
    } catch {
      detail = "";
    }

    let message: string;
    switch (response.status) {
      case 400:
        message = `The ${actorLabel} run was rejected as invalid input.${detail}`;
        break;
      case 401:
        message = "Invalid Apify token. Check your APIFY_TOKEN environment variable.";
        break;
      case 402:
        message =
          "Insufficient Apify credits. Check your account balance at https://console.apify.com/billing";
        break;
      case 408:
        message = `The ${actorLabel} run timed out after 300 seconds. Ask for less per call, or run the actor on Apify directly for larger jobs.`;
        break;
      default:
        message = `Apify request to ${actorLabel} failed with status ${response.status}.${detail}`;
    }
    return { isError: true, content: [{ type: "text", text: message }] };
  }

  // A 2xx from run-sync-get-dataset-items normally carries the dataset array.
  // Anything else on this path is a failure the caller must see, never an empty
  // success: surfacing it here is what keeps a failed run from reading as "no
  // results found".
  let items: unknown;
  try {
    items = await response.json();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { isError: true, content: [{ type: "text", text: `The ${actorLabel} run returned a response that could not be parsed: ${message}` }] };
  }

  if (!Array.isArray(items)) {
    const asObj = items as { error?: { type?: string; message?: string } };
    const detail = asObj?.error?.message
      ? `${asObj.error.message}`
      : JSON.stringify(items);
    return { isError: true, content: [{ type: "text", text: `The ${actorLabel} run did not return a dataset. ${detail}` }] };
  }

  return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
}

const server = new McpServer({
  name: "mamba-company-discovery-list-builder",
  version: pkg.version,
});

// Company Discovery List Builder (immutable actor ID jch0HdaZnpbMqlcGS)
server.registerTool(
  "build_company_list",
  {
    title: "Build Company List",
    description:
      "Build a list of companies from a market definition, in two modes. hiring returns companies currently advertising for your role keywords, built from a live index of public Greenhouse and Ashby job boards; role_keywords are matched as whole words against live job titles, so account executive matches Enterprise Account Executive and does not match Executive Assistant. filings returns US public companies whose SEC filings of the form types you name contain your exact phrase. location_contains is a plain substring test against the job board's own free text location string, so Remote does not match US Remote. min_open_jobs is a rough size proxy. resolve_domains looks up each company's website, which adds roughly a second per company and resolves about two thirds of the time, so check domain_status and domain_confidence before trusting a domain. The underlying company universe is rebuilt about monthly on its own; refresh_universe forces a fresh enumeration and is rarely what you want. You are billed per company returned, not per company examined, so max_companies is the cost dial. Requires an APIFY_TOKEN and consumes Apify credits. Read only.",
    annotations: {
      title: "Build Company List",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
    mode: z.enum(["hiring", "filings"]).describe("hiring returns companies currently hiring for your role keywords, built from a live index of public Greenhouse and Ashby job boards. filings returns US SEC filers whose filings contain your phrase."),
    role_keywords: z.string().optional().describe("Comma separated. Matched as whole words against live job titles, so account executive matches Enterprise Account Executive and does not match Executive Assistant. Leave empty to match any role. Used in hiring mode."),
    filing_phrase: z.string().optional().describe("Exact phrase searched in SEC filings, for example agentic AI. Used in filings mode."),
    filing_forms: z.string().optional().describe("Comma separated SEC form types, for example 10-K,10-Q. Used in filings mode. Default: \"10-K\"."),
    location_contains: z.string().optional().describe("Substring match against the job location string, for example London, Remote, New York. Locations are free text on every job board, so this is a plain substring test: Remote does not match US Remote."),
    min_open_jobs: z.string().optional().describe("Skip companies with fewer open roles than this. A rough size proxy. Sent as a string so it works from Clay. Default: \"1\"."),
    max_companies: z.string().optional().describe("How many companies to return, 1 to 2000. Sent as a string so it works from Clay. You are billed per company returned, not per company examined. Default: \"100\"."),
    resolve_domains: z.boolean().optional().describe("Look up each company's website. Off by default: it adds roughly a second per company and about two thirds of companies resolve. Check domain_status and domain_confidence before trusting a result. Default: true."),
    refresh_universe: z.boolean().optional().describe("Force a fresh Common Crawl enumeration instead of the cached one. The cached universe is rebuilt about monthly on its own, so leave this off unless you need the newest crawl. Default: false."),
    },
  },
  async (args) =>
    runActor("jch0HdaZnpbMqlcGS", "Company Discovery List Builder", compact(args as Record<string, unknown>)),
);

const transport = new StdioServerTransport();
await server.connect(transport);
