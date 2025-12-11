import { NextResponse } from "next/server";

export async function GET() {
  try {
    const agentId = process.env.ELEVENLABS_AGENT_ID;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    console.log("🔑 ENV CHECK:", {
      hasAgentId: !!agentId,
      hasApiKey: !!apiKey,
      agentIdPrefix: agentId?.substring(0, 10),
      apiKeyPrefix: apiKey?.substring(0, 10),
    });

    if (!agentId || !apiKey) {
      console.error("❌ Missing config:", { agentId: !!agentId, apiKey: !!apiKey });
      return NextResponse.json(
        { error: "Missing ElevenLabs configuration" },
        { status: 500 }
      );
    }

    // Get WebRTC conversation token for lowest latency
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": apiKey,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("❌ ElevenLabs API error:", {
        status: response.status,
        statusText: response.statusText,
        body: error,
      });
      return NextResponse.json(
        { error: `ElevenLabs error: ${response.status} - ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("✅ Got signed URL successfully");
    return NextResponse.json({ signedUrl: data.signed_url });
  } catch (error) {
    console.error("Error getting conversation token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
