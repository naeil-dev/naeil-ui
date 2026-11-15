import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export function rollup(rows, checks, sites) {
  return Object.fromEntries(checks.map(key => [key, Object.fromEntries(sites.map(site => {
    const counts = { match: 0, differs: 0, 'not measured': 0 };
    for (const row of rows.filter(r => r.site === site)) counts[row.checks[key].status]++;
    return [site, counts];
  }))]));
}
const unique = values => [...new Set(values)];
const family = sample => (sample?.fonts ?? []).filter(f => f.glyphCount).map(f => f.familyName).join(' + ');

/** Stable observable-cause IDs, independent of numeric values and matrix repetition.
 * These are observations, not a claim to identify distinct source-code root causes. */
export function observations(row, key, check) {
  const v = check.values ?? {};
  const bare = row.layout && !row.layout.header && row.measurements?.mainCount === 0;
  if ((key === 'frame' || key === 'gap') && bare) return [{ id: 'bare-error-frame', text: 'Bare error page omits header/main/footer', value: 'header=false, main=0, footer=false' }];
  if (key === 'gap' && v.reason) return [{ id: 'missing-footer', text: 'Page omits required footer', value: v.reason }];
  if (key === 'gap' && row.kind === 'long') return [{ id: 'long-content-footer-gap', text: 'Long-page content to footer gap differs', value: `${v.contentToFooter}px (expected 96)` }];
  if (key === 'gap') return [{ id: 'short-footer-floats', text: 'Short-page footer does not reach viewport bottom', value: `${v.footerBottomToViewport}px (expected 0)` }];
  if ((key === 'body' || key === 'bodyFont' || key === 'japaneseFont' || key === 'digitFont') && bare) return [{ id: 'bare-error-body', text: 'Bare error body uses browser typography', value: `${row.layout.body.size}/${Number.isFinite(row.layout.body.lineHeight) ? row.layout.body.lineHeight : 'normal'}px; ${row.layout.body.family}; expected 16/25 and shared fonts` }];
  if (key === 'body') return [{ id: 'body-line-height', text: 'Ordinary body metrics differ', value: `${v.size}/${Number.isFinite(v.lineHeight) ? v.lineHeight : 'normal'}px (expected 16/25)` }];
  if (row.locale === 'ja' && ['latinFont', 'digitFont'].includes(key) && /Noto/.test(family(v))) return [{ id: 'ja-latin-digit-font', text: 'Japanese-page Latin/digits use Noto Sans JP instead of Pretendard', value: `${family(v)}; ${key} text=${JSON.stringify(v.text)}` }];
  if (['latinFont', 'digitFont', 'bodyFont', 'japaneseFont'].includes(key)) return [{ id: `${key}-rendered-family`, text: `${key}: rendered font differs`, value: `${family(v)}; text=${JSON.stringify(v.text)}` }];
  if (key === 'theme') return [{ id: 'first-visit-theme', text: 'First-visit dark theme missing', value: `${v.actual}; CSS color-scheme=${v.colorScheme}` }];
  if (key === 'locale') return [{ id: 'document-language', text: 'Requested document language missing/different', value: `lang=${JSON.stringify(v.actual)}` }];
  if (key === 'title') return [{ id: 'document-title', text: 'Named-page title missing/incorrect', value: JSON.stringify(v.actual) }];
  if (key === 'icons') return v.responses.filter(r => !r.matches && !r.error && !r.accessBlocked && (r.status !== 200 || r.expectedSHA256)).map(r => ({ id: r.status !== 200 ? 'icon-http-response' : 'icon-bytes', text: r.status !== 200 ? 'Icon endpoint response differs' : 'Icon bytes differ', value: `${new URL(r.url).pathname}: HTTP ${r.status}${r.status === 200 ? `, SHA=${r.sha256}` : ''}` }));
  if (key.endsWith('Pixels')) return [{ id: key, text: `${key}: shared band pixels differ after explicit masks`, value: `${v.differentPixels}/${v.totalPixels} pixels (${v.over16Pixels} above delta 16)` }];
  const changes = v.differences ?? v.changes;
  if (changes) return changes.map(change => ({ id: `${key}-${change.element ?? ''}-${change.field}`, text: `${key}: ${change.element ? `${change.element}.` : ''}${change.field}`, value: `${JSON.stringify(change.actual)} (expected ${JSON.stringify(change.expected)})` }));
  return [{ id: key, text: `${key} differs`, value: JSON.stringify(v) }];
}
export function distinctDifferences(rows) {
  const groups = new Map();
  for (const row of rows) for (const [key, check] of Object.entries(row.checks)) if (check.status === 'differs') {
    for (const observation of observations(row, key, check)) {
      const group = groups.get(observation.id) ?? { id: observation.id, description: observation.text, conditions: [], checks: [], sites: [], values: [], examples: [] };
      group.conditions.push(row.id); group.checks.push(key); group.sites.push(row.site);
      group.values.push(observation.value); group.examples.push(`rows/${row.id}.json`);
      groups.set(group.id, group);
    }
  }
  return [...groups.values()].map(group => ({ ...group, conditions: unique(group.conditions).sort(), checks: unique(group.checks), sites: unique(group.sites).sort(), values: unique(group.values).sort(), examples: unique(group.examples).slice(0, 3), affectedConditions: unique(group.conditions).length })).sort((a, b) => a.id.localeCompare(b.id));
}
const escape = s => String(s).replaceAll('|', '\\|').replaceAll('\n', ' ');
const symbol = status => ({ match: '✓', differs: '✗', 'not measured': '–' })[status];
const countsText = c => `${c.match}/${c.differs}/${c['not measured']}`;
export async function writeReport(report, out, checks, sites) {
  for (const row of report.rows) await writeFile(join(out, 'rows', `${row.id}.json`), JSON.stringify(row, null, 2));
  await writeFile(join(out, 'comparison.json'), JSON.stringify(report, null, 2));
  const lines = ['# Live comparison', '', `**${report.distinctDifferences.length} distinct observable differences** · ${report.differences} differing check cells · ${report.notMeasured} unmeasured check cells.`, '', `Time: ${report.measuredAt}. Browser: ${report.browser}. Fresh context per row, signed-out unless owner supplies site-scoped state, DPR 1. Conditions: ko/ja/en × 1440×900 or 390×844 × OS light/dark × short/long/error. Requested/final addresses and session/browser details are in every row detail.`, '', 'Counting: repeat observations share explicit cause IDs across sites/locales/widths/OS schemes. Distinct IDs describe observations, not proven code root causes. Unmeasured checks never pass; zero with missing coverage is incomplete. Full unmasked pixel diffs and optional icon metadata notes do not count.', '', 'Masks and normalization (nothing else is hidden):', ''];
  for (const [site, reason] of Object.entries(report.coverageFailures ?? {})) lines.push(`**Not measured — ${site}:** ${reason}`, '');
  for (const [band, marker, reason] of report.masks) lines.push(`- ${band}: \`${marker}\` — ${reason}.`);
  lines.push('- Mask rectangles are the union of actual/reference marker boxes, including measured suffix text Range overflow, rounded outward to device pixels; exact CSS boxes and marker status are retained in row JSON. Required missing markers make that band unmeasured. Optional absent slots are explicitly recorded.', '- Comparison-only captures snap each band origin to integer CSS pixels to remove content-position raster phase. Original viewport/band images and raw diffs are unchanged. The audit channel-delta tolerance 16 suppresses GPU/antialias noise; every nonzero pixel is still recorded. Computed colors/styles detect smaller semantic color changes. Inactive zero-width border colors are retained as data, not compared; resolved layout lengths use the same 0.5px geometry tolerance.', '- Footer core height uses measured shared brand/column bottoms + frame bottom padding, excluding the optional meta row. Full-height raw diffs remain available.', '- Toolbar controls are masked only in the band to remove state-dependent placement. Each control has a counted geometry/style check relative to the frame edge; theme/locale subtract the measured trailing account reservation. Logo/symbol and outlined wordmark use the active palette/variant markers. Hidden mobile controls are unmeasured; no menu is opened.', '', '## Rollup', '', 'Each cell is **match / differs / not measured**.', '', `| Item | ${sites.join(' | ')} |`, `| --- | ${sites.map(() => '---').join(' | ')} |`);
  for (const key of checks) lines.push(`| ${key} | ${sites.map(site => countsText(report.rollup[key][site])).join(' | ')} |`);
  lines.push('', '## Distinct differences', '');
  if (!report.distinctDifferences.length) lines.push('None measured. Check incomplete coverage before claiming parity.');
  for (const finding of report.distinctDifferences) {
    // Keep the owner-facing list compact; all values and conditions remain in JSON.
    const shown = finding.values.slice(0, 8).map(escape).join('; ');
    lines.push(`- **${escape(finding.description)}** — ${finding.affectedConditions} conditions (${finding.sites.join(', ')}). ${shown}${finding.values.length > 8 ? `; +${finding.values.length - 8} further values in JSON` : ''}. [detail](${finding.examples[0]})`);
  }
  const notes = report.rows.flatMap(row => (row.icons?.metadataNotes ?? []).map(note => ({ site: row.site, note })));
  lines.push('', `Optional icon declaration metadata: ${notes.length} notes retained in row details; response status and SHA-256 determine icon parity. Missing type/sizes, equivalent canonical paths and query strings are not byte failures.`, '', '## Conditions', '', '✓ match · ✗ differs · – not measured. Row details contain actual address, locale, viewport, session, browser, values, mask boxes, element comparisons, notes and image links.', '', `| Condition | Evidence | ${checks.join(' | ')} |`, `| --- | --- | ${checks.map(() => '---').join(' | ')} |`);
  for (const row of report.rows) lines.push(`| ${row.id} | ${row.screenshot ? `[shot](${row.screenshot}) · ` : ''}[detail](rows/${row.id}.json) | ${checks.map(k => symbol(row.checks[k].status)).join(' | ')} |`);
  lines.push('', `**Distinct differences: ${report.distinctDifferences.length}.** Secondary check-cell differences: ${report.differences}. Unmeasured check cells: ${report.notMeasured}.`, '');
  await writeFile(join(out, 'comparison.md'), lines.join('\n'));
}
