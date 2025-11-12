/**
 * Sitemap Generation
 * Create XML sitemaps for search engines
 */

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export interface SitemapConfig {
  baseUrl: string;
  urls: SitemapUrl[];
}

/**
 * Generate XML sitemap
 */
export function generateSitemap(config: SitemapConfig): string {
  const urls = config.urls.map((url) => {
    const urlTag: string[] = [];
    urlTag.push('  <url>');
    urlTag.push(`    <loc>${escapeXml(normalizeUrl(config.baseUrl, url.loc))}</loc>`);

    if (url.lastmod) {
      urlTag.push(`    <lastmod>${url.lastmod}</lastmod>`);
    }

    if (url.changefreq) {
      urlTag.push(`    <changefreq>${url.changefreq}</changefreq>`);
    }

    if (url.priority !== undefined) {
      urlTag.push(`    <priority>${url.priority.toFixed(1)}</priority>`);
    }

    urlTag.push('  </url>');
    return urlTag.join('\n');
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}

/**
 * Generate sitemap index (for multiple sitemaps)
 */
export function generateSitemapIndex(sitemaps: Array<{ loc: string; lastmod?: string }>): string {
  const sitemapTags = sitemaps.map((sitemap) => {
    const tags: string[] = [];
    tags.push('  <sitemap>');
    tags.push(`    <loc>${escapeXml(sitemap.loc)}</loc>`);

    if (sitemap.lastmod) {
      tags.push(`    <lastmod>${sitemap.lastmod}</lastmod>`);
    }

    tags.push('  </sitemap>');
    return tags.join('\n');
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapTags.join('\n')}
</sitemapindex>`;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Normalize URL (join base URL with path)
 */
function normalizeUrl(baseUrl: string, path: string): string {
  // Remove trailing slash from base URL
  const base = baseUrl.replace(/\/$/, '');

  // Ensure path starts with slash
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${base}${normalizedPath}`;
}

/**
 * Format date for sitemap (ISO 8601)
 */
export function formatSitemapDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Create sitemap for dynamic content
 */
export async function createDynamicSitemap<T>(config: {
  baseUrl: string;
  fetchItems: () => Promise<T[]>;
  mapItem: (item: T) => SitemapUrl;
  staticUrls?: SitemapUrl[];
}): Promise<string> {
  const items = await config.fetchItems();
  const dynamicUrls = items.map(config.mapItem);

  const allUrls = [...(config.staticUrls || []), ...dynamicUrls];

  return generateSitemap({
    baseUrl: config.baseUrl,
    urls: allUrls,
  });
}
