# @accounts/seo

SEO utilities and tools for the business accounts management platform.

## Features

- 🏷️ **Meta Tags Generation** - Generate SEO-optimized meta tags
- 🌐 **Open Graph & Twitter Cards** - Social media sharing optimization
- 📊 **Structured Data (Schema.org)** - JSON-LD for rich search results
- 🗺️ **Sitemap Generation** - XML sitemaps for search engines
- 🤖 **Robots.txt** - Control search engine crawling
- ⚡ **TypeScript Support** - Fully typed for better DX

## Installation

This package is part of the accounts platform monorepo and uses workspace dependencies.

```bash
# From repo root
bun install
```

## Usage

### Meta Tags

#### Generate HTML Meta Tags

```typescript
import { generateMetaTags } from '@accounts/seo';

const metaTags = generateMetaTags({
  title: 'Business Accounts Management Platform',
  description: 'Complete business accounting solution with GST compliance',
  keywords: ['accounting', 'GST', 'invoicing', 'inventory'],
  canonical: 'https://example.com',

  // Open Graph
  ogTitle: 'Business Accounts Management',
  ogDescription: 'Manage your business with ease',
  ogImage: 'https://example.com/og-image.png',
  ogType: 'website',

  // Twitter Card
  twitterCard: 'summary_large_image',
  twitterSite: '@yourbusiness',
});

// Returns HTML meta tags as string
console.log(metaTags);
```

#### Generate Meta Tags Object (for React/Vue)

```typescript
import { generateMetaTagsObject } from '@accounts/seo';

const metaObj = generateMetaTagsObject({
  title: 'My Page',
  description: 'Page description',
  ogImage: 'https://example.com/image.png',
});

// Use with React Helmet or Vue Meta
<Helmet {...metaObj} />
```

### Structured Data (Schema.org)

#### Organization Schema

```typescript
import { createOrganizationSchema, generateStructuredData } from '@accounts/seo';

const orgSchema = createOrganizationSchema({
  name: 'ABC Enterprises',
  url: 'https://abcenterprises.com',
  logo: 'https://abcenterprises.com/logo.png',
  description: 'Leading business solutions provider',
  address: {
    streetAddress: '123 Business Park',
    addressLocality: 'Mumbai',
    addressRegion: 'Maharashtra',
    postalCode: '400001',
    addressCountry: 'IN',
  },
  contactPoint: {
    telephone: '+91-22-12345678',
    contactType: 'customer service',
    email: 'support@abcenterprises.com',
  },
  sameAs: [
    'https://facebook.com/abc',
    'https://twitter.com/abc',
    'https://linkedin.com/company/abc',
  ],
});

const jsonLd = generateStructuredData(orgSchema);
// Insert into <head>: <script type="application/ld+json">...</script>
```

#### Product Schema

```typescript
import { createProductSchema } from '@accounts/seo';

const productSchema = createProductSchema({
  name: 'Business Accounting Software',
  description: 'Complete accounting solution for SMBs',
  image: 'https://example.com/product.png',
  brand: 'ABC Software',
  offers: {
    price: '999.00',
    priceCurrency: 'INR',
    availability: 'https://schema.org/InStock',
  },
});
```

#### Article Schema

```typescript
import { createArticleSchema } from '@accounts/seo';

const articleSchema = createArticleSchema({
  headline: 'How to Manage GST Returns',
  description: 'Complete guide to filing GST returns in India',
  image: 'https://example.com/article-image.png',
  author: 'John Doe',
  datePublished: '2024-11-10',
  dateModified: '2024-11-11',
});
```

#### Breadcrumb Schema

```typescript
import { createBreadcrumbSchema } from '@accounts/seo';

const breadcrumbSchema = createBreadcrumbSchema([
  { name: 'Home', url: 'https://example.com' },
  { name: 'Features', url: 'https://example.com/features' },
  { name: 'GST Management', url: 'https://example.com/features/gst' },
]);
```

### Sitemap Generation

#### Basic Sitemap

```typescript
import { generateSitemap, type SitemapUrl } from '@accounts/seo';

const urls: SitemapUrl[] = [
  {
    loc: '/',
    changefreq: 'daily',
    priority: 1.0,
  },
  {
    loc: '/features',
    changefreq: 'weekly',
    priority: 0.9,
    lastmod: '2024-11-10',
  },
  {
    loc: '/pricing',
    changefreq: 'monthly',
    priority: 0.8,
  },
];

const sitemap = generateSitemap({
  baseUrl: 'https://example.com',
  urls,
});

// Save to public/sitemap.xml
```

#### Dynamic Sitemap

```typescript
import { createDynamicSitemap } from '@accounts/seo';

const sitemap = await createDynamicSitemap({
  baseUrl: 'https://example.com',
  fetchItems: async () => {
    // Fetch blog posts from database
    return await db.post.findMany({ where: { published: true } });
  },
  mapItem: (post) => ({
    loc: `/blog/${post.slug}`,
    lastmod: post.updatedAt.toISOString().split('T')[0],
    changefreq: 'weekly' as const,
    priority: 0.7,
  }),
  staticUrls: [
    { loc: '/', changefreq: 'daily', priority: 1.0 },
    { loc: '/blog', changefreq: 'daily', priority: 0.9 },
  ],
});
```

#### Sitemap Index

```typescript
import { generateSitemapIndex } from '@accounts/seo';

const sitemapIndex = generateSitemapIndex([
  { loc: 'https://example.com/sitemap-pages.xml', lastmod: '2024-11-10' },
  { loc: 'https://example.com/sitemap-blog.xml', lastmod: '2024-11-11' },
  { loc: 'https://example.com/sitemap-products.xml', lastmod: '2024-11-09' },
]);
```

### Robots.txt

#### Generate Robots.txt

```typescript
import { generateRobotsTxt } from '@accounts/seo';

const robotsTxt = generateRobotsTxt({
  userAgents: [
    {
      agent: '*',
      allow: ['/'],
      disallow: ['/api/', '/admin/', '/dashboard/'],
    },
    {
      agent: 'Googlebot',
      crawlDelay: 1,
    },
  ],
  sitemaps: [
    'https://example.com/sitemap.xml',
    'https://example.com/sitemap-blog.xml',
  ],
  host: 'example.com',
});
```

#### Presets

```typescript
import {
  allowAllRobots,
  disallowAllRobots,
  productionRobots,
  stagingRobots
} from '@accounts/seo';

// Allow all robots
const allowAll = allowAllRobots(['https://example.com/sitemap.xml']);

// Disallow all robots (for staging)
const disallowAll = disallowAllRobots();

// Production configuration
const production = productionRobots('https://example.com');

// Staging configuration
const staging = stagingRobots();

// Generate
const robotsTxt = generateRobotsTxt(production);
```

## API Routes

The SEO package is integrated into the API with the following endpoints:

### GET /seo/sitemap.xml

Returns XML sitemap for static pages.

```bash
curl https://api.example.com/seo/sitemap.xml
```

### GET /seo/robots.txt

Returns robots.txt (production or staging based on NODE_ENV).

```bash
curl https://api.example.com/seo/robots.txt
```

### GET /seo/meta/:page

Returns meta tags configuration for a specific page.

```bash
curl https://api.example.com/seo/meta/home
```

Response:
```json
{
  "success": true,
  "meta": {
    "title": "Business Accounts Management Platform",
    "description": "Complete business accounting solution...",
    "canonical": "https://example.com",
    "ogImage": "https://example.com/og-image.png",
    "ogSiteName": "Business Accounts Platform",
    "twitterCard": "summary_large_image"
  }
}
```

## Best Practices

### 1. Title Tags
- Keep under 60 characters
- Include primary keyword
- Make it unique per page
- Front-load important keywords

```typescript
// Good
title: 'GST Software - Automated Filing & Compliance | BusinessApp'

// Bad
title: 'Page Title'
```

### 2. Meta Descriptions
- Keep between 150-160 characters
- Include call-to-action
- Match page content
- Include relevant keywords

```typescript
description: 'Automate GST filing with our software. File GSTR-1, 3B returns in minutes. Start free trial today!'
```

### 3. Open Graph Images
- Use 1200x630px images
- Include text overlay for context
- Optimize file size (< 300KB)
- Use absolute URLs

```typescript
ogImage: 'https://example.com/images/og-home.png'
```

### 4. Structured Data
- Use appropriate schema types
- Include all required properties
- Validate with Google's Rich Results Test
- Keep data accurate and up-to-date

### 5. Sitemaps
- Update regularly (weekly for dynamic content)
- Keep under 50,000 URLs per sitemap
- Use sitemap index for large sites
- Include lastmod dates
- Set appropriate priorities

### 6. Robots.txt
- Allow access to public pages
- Block admin areas and APIs
- Include sitemap location
- Test with Google Search Console

## Frontend Integration

### React Example

```tsx
import { generateMetaTagsObject } from '@accounts/seo';
import { Helmet } from 'react-helmet-async';

function HomePage() {
  const meta = generateMetaTagsObject({
    title: 'Home - Business Accounting',
    description: 'Manage your business accounts efficiently',
    ogImage: 'https://example.com/og-home.png',
  });

  return (
    <>
      <Helmet {...meta} />
      <main>
        {/* Page content */}
      </main>
    </>
  );
}
```

### Next.js Example

```tsx
import { generateMetaTagsObject } from '@accounts/seo';

export const metadata = generateMetaTagsObject({
  title: 'Home - Business Accounting',
  description: 'Manage your business accounts efficiently',
  ogImage: 'https://example.com/og-home.png',
});

export default function HomePage() {
  return <main>{/* Page content */}</main>;
}
```

## Testing

Validate your SEO implementation:

1. **Meta Tags**: Use browser dev tools to inspect `<head>`
2. **Structured Data**: [Google Rich Results Test](https://search.google.com/test/rich-results)
3. **Open Graph**: [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
4. **Twitter Cards**: [Twitter Card Validator](https://cards-dev.twitter.com/validator)
5. **Sitemap**: [XML Sitemap Validator](https://www.xml-sitemaps.com/validate-xml-sitemap.html)
6. **Robots.txt**: [Robots.txt Tester](https://support.google.com/webmasters/answer/6062598)

## Environment Variables

```bash
# Base URL for sitemap and canonical URLs
BASE_URL=https://example.com

# Environment (affects robots.txt)
NODE_ENV=production
```

## Performance

- Meta tag generation: < 1ms
- Sitemap generation (1000 URLs): ~10ms
- Structured data generation: < 1ms
- Robots.txt generation: < 1ms

## Contributing

When adding new pages or features:

1. Update meta tags in `/apps/api/src/routes/seo.ts`
2. Add URLs to sitemap
3. Create appropriate structured data
4. Test with SEO validation tools

## Resources

- [Google Search Central](https://developers.google.com/search)
- [Schema.org](https://schema.org/)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards](https://developer.twitter.com/en/docs/twitter-for-websites/cards)
- [Sitemap Protocol](https://www.sitemaps.org/)

## License

Part of the accounts platform monorepo.
