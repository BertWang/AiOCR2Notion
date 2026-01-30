import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // integrationId

    if (!code) return NextResponse.json({ error: 'code missing' }, { status: 400 });

    const clientId = process.env.NOTION_CLIENT_ID;
    const clientSecret = process.env.NOTION_CLIENT_SECRET;
    const redirectUri = process.env.NOTION_REDIRECT_URI || `${process.env.BASE_URL || ''}/api/integrations/notion/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Notion client credentials not configured' }, { status: 500 });
    }

    // Exchange code for token
    const tokenResp = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret }),
    });

    if (!tokenResp.ok) {
      const txt = await tokenResp.text();
      console.error('Notion token exchange failed:', txt);
      return NextResponse.json({ error: 'Token exchange failed' }, { status: 502 });
    }

    const tokenData = await tokenResp.json();
    const integrationId = state || 'default';

    // Persist token in Integration.config
    const now = new Date();
    await prisma.integration.upsert({
      where: { id: integrationId },
      update: { enabled: true, config: { ...tokenData, updatedAt: now.toISOString() } },
      create: { provider: 'notion', enabled: true, config: { ...tokenData, createdAt: now.toISOString() } },
    });

    // Simple HTML response for redirect/callback flow
    const html = `<!doctype html><html><body><h3>Notion connected successfully.</h3><script>setTimeout(()=>{window.close()},600);</script></body></html>`;
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
  } catch (error) {
    console.error('Notion callback error', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
