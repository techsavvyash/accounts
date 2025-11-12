/**
 * SEO Meta Tags Generation
 * Utilities for creating SEO-optimized meta tags
 */

export interface MetaTagsConfig {
  // Basic SEO
  title: string;
  description: string;
  keywords?: string[];
  author?: string;
  robots?: string;
  canonical?: string;

  // Open Graph (Facebook, LinkedIn)
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  ogType?: 'website' | 'article' | 'product' | 'business';
  ogSiteName?: string;

  // Twitter Card
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterSite?: string;
  twitterCreator?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;

  // Additional
  themeColor?: string;
  viewport?: string;
  locale?: string;
}

export interface StructuredData {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

/**
 * Generate HTML meta tags
 */
export function generateMetaTags(config: MetaTagsConfig): string {
  const tags: string[] = [];

  // Basic meta tags
  tags.push(`<title>${escapeHtml(config.title)}</title>`);
  tags.push(`<meta name="description" content="${escapeHtml(config.description)}" />`);

  if (config.keywords && config.keywords.length > 0) {
    tags.push(`<meta name="keywords" content="${escapeHtml(config.keywords.join(', '))}" />`);
  }

  if (config.author) {
    tags.push(`<meta name="author" content="${escapeHtml(config.author)}" />`);
  }

  tags.push(`<meta name="robots" content="${config.robots || 'index, follow'}" />`);

  if (config.canonical) {
    tags.push(`<link rel="canonical" href="${escapeHtml(config.canonical)}" />`);
  }

  // Viewport
  tags.push(`<meta name="viewport" content="${config.viewport || 'width=device-width, initial-scale=1'}" />`);

  // Theme color
  if (config.themeColor) {
    tags.push(`<meta name="theme-color" content="${escapeHtml(config.themeColor)}" />`);
  }

  // Open Graph tags
  tags.push(`<meta property="og:title" content="${escapeHtml(config.ogTitle || config.title)}" />`);
  tags.push(`<meta property="og:description" content="${escapeHtml(config.ogDescription || config.description)}" />`);
  tags.push(`<meta property="og:type" content="${config.ogType || 'website'}" />`);

  if (config.ogImage) {
    tags.push(`<meta property="og:image" content="${escapeHtml(config.ogImage)}" />`);
  }

  if (config.ogUrl) {
    tags.push(`<meta property="og:url" content="${escapeHtml(config.ogUrl)}" />`);
  }

  if (config.ogSiteName) {
    tags.push(`<meta property="og:site_name" content="${escapeHtml(config.ogSiteName)}" />`);
  }

  if (config.locale) {
    tags.push(`<meta property="og:locale" content="${config.locale}" />`);
  }

  // Twitter Card tags
  tags.push(`<meta name="twitter:card" content="${config.twitterCard || 'summary_large_image'}" />`);

  if (config.twitterSite) {
    tags.push(`<meta name="twitter:site" content="${escapeHtml(config.twitterSite)}" />`);
  }

  if (config.twitterCreator) {
    tags.push(`<meta name="twitter:creator" content="${escapeHtml(config.twitterCreator)}" />`);
  }

  tags.push(`<meta name="twitter:title" content="${escapeHtml(config.twitterTitle || config.title)}" />`);
  tags.push(`<meta name="twitter:description" content="${escapeHtml(config.twitterDescription || config.description)}" />`);

  if (config.twitterImage || config.ogImage) {
    tags.push(`<meta name="twitter:image" content="${escapeHtml(config.twitterImage || config.ogImage || '')}" />`);
  }

  return tags.join('\n');
}

/**
 * Generate meta tags as object (for React/Vue)
 */
export function generateMetaTagsObject(config: MetaTagsConfig): Record<string, any> {
  const meta: any = {
    title: config.title,
    meta: [
      { name: 'description', content: config.description },
      { name: 'robots', content: config.robots || 'index, follow' },
      { name: 'viewport', content: config.viewport || 'width=device-width, initial-scale=1' },
    ],
    link: [],
  };

  if (config.keywords && config.keywords.length > 0) {
    meta.meta.push({ name: 'keywords', content: config.keywords.join(', ') });
  }

  if (config.author) {
    meta.meta.push({ name: 'author', content: config.author });
  }

  if (config.themeColor) {
    meta.meta.push({ name: 'theme-color', content: config.themeColor });
  }

  if (config.canonical) {
    meta.link.push({ rel: 'canonical', href: config.canonical });
  }

  // Open Graph
  meta.meta.push(
    { property: 'og:title', content: config.ogTitle || config.title },
    { property: 'og:description', content: config.ogDescription || config.description },
    { property: 'og:type', content: config.ogType || 'website' }
  );

  if (config.ogImage) {
    meta.meta.push({ property: 'og:image', content: config.ogImage });
  }

  if (config.ogUrl) {
    meta.meta.push({ property: 'og:url', content: config.ogUrl });
  }

  if (config.ogSiteName) {
    meta.meta.push({ property: 'og:site_name', content: config.ogSiteName });
  }

  if (config.locale) {
    meta.meta.push({ property: 'og:locale', content: config.locale });
  }

  // Twitter
  meta.meta.push(
    { name: 'twitter:card', content: config.twitterCard || 'summary_large_image' },
    { name: 'twitter:title', content: config.twitterTitle || config.title },
    { name: 'twitter:description', content: config.twitterDescription || config.description }
  );

  if (config.twitterSite) {
    meta.meta.push({ name: 'twitter:site', content: config.twitterSite });
  }

  if (config.twitterCreator) {
    meta.meta.push({ name: 'twitter:creator', content: config.twitterCreator });
  }

  if (config.twitterImage || config.ogImage) {
    meta.meta.push({ name: 'twitter:image', content: config.twitterImage || config.ogImage });
  }

  return meta;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Generate JSON-LD structured data
 */
export function generateStructuredData(data: StructuredData | StructuredData[]): string {
  const jsonLd = Array.isArray(data) ? data : [data];
  return `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`;
}

/**
 * Create Organization structured data
 */
export function createOrganizationSchema(config: {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  address?: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  contactPoint?: {
    telephone: string;
    contactType: string;
    email?: string;
  };
  sameAs?: string[]; // Social media profiles
}): StructuredData {
  const schema: StructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: config.name,
    url: config.url,
  };

  if (config.logo) {
    schema.logo = config.logo;
  }

  if (config.description) {
    schema.description = config.description;
  }

  if (config.address) {
    schema.address = {
      '@type': 'PostalAddress',
      ...config.address,
    };
  }

  if (config.contactPoint) {
    schema.contactPoint = {
      '@type': 'ContactPoint',
      ...config.contactPoint,
    };
  }

  if (config.sameAs) {
    schema.sameAs = config.sameAs;
  }

  return schema;
}

/**
 * Create Product structured data
 */
export function createProductSchema(config: {
  name: string;
  description: string;
  image?: string;
  brand?: string;
  offers?: {
    price: string;
    priceCurrency: string;
    availability?: string;
  };
}): StructuredData {
  const schema: StructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: config.name,
    description: config.description,
  };

  if (config.image) {
    schema.image = config.image;
  }

  if (config.brand) {
    schema.brand = {
      '@type': 'Brand',
      name: config.brand,
    };
  }

  if (config.offers) {
    schema.offers = {
      '@type': 'Offer',
      price: config.offers.price,
      priceCurrency: config.offers.priceCurrency,
      availability: config.offers.availability || 'https://schema.org/InStock',
    };
  }

  return schema;
}

/**
 * Create Article structured data
 */
export function createArticleSchema(config: {
  headline: string;
  description: string;
  image?: string;
  author: string;
  datePublished: string;
  dateModified?: string;
}): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: config.headline,
    description: config.description,
    image: config.image,
    author: {
      '@type': 'Person',
      name: config.author,
    },
    datePublished: config.datePublished,
    dateModified: config.dateModified || config.datePublished,
  };
}

/**
 * Create BreadcrumbList structured data
 */
export function createBreadcrumbSchema(items: Array<{ name: string; url: string }>): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
