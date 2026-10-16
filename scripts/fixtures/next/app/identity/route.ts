import { uiRelease } from '@naeil/ui/release';
export const dynamic = 'force-static';
export function GET() { return Response.json({ ui: uiRelease }); }
