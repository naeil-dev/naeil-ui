// Matches /sa/reports/<id> with optional locale prefix, but NOT /sa/reports
export const PROTECTED_REPORT_ROUTE = /^\/(?:(?:en|ko|ja)\/)?sa\/reports\/[^/]+/;

export function isProtectedReportRoute(pathname: string): boolean {
  return PROTECTED_REPORT_ROUTE.test(pathname);
}
