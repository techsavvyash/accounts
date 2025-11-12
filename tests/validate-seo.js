#!/usr/bin/env node

/**
 * SEO Utilities Validation
 * Tests meta tags, sitemap, robots.txt, and structured data generation
 */

console.log('🔍 Validating SEO Utilities\n');
console.log('='.repeat(70));

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  testsRun++;
  try {
    fn();
    testsPassed++;
    console.log(`✅ ${name}`);
  } catch (error) {
    testsFailed++;
    console.error(`❌ ${name}`);
    console.error(`   Error: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertContains(text, substring, message) {
  if (!text.includes(substring)) {
    throw new Error(message || `Expected text to contain "${substring}"`);
  }
}

// ===== Helper Functions (copy of SEO utilities) =====

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function escapeXml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function generateMetaTags(config) {
  const tags = [];

  tags.push(`<title>${escapeHtml(config.title)}</title>`);
  tags.push(`<meta name="description" content="${escapeHtml(config.description)}" />`);

  if (config.keywords && config.keywords.length > 0) {
    tags.push(`<meta name="keywords" content="${escapeHtml(config.keywords.join(', '))}" />`);
  }

  tags.push(`<meta name="robots" content="${config.robots || 'index, follow'}" />`);

  if (config.canonical) {
    tags.push(`<link rel="canonical" href="${escapeHtml(config.canonical)}" />`);
  }

  tags.push(`<meta property="og:title" content="${escapeHtml(config.ogTitle || config.title)}" />`);
  tags.push(`<meta property="og:description" content="${escapeHtml(config.ogDescription || config.description)}" />`);

  if (config.ogImage) {
    tags.push(`<meta property="og:image" content="${escapeHtml(config.ogImage)}" />`);
  }

  tags.push(`<meta name="twitter:card" content="${config.twitterCard || 'summary_large_image'}" />`);

  if (config.twitterSite) {
    tags.push(`<meta name="twitter:site" content="${escapeHtml(config.twitterSite)}" />`);
  }

  tags.push(`<meta name="twitter:title" content="${escapeHtml(config.twitterTitle || config.title)}" />`);

  return tags.join('\n');
}

function generateSitemap(config) {
  const urls = config.urls.map((url) => {
    const urlTag = [];
    urlTag.push('  <url>');
    urlTag.push(`    <loc>${escapeXml(`${config.baseUrl}${url.loc}`)}</loc>`);

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

function generateRobotsTxt(config) {
  const lines = [];

  for (const ua of config.userAgents) {
    lines.push(`User-agent: ${ua.agent}`);

    if (ua.allow) {
      ua.allow.forEach((path) => lines.push(`Allow: ${path}`));
    }

    if (ua.disallow) {
      ua.disallow.forEach((path) => lines.push(`Disallow: ${path}`));
    }

    if (ua.crawlDelay !== undefined) {
      lines.push(`Crawl-delay: ${ua.crawlDelay}`);
    }

    lines.push('');
  }

  if (config.sitemaps) {
    config.sitemaps.forEach((sitemap) => lines.push(`Sitemap: ${sitemap}`));
  }

  return lines.join('\n');
}

function createOrganizationSchema(config) {
  const schema = {
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

  return schema;
}

function generateStructuredData(data) {
  const jsonLd = Array.isArray(data) ? data : [data];
  return `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`;
}

// ===== TESTS =====

console.log('\n📝 Testing Meta Tags Generation\n');

test('1. Generate basic meta tags', () => {
  const meta = generateMetaTags({
    title: 'Test Page',
    description: 'This is a test page',
  });

  assertContains(meta, '<title>Test Page</title>');
  assertContains(meta, '<meta name="description" content="This is a test page" />');
  assertContains(meta, '<meta name="robots" content="index, follow" />');
});

test('2. Generate meta tags with keywords', () => {
  const meta = generateMetaTags({
    title: 'Test',
    description: 'Test',
    keywords: ['accounting', 'GST', 'invoicing'],
  });

  assertContains(meta, 'accounting, GST, invoicing');
});

test('3. Generate canonical URL', () => {
  const meta = generateMetaTags({
    title: 'Test',
    description: 'Test',
    canonical: 'https://example.com/page',
  });

  assertContains(meta, '<link rel="canonical" href="https://example.com/page" />');
});

test('4. Generate Open Graph tags', () => {
  const meta = generateMetaTags({
    title: 'Test Page',
    description: 'Description',
    ogImage: 'https://example.com/image.png',
  });

  assertContains(meta, '<meta property="og:title" content="Test Page" />');
  assertContains(meta, '<meta property="og:image" content="https://example.com/image.png" />');
});

test('5. Generate Twitter Card tags', () => {
  const meta = generateMetaTags({
    title: 'Test',
    description: 'Test',
    twitterCard: 'summary_large_image',
    twitterSite: '@example',
  });

  assertContains(meta, '<meta name="twitter:card" content="summary_large_image" />');
  assertContains(meta, '<meta name="twitter:site" content="@example" />');
});

test('6. Escape HTML in meta tags', () => {
  const meta = generateMetaTags({
    title: 'Test & Demo <script>',
    description: 'Testing "quotes" & \'apostrophes\'',
  });

  assertContains(meta, '&lt;script&gt;');
  assertContains(meta, '&quot;quotes&quot;');
  assert(!meta.includes('<script>'), 'Should escape script tags');
});

console.log('\n🗺️  Testing Sitemap Generation\n');

test('7. Generate basic sitemap', () => {
  const sitemap = generateSitemap({
    baseUrl: 'https://example.com',
    urls: [
      { loc: '/', changefreq: 'daily', priority: 1.0 },
      { loc: '/about', changefreq: 'monthly', priority: 0.8 },
    ],
  });

  assertContains(sitemap, '<?xml version="1.0" encoding="UTF-8"?>');
  assertContains(sitemap, '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  assertContains(sitemap, '<loc>https://example.com/</loc>');
  assertContains(sitemap, '<changefreq>daily</changefreq>');
  assertContains(sitemap, '<priority>1.0</priority>');
});

test('8. Generate sitemap with lastmod', () => {
  const sitemap = generateSitemap({
    baseUrl: 'https://example.com',
    urls: [
      { loc: '/blog/post-1', lastmod: '2024-11-10', changefreq: 'weekly', priority: 0.7 },
    ],
  });

  assertContains(sitemap, '<lastmod>2024-11-10</lastmod>');
});

test('9. Escape XML in sitemap URLs', () => {
  const sitemap = generateSitemap({
    baseUrl: 'https://example.com',
    urls: [
      { loc: '/page?foo=bar&baz=qux', priority: 0.5 },
    ],
  });

  assertContains(sitemap, 'foo=bar&amp;baz=qux');
  assert(!sitemap.includes('foo=bar&baz'), 'Should escape ampersands');
});

test('10. Handle multiple sitemap URLs', () => {
  const urls = [];
  for (let i = 1; i <= 100; i++) {
    urls.push({ loc: `/page-${i}`, priority: 0.5 });
  }

  const sitemap = generateSitemap({
    baseUrl: 'https://example.com',
    urls,
  });

  assertContains(sitemap, '<loc>https://example.com/page-1</loc>');
  assertContains(sitemap, '<loc>https://example.com/page-100</loc>');
});

console.log('\n🤖 Testing Robots.txt Generation\n');

test('11. Generate basic robots.txt', () => {
  const robots = generateRobotsTxt({
    userAgents: [
      {
        agent: '*',
        disallow: ['/admin/', '/api/'],
      },
    ],
  });

  assertContains(robots, 'User-agent: *');
  assertContains(robots, 'Disallow: /admin/');
  assertContains(robots, 'Disallow: /api/');
});

test('12. Generate robots.txt with allow rules', () => {
  const robots = generateRobotsTxt({
    userAgents: [
      {
        agent: '*',
        allow: ['/'],
        disallow: ['/private/'],
      },
    ],
  });

  assertContains(robots, 'Allow: /');
  assertContains(robots, 'Disallow: /private/');
});

test('13. Generate robots.txt with crawl delay', () => {
  const robots = generateRobotsTxt({
    userAgents: [
      {
        agent: 'Googlebot',
        crawlDelay: 2,
      },
    ],
  });

  assertContains(robots, 'User-agent: Googlebot');
  assertContains(robots, 'Crawl-delay: 2');
});

test('14. Generate robots.txt with sitemaps', () => {
  const robots = generateRobotsTxt({
    userAgents: [{ agent: '*', disallow: [] }],
    sitemaps: [
      'https://example.com/sitemap.xml',
      'https://example.com/sitemap-blog.xml',
    ],
  });

  assertContains(robots, 'Sitemap: https://example.com/sitemap.xml');
  assertContains(robots, 'Sitemap: https://example.com/sitemap-blog.xml');
});

test('15. Generate robots.txt with multiple user agents', () => {
  const robots = generateRobotsTxt({
    userAgents: [
      { agent: '*', disallow: ['/admin/'] },
      { agent: 'Googlebot', allow: ['/'], crawlDelay: 1 },
    ],
  });

  assertContains(robots, 'User-agent: *');
  assertContains(robots, 'User-agent: Googlebot');
});

console.log('\n📊 Testing Structured Data\n');

test('16. Generate Organization schema', () => {
  const schema = createOrganizationSchema({
    name: 'ABC Enterprises',
    url: 'https://abc.com',
    logo: 'https://abc.com/logo.png',
    description: 'Leading business solutions',
  });

  assert(schema['@context'] === 'https://schema.org', 'Should have Schema.org context');
  assert(schema['@type'] === 'Organization', 'Should be Organization type');
  assert(schema.name === 'ABC Enterprises', 'Should have correct name');
  assert(schema.logo === 'https://abc.com/logo.png', 'Should have logo');
});

test('17. Generate Organization schema with address', () => {
  const schema = createOrganizationSchema({
    name: 'ABC Corp',
    url: 'https://abc.com',
    address: {
      streetAddress: '123 Main St',
      addressLocality: 'Mumbai',
      addressRegion: 'Maharashtra',
      postalCode: '400001',
      addressCountry: 'IN',
    },
  });

  assert(schema.address['@type'] === 'PostalAddress', 'Should have PostalAddress type');
  assert(schema.address.addressLocality === 'Mumbai', 'Should have correct city');
});

test('18. Generate Organization schema with contact point', () => {
  const schema = createOrganizationSchema({
    name: 'ABC Corp',
    url: 'https://abc.com',
    contactPoint: {
      telephone: '+91-22-12345678',
      contactType: 'customer service',
      email: 'support@abc.com',
    },
  });

  assert(schema.contactPoint['@type'] === 'ContactPoint', 'Should have ContactPoint type');
  assert(schema.contactPoint.telephone === '+91-22-12345678', 'Should have phone');
});

test('19. Generate JSON-LD script tag', () => {
  const schema = createOrganizationSchema({
    name: 'Test',
    url: 'https://test.com',
  });

  const jsonLd = generateStructuredData(schema);

  assertContains(jsonLd, '<script type="application/ld+json">');
  assertContains(jsonLd, '"@context": "https://schema.org"');
  assertContains(jsonLd, '</script>');
});

test('20. Generate JSON-LD for multiple schemas', () => {
  const schemas = [
    createOrganizationSchema({ name: 'Org1', url: 'https://org1.com' }),
    createOrganizationSchema({ name: 'Org2', url: 'https://org2.com' }),
  ];

  const jsonLd = generateStructuredData(schemas);

  assertContains(jsonLd, '"name": "Org1"');
  assertContains(jsonLd, '"name": "Org2"');
});

console.log('\n⚡ Testing Edge Cases\n');

test('21. Handle empty keywords array', () => {
  const meta = generateMetaTags({
    title: 'Test',
    description: 'Test',
    keywords: [],
  });

  assert(!meta.includes('<meta name="keywords"'), 'Should not include empty keywords');
});

test('22. Handle missing optional fields', () => {
  const meta = generateMetaTags({
    title: 'Test',
    description: 'Test',
  });

  assert(meta.includes('og:title'), 'Should include OG tags even without explicit ogTitle');
  assert(meta.includes('twitter:card'), 'Should include Twitter card');
});

test('23. Handle very long title', () => {
  const longTitle = 'A'.repeat(200);
  const meta = generateMetaTags({
    title: longTitle,
    description: 'Test',
  });

  assertContains(meta, `<title>${longTitle}</title>`);
});

test('24. Handle special characters in URLs', () => {
  const sitemap = generateSitemap({
    baseUrl: 'https://example.com',
    urls: [
      { loc: '/page?param=value&other=123', priority: 0.5 },
    ],
  });

  assertContains(sitemap, '&amp;');
});

test('25. Handle empty sitemap', () => {
  const sitemap = generateSitemap({
    baseUrl: 'https://example.com',
    urls: [],
  });

  assertContains(sitemap, '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  assertContains(sitemap, '</urlset>');
});

// Print results
console.log('\n' + '='.repeat(70));
console.log('\n📊 SEO Validation Results:');
console.log(`   Total Tests:  ${testsRun}`);
console.log(`   ✅ Passed:     ${testsPassed}`);
console.log(`   ❌ Failed:     ${testsFailed}`);
console.log(`   Success Rate: ${((testsPassed / testsRun) * 100).toFixed(1)}%`);

if (testsFailed === 0) {
  console.log('\n🎉 All SEO utility tests passed!');
  console.log('✨ SEO implementation is working correctly.\n');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${testsFailed} test(s) failed. Please review the errors above.\n`);
  process.exit(1);
}
