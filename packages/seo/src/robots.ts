/**
 * Robots.txt Generation
 * Control search engine crawling
 */

export interface RobotsConfig {
  userAgents: Array<{
    agent: string;
    allow?: string[];
    disallow?: string[];
    crawlDelay?: number;
  }>;
  sitemaps?: string[];
  host?: string;
}

/**
 * Generate robots.txt content
 */
export function generateRobotsTxt(config: RobotsConfig): string {
  const lines: string[] = [];

  // User-agent rules
  for (const ua of config.userAgents) {
    lines.push(`User-agent: ${ua.agent}`);

    if (ua.allow) {
      ua.allow.forEach((path) => {
        lines.push(`Allow: ${path}`);
      });
    }

    if (ua.disallow) {
      ua.disallow.forEach((path) => {
        lines.push(`Disallow: ${path}`);
      });
    }

    if (ua.crawlDelay !== undefined) {
      lines.push(`Crawl-delay: ${ua.crawlDelay}`);
    }

    lines.push(''); // Empty line between user agents
  }

  // Sitemaps
  if (config.sitemaps) {
    config.sitemaps.forEach((sitemap) => {
      lines.push(`Sitemap: ${sitemap}`);
    });
  }

  // Host (for Yandex)
  if (config.host) {
    lines.push(`Host: ${config.host}`);
  }

  return lines.join('\n');
}

/**
 * Preset: Allow all robots
 */
export function allowAllRobots(sitemaps?: string[]): RobotsConfig {
  return {
    userAgents: [
      {
        agent: '*',
        disallow: [],
      },
    ],
    sitemaps,
  };
}

/**
 * Preset: Disallow all robots
 */
export function disallowAllRobots(): RobotsConfig {
  return {
    userAgents: [
      {
        agent: '*',
        disallow: ['/'],
      },
    ],
  };
}

/**
 * Preset: Production robots.txt (typical SaaS app)
 */
export function productionRobots(baseUrl: string): RobotsConfig {
  return {
    userAgents: [
      {
        agent: '*',
        allow: ['/'],
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/_next/',
          '/static/',
          '/*.json$',
          '/*?*', // Disallow URL parameters
        ],
      },
    ],
    sitemaps: [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/sitemap-pages.xml`,
      `${baseUrl}/sitemap-blog.xml`,
    ],
    host: baseUrl.replace(/^https?:\/\//, ''),
  };
}

/**
 * Preset: Staging/development robots.txt
 */
export function stagingRobots(): RobotsConfig {
  return {
    userAgents: [
      {
        agent: '*',
        disallow: ['/'],
      },
    ],
  };
}
