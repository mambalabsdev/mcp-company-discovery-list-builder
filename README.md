# Company Discovery List Builder MCP Server

[![Smithery](https://smithery.ai/badge/mambabuilt/mcp-company-discovery-list-builder)](https://smithery.ai/servers/mambabuilt/mcp-company-discovery-list-builder) [![Glama score](https://glama.ai/mcp/servers/mambalabsdev/mcp-company-discovery-list-builder/badges/score.svg)](https://glama.ai/mcp/servers/mambalabsdev/mcp-company-discovery-list-builder) [![MCP Registry](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fregistry.modelcontextprotocol.io%2Fv0%2Fservers%3Fsearch%3Dcom.mambabuilt%252Fmcp-company-discovery-list-builder%26limit%3D1&query=%24.servers%5B0%5D._meta%5B%22io.modelcontextprotocol.registry%2Fofficial%22%5D.status&label=mcp%20registry&color=blue)](https://registry.modelcontextprotocol.io/v0/servers?search=com.mambabuilt/mcp-company-discovery-list-builder&limit=1) [![npm version](https://img.shields.io/npm/v/@mambalabsdev/mcp-company-discovery-list-builder)](https://www.npmjs.com/package/@mambalabsdev/mcp-company-discovery-list-builder) [![npm downloads](https://img.shields.io/npm/dm/@mambalabsdev/mcp-company-discovery-list-builder)](https://www.npmjs.com/package/@mambalabsdev/mcp-company-discovery-list-builder) [![license](https://img.shields.io/github/license/mambalabsdev/mcp-company-discovery-list-builder)](https://github.com/mambalabsdev/mcp-company-discovery-list-builder/blob/main/LICENSE) [![mcpservers.org](https://img.shields.io/badge/mcpservers.org-listed-blue)](https://mcpservers.org/servers/mambalabsdev/mcp-company-discovery-list-builder)

MCP server for the Mamba Labs [Company Discovery List Builder](https://apify.com/mambalabs/company-discovery-list-builder) actor on Apify.

Market in, companies out. Give it role keywords and a location and it returns the companies currently hiring for that. A second mode returns US SEC filers whose filings contain your phrase. No paid data source is involved.

## Install

```bash
npx -y @mambalabsdev/mcp-company-discovery-list-builder
```

### Claude Desktop

```json
{
  "mcpServers": {
    "mamba-company-discovery-list-builder": {
      "command": "npx",
      "args": ["-y", "@mambalabsdev/mcp-company-discovery-list-builder"],
      "env": { "APIFY_TOKEN": "your-apify-token" }
    }
  }
}
```

Get an Apify token at [console.apify.com/account/integrations](https://console.apify.com/account/integrations).

## Tool

### `build_company_list`

Market in, companies out. Give it role keywords and a location and it returns the companies currently hiring for that. A second mode returns US SEC filers whose filings contain your phrase. No paid data source is involved.

| Input | Type | Required | Notes |
| --- | --- | --- | --- |
| `mode` | enum | yes | hiring returns companies currently hiring for your role keywords, built from a live index of public Greenhouse and Ashby job boards. filings returns US SEC filers whose filings contain your phrase. |
| `role_keywords` | string | no | Comma separated. Matched as whole words against live job titles, so account executive matches Enterprise Account Executive and does not match Executive Assistant. Leave empty to match any role. Used in hiring mode. |
| `filing_phrase` | string | no | Exact phrase searched in SEC filings, for example agentic AI. Used in filings mode. |
| `filing_forms` | string | no | Comma separated SEC form types, for example 10-K,10-Q. Used in filings mode. |
| `location_contains` | string | no | Substring match against the job location string, for example London, Remote, New York. Locations are free text on every job board, so this is a plain substring test: Remote does not match US Remote. |
| `min_open_jobs` | string | no | Skip companies with fewer open roles than this. A rough size proxy. Sent as a string so it works from Clay. |
| `max_companies` | string | no | How many companies to return, 1 to 2000. Sent as a string so it works from Clay. You are billed per company returned, not per company examined. |
| `resolve_domains` | boolean | no | Look up each company's website. Off by default: it adds roughly a second per company and about two thirds of companies resolve. Check domain_status and domain_confidence before trusting a result. |
| `refresh_universe` | boolean | no | Force a fresh Common Crawl enumeration instead of the cached one. The cached universe is rebuilt about monthly on its own, so leave this off unless you need the newest crawl. |

## Billing

You are charged per company returned, not per company examined, plus a small actor start fee. max_companies is therefore a hard cost cap.

Pricing is on the [actor's Apify page](https://apify.com/mambalabs/company-discovery-list-builder). Running this server consumes Apify credits.

## What this server does and does not do

It is a thin client for the Apify actor. It passes your input through and returns the actor's output unchanged. Every behavior described above lives in the actor, not here.

Errors are surfaced, never swallowed. An invalid input, an invalid token, an exhausted balance, a timeout, or a run that returns anything other than a dataset all come back as an explicit tool error rather than as an empty result.

## Source

The actor is on the [Apify Store]( https://apify.com/mambalabs/company-discovery-list-builder). This wrapper is [MIT licensed](LICENSE).

Built by [Mamba Labs](https://apify.com/mambalabs)
