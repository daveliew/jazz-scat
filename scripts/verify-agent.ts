/**
 * Verify the live DJ agent can hold a session and call its tools.
 *
 * Run: npx tsx scripts/verify-agent.ts
 *
 * Uses ElevenLabs' server-side conversation simulation, so this needs no
 * microphone and no browser — it catches agent-config breakage (bad workflow,
 * tools the client cannot answer) that a build or lint never sees.
 *
 * Fossilised from the 2026-08 outage: a 3-node workflow killed every session
 * with error 1002 "START node generated a response after progressing", and
 * the only visible symptom was Start Jamming hanging.
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const CLIENT_TOOLS = ["generate_backing_track", "make_music", "stop_track"];

async function verifyAgent() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  if (!apiKey || !agentId) {
    console.error("Missing environment variables:");
    console.error("  ELEVENLABS_API_KEY:", apiKey ? "OK" : "MISSING");
    console.error("  ELEVENLABS_AGENT_ID:", agentId ? "OK" : "MISSING");
    process.exit(1);
  }

  // 1. The agent must only offer tools the client actually registers.
  const agentRes = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
    { headers: { "xi-api-key": apiKey } },
  );
  if (!agentRes.ok) {
    console.error(
      "Could not fetch agent:",
      agentRes.status,
      await agentRes.text(),
    );
    process.exit(1);
  }
  const agent = await agentRes.json();
  const toolIds: string[] =
    agent.conversation_config?.agent?.prompt?.tool_ids ?? [];
  const liveTools: string[] = (
    agent.conversation_config?.agent?.prompt?.tools ?? []
  ).map((t: { name: string }) => t.name);
  const orphans = liveTools.filter((name) => !CLIENT_TOOLS.includes(name));

  console.log("Attached tools:", liveTools.length ? liveTools : toolIds);
  if (orphans.length) {
    console.error(
      `FAIL: agent offers tools the client cannot answer: ${orphans.join(", ")}`,
    );
    process.exit(1);
  }

  // 2. A workflow with edges makes the LLM call progress_workflow, which is
  //    what produced error 1002. This app is single-mode; it needs no edges.
  const edges = Object.keys(agent.workflow?.edges ?? {});
  console.log("Workflow edges:", edges.length ? edges : "none");
  if (edges.length) {
    console.error(
      `FAIL: workflow has edges (${edges.join(", ")}) — expect none for single-mode DJ`,
    );
    process.exit(1);
  }

  // 3. Run a real simulated session and confirm it survives and generates music.
  console.log("\nSimulating a session (this takes ~30s)...");
  const simRes = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agentId}/simulate-conversation`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        simulation_specification: {
          simulated_user_config: {
            first_message: "Give me something smooth and jazzy",
            language: "en",
            prompt: {
              prompt:
                "You are a user jamming with an AI DJ. Ask for a jazzy backing track, " +
                "then say it sounds good. Keep replies to one short sentence.",
            },
          },
        },
      }),
    },
  );

  if (!simRes.ok) {
    console.error(
      "FAIL: simulation error:",
      simRes.status,
      await simRes.text(),
    );
    process.exit(1);
  }

  const sim = await simRes.json();
  const transcript = sim.simulated_conversation ?? [];
  const toolCalls: string[] = transcript.flatMap(
    (turn: { tool_calls?: { tool_name: string }[] }) =>
      (turn.tool_calls ?? []).map((tc) => tc.tool_name),
  );

  console.log(`\nTranscript (${transcript.length} turns):`);
  for (const turn of transcript) {
    if (turn.message) console.log(`  [${turn.role}] ${turn.message}`);
    for (const tc of turn.tool_calls ?? [])
      console.log(`    -> tool: ${tc.tool_name}`);
  }

  const musicTool = toolCalls.find((name) =>
    ["generate_backing_track", "make_music"].includes(name),
  );

  if (transcript.length < 2) {
    console.error("\nFAIL: session died immediately — agent config is broken");
    process.exit(1);
  }
  if (!musicTool) {
    console.error(
      "\nFAIL: agent never called a music tool when asked for a track",
    );
    process.exit(1);
  }

  console.log(
    `\nPASS: session ran ${transcript.length} turns and called ${musicTool}`,
  );
}

verifyAgent();
