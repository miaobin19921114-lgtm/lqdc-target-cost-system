import { NextResponse } from 'next/server';

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export async function GET(request: Request) {
  const appId = process.env.WECHAT_APP_ID;
  const redirectUri = process.env.WECHAT_REDIRECT_URI;
  const baseUrl = getBaseUrl(request);
  if (!appId || !redirectUri) return NextResponse.redirect(`${baseUrl}/login?wechat=unconfigured`, 303);
  const url = new URL('https://open.weixin.qq.com/connect/qrconnect');
  url.searchParams.set('appid', appId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'snsapi_login');
  url.searchParams.set('state', 'lqdc');
  return NextResponse.redirect(url.toString(), 303);
}
