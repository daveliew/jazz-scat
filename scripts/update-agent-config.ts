/**
 * Sync local agent config to the live ElevenLabs agent
 *
 * Run: npx tsx scripts/update-agent-config.ts
 *
 * Pushes agent_configs/jazz-scat-dj.json (conversation_config + workflow)
 * to the live agent. The local file is the source of truth — edit it,
 * run this, commit both.
 */

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
dotenv.config({ path: ".env.local" });

const CONFIG_PATH = path.join(
  __dirname,
  "..",
  "agent_configs",
  "jazz-scat-dj.json",
);

async function updateAgentConfig() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  if (!apiKey || !agentId) {
    console.error("Missing environment variables:");
    console.error("  ELEVENLABS_API_KEY:", apiKey ? "OK" : "MISSING");
    console.error("  ELEVENLABS_AGENT_ID:", agentId ? "OK" : "MISSING");
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));

  if (config.agent_id !== agentId) {
    console.error(
      `Config agent_id (${config.agent_id}) does not match ELEVENLABS_AGENT_ID (${agentId})`,
    );
    process.exit(1);
  }

  // The API rejects a prompt carrying both `tools` (expanded) and `tool_ids`;
  // tool_ids is the reference form, so strip the expansion before sending.
  const conversationConfig = structuredClone(config.conversation_config);
  delete conversationConfig.agent.prompt.tools;

  const body = {
    conversation_config: conversationConfig,
    workflow: config.workflow,
  };

  console.log("Syncing agent config...");
  console.log("Agent ID:", agentId.substring(0, 12) + "...");
  console.log("tool_ids:", conversationConfig.agent.prompt.tool_ids);
  console.log("workflow nodes:", Object.keys(config.workflow?.nodes ?? {}));

  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
    {
      method: "PATCH",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("ElevenLabs API error:", response.status, error);
    process.exit(1);
  }

  const data = await response.json();
  const liveTools = (data.conversation_config?.agent?.prompt?.tool_ids ??
    []) as string[];
  const liveNodes = Object.keys(data.workflow?.nodes ?? {});
  console.log("Agent updated successfully!");
  console.log("Live tool_ids now:", liveTools);
  console.log("Live workflow nodes now:", liveNodes);
}

updateAgentConfig();
