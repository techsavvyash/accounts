import { Elysia } from 'elysia';
import { prisma } from '@accounts/database';
import {
  generateSitemap,
  generateRobotsTxt,
  productionRobots,
  stagingRobots,
  formatSitemapDate,
  type SitemapUrl,
} from '@accounts/seo';
import { config } from '../config';

const BASE_URL = process.env.BASE_URL || `http://localhost:${config.PORT}`;

export const seoRoutes = new Elysia({ prefix: '/seo' })
  /**
   * GET /seo/sitemap.xml
   * Main sitemap with static pages
   */
  .get(
    '/sitemap.xml',
    async ({ set }) => {
      set.headers['Content-Type'] = 'application/xml';

      const staticUrls: SitemapUrl[] = [
        {
          loc: '/',
          changefreq: 'daily',
          priority: 1.0,
        },
        {
          loc: '/about',
          changefreq: 'monthly',
          priority: 0.8,
        },
        {
          loc: '/features',
          changefreq: 'weekly',
          priority: 0.9,
        },
        {
          loc: '/pricing',
          changefreq: 'weekly',
          priority: 0.9,
        },
        {
          loc: '/docs',
          changefreq: 'weekly',
          priority: 0.8,
        },
        {
          loc: '/blog',
          changefreq: 'daily',
          priority: 0.7,
        },
        {
          loc: '/contact',
          changefreq: 'monthly',
          priority: 0.6,
        },
      ];

      return generateSitemap({
        baseUrl: BASE_URL,
        urls: staticUrls,
      });
    }
  )

  /**
   * GET /seo/robots.txt
   * Robots.txt for search engines
   */
  .get(
    '/robots.txt',
    ({ set }) => {
      set.headers['Content-Type'] = 'text/plain';

      const robotsConfig =
        config.NODE_ENV === 'production'
          ? productionRobots(BASE_URL)
          : stagingRobots();

      return generateRobotsTxt(robotsConfig);
    }
  )

  /**
   * GET /seo/meta/:page
   * Get meta tags for a specific page
   */
  .get(
    '/meta/:page',
    async ({ params }) => {
      const { page } = params;

      // Define meta tags for different pages
      const metaConfigs: Record<string, any> = {
        home: {
          title: 'Business Accounts Management Platform - Manage GST, Invoices & Inventory',
          description:
            'Complete business accounting solution with GST compliance, inventory management, invoicing, and financial reporting for Indian businesses.',
          keywords: ['business accounting', 'GST software', 'invoice management', 'inventory management', 'India'],
          canonical: BASE_URL,
          ogType: 'website',
        },
        features: {
          title: 'Features - Complete Business Management Suite',
          description:
            'Explore our comprehensive features: GST returns, invoice management, inventory tracking, financial reports, and more.',
          canonical: `${BASE_URL}/features`,
        },
        pricing: {
          title: 'Pricing - Affordable Plans for Every Business',
          description:
            'Simple, transparent pricing for businesses of all sizes. Start free, upgrade as you grow.',
          canonical: `${BASE_URL}/pricing`,
        },
        docs: {
          title: 'Documentation - API & Integration Guides',
          description:
            'Complete documentation for integrating with our business accounting platform. API reference, webhooks, and examples.',
          canonical: `${BASE_URL}/docs`,
        },
      };

      const metaConfig = metaConfigs[page] || metaConfigs.home;

      return {
        success: true,
        meta: {
          ...metaConfig,
          ogImage: `${BASE_URL}/og-image.png`,
          ogSiteName: 'Business Accounts Platform',
          twitterCard: 'summary_large_image',
          twitterSite: '@yourbusiness',
        },
      };
    }
  );
