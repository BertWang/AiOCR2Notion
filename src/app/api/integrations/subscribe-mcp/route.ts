import { NextRequest, NextResponse } from "next/server";
import fetch from 'node-fetch';

export async function POST(request: NextRequest) {
  try {
    const { endpoint, token } = await request.json();
    if (!endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 });

    // This is a placeholder: in real world you'd call MCP API to create a subscription
    // We'll simulate by calling the endpoint once to verify connectivity
    try {
      const resp = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }, body: JSON.stringify({ test: true }) });
      const ok = resp.ok;
      return NextResponse.json({ success: ok });
    } catch (e) {
      console.error('subscribe-mcp error', e);
      return NextResponse.json({ error: 'failed to connect' }, { status: 502 });
    }
  } catch (error) {
    console.error('Subscribe MCP Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
