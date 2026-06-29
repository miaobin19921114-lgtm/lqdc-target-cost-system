import { NextRequest, NextResponse } from 'next/server';

const protectedPrefixes = ['/workspace', '/projects', '/templates', '/account', '/api/projects', '/api/export'];
const nonV1ProjectSegments = new Set([
  'admin-expense-details',
  'boss-report',
  'construction-standards',
  'cost-calculation-rules',
  'cost-mapping',
  'dashboard-lite',
  'decision',
  'detail-calculation-results',
  'detail-rule-calculation',
  'finance-expense-details',
  'indicator-check',
  'measure-rules',
  'precision-rule-matrix',
  'price-library',
  'product-library',
  'project-rule-snapshot',
  'project-template-selection',
  'quantity-indicators',
  'report',
  'report-export',
  'report-print',
  'rule-governance-center',
  'rule-template-center',
  'sales-expense-details',
  'sales-schedule',
  'sensitivity',
  'sensitivity-report',
  'summary-check',
  'tax-report',
  'template-field-definitions',
  'template-field-editor',
  'template-field-requirements',
  'template-import-export',
  'template-rule-editor',
  'template-rule-validation',
  'template-subject-switches',
  'template-version-management',
  'version-compare',
  'version-rule-snapshots',
  'version-snapshot-generator'
]);

function isProtected(pathname: string) {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get('lqdc_session')?.value;

  if (pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/projects', request.url));
  }

  if (isProtected(pathname) && !session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const projectRoute = pathname.match(/^\/projects\/([^/]+)\/([^/]+)/);
  if (projectRoute && nonV1ProjectSegments.has(projectRoute[2])) {
    return NextResponse.rewrite(new URL(`/projects/${projectRoute[1]}/non-v1`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/workspace/:path*', '/projects/:path*', '/templates/:path*', '/account/:path*', '/api/projects/:path*', '/api/export/:path*', '/login']
};
