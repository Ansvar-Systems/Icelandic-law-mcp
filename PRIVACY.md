# Privacy & Client Confidentiality

**IMPORTANT READING FOR LEGAL PROFESSIONALS**

This document addresses privacy and confidentiality considerations when using this Tool, with particular attention to professional obligations under Icelandic bar association rules.

---

## Executive Summary

**Key Risks:**
- Queries through Claude API flow via Anthropic cloud infrastructure
- Query content may reveal client matters and privileged information
- Icelandic bar rules (Lögmannafélag Íslands) require strict confidentiality (trúnaðarskylda) and data processing controls

**Safe Use Options:**
1. **General Legal Research**: Use Tool for non-client-specific queries
2. **Local npm Package**: Install `@ansvar/icelandic-law-mcp` locally — database queries stay on your machine
3. **Remote Endpoint**: Vercel Streamable HTTP endpoint — queries transit Vercel infrastructure
4. **On-Premise Deployment**: Self-host with local LLM for privileged matters

---

## Data Flows and Infrastructure

### MCP (Model Context Protocol) Architecture

This Tool uses the **Model Context Protocol (MCP)** to communicate with AI clients:

```
User Query -> MCP Client (Claude Desktop/Cursor/API) -> Anthropic Cloud -> MCP Server -> Database
```

### Deployment Options

#### 1. Local npm Package (Most Private)

```bash
npx @ansvar/icelandic-law-mcp
```

- Database is local SQLite file on your machine
- No data transmitted to external servers (except to AI client for LLM processing)
- Full control over data at rest

#### 2. Remote Endpoint (Vercel)

```
Endpoint: https://icelandic-law-mcp.vercel.app/mcp
```

- Queries transit Vercel infrastructure
- Tool responses return through the same path
- Subject to Vercel's privacy policy

### What Gets Transmitted

When you use this Tool through an AI client:

- **Query Text**: Your search queries and tool parameters
- **Tool Responses**: Statute text (lagaákvæði), provision content, search results
- **Metadata**: Timestamps, request identifiers

**What Does NOT Get Transmitted:**
- Files on your computer
- Your full conversation history (depends on AI client configuration)

---

## Professional Obligations (Iceland)

### Icelandic Bar Association Rules

Icelandic lawyers (lögmenn) are bound by strict confidentiality rules under the Act on Attorneys at Law (lög um lögmenn nr. 77/1998) and the rules of the Icelandic Bar Association (Lögmannafélag Íslands).

#### Trúnaðarskylda (Duty of Confidentiality)

- All client communications are privileged
- Client identity may be confidential in sensitive matters
- Case strategy and legal analysis are protected
- Information that could identify clients or matters must be safeguarded
- Breach of confidentiality may result in disciplinary proceedings (agamál)

### Icelandic Data Protection Law and GDPR / EEA Equivalent

Under **GDPR Article 28** (applicable in Iceland via the EEA Agreement) and the **Icelandic Data Protection Act (lög um persónuvernd og vinnslu persónuupplýsinga nr. 90/2018)**:

- You are the **Data Controller** (Ábyrgðaraðili)
- AI service providers (Anthropic, Vercel) may be **Data Processors** (Vinnsluaðili)
- A **Data Processing Agreement** (Samningur um vinnslu persónuupplýsinga) may be required
- Ensure adequate technical and organizational measures (tæknilegar og skipulagslegar ráðstafanir)
- The Icelandic Data Protection Authority (Persónuvernd, personuvernd.is) oversees compliance

---

## Risk Assessment by Use Case

### LOW RISK: General Legal Research

**Safe to use through any deployment:**

```
Example: "What does the Icelandic Contracts Act (samningalög) say about offer and acceptance?"
```

- No client identity involved
- No case-specific facts
- Publicly available legal information

### MEDIUM RISK: Anonymized Queries

**Use with caution:**

```
Example: "What are the penalties for fraud (svik) under Icelandic criminal law (almenn hegningarlög)?"
```

- Query pattern may reveal you are working on a specific type of matter
- Anthropic/Vercel logs may link queries to your API key

### HIGH RISK: Client-Specific Queries

**DO NOT USE through cloud AI services:**

- Remove ALL identifying details before querying
- Use the local npm package with a self-hosted LLM
- Or use official sources (althingi.is) directly

---

## Data Collection by This Tool

### What This Tool Collects

**Nothing.** This Tool:

- Does NOT log queries
- Does NOT store user data
- Does NOT track usage
- Does NOT use analytics
- Does NOT set cookies

The database is read-only. No user data is written to disk.

### What Third Parties May Collect

- **Anthropic** (if using Claude): Subject to [Anthropic Privacy Policy](https://www.anthropic.com/legal/privacy)
- **Vercel** (if using remote endpoint): Subject to [Vercel Privacy Policy](https://vercel.com/legal/privacy-policy)

---

## Recommendations

### For Solo Practitioners / Small Firms (Einstaklingar / Litlar Lögmannsstofur)

1. Use local npm package for maximum privacy
2. General research: Cloud AI is acceptable for non-client queries
3. Client matters: Use official sources (althingi.is) or established legal databases directly

### For Large Firms / Corporate Legal (Stórar Lögmannsstofur / Lagadeildir)

1. Negotiate Data Processing Agreements with AI service providers
2. Consider on-premise deployment with self-hosted LLM
3. Train staff on safe vs. unsafe query patterns

### For Government / Public Sector (Ríkisstofnanir / Sveitarfélög)

1. Use self-hosted deployment, no external APIs
2. Follow Icelandic government IT security requirements
3. Air-gapped option available for classified matters

---

## Questions and Support

- **Privacy Questions**: Open issue on [GitHub](https://github.com/Ansvar-Systems/Icelandic-law-mcp/issues)
- **Anthropic Privacy**: Contact privacy@anthropic.com
- **Persónuvernd Guidance**: Consult the Icelandic Data Protection Authority (personuvernd.is) for GDPR/EEA compliance guidance
- **Lögmannafélag Guidance**: Consult the Icelandic Bar Association (logmannafelag.is) for professional ethics guidance on AI tools

---

**Last Updated**: 2026-03-06
**Tool Version**: 1.0.0
