import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get('integrationId') || 'default';

    const clientId = process.env.NOTION_CLIENT_ID;
    const redirectUri = process.env.NOTION_REDIRECT_URI || `${process.env.BASE_URL || ''}/api/integrations/notion/callback`;
    if (!clientId) {
      return NextResponse.json({ error: 'NOTION_CLIENT_ID not configured' }, { status: 500 });
    }

    const state = encodeURIComponent(integrationId);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      owner: 'user',
      state,
    });

    const url = `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('Notion connect error', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
