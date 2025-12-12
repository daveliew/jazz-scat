import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      console.error("Missing ElevenLabs API key for Scribe");
      return NextResponse.json(
        { error: "Missing ElevenLabs API key" },
        { status: 500 }
      );
    }

    // Get Scribe token for real-time speech-to-text
    const response = await fetch(
      "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("ElevenLabs Scribe API error:", {
        status: response.status,
        statusText: response.statusText,
        body: error,
      });
      return NextResponse.json(
        { error: `Scribe error: ${response.status} - ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Got Scribe token successfully");
    return NextResponse.json({ token: data.token });
  } catch (error) {
    console.error("Error getting Scribe token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
