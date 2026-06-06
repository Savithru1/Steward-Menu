import type { Metadata } from 'next';
import QueryProvider from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ConsentProvider } from "@/components/consent/ConsentProvider";

/**
 * FIX 7.6 — Dynamic Open Graph metadata per restaurant slug.
 * Fetches the theme endpoint (which already serves restaurantName, tagline,
 * logoUrl) and maps it to Next.js Metadata so crawlers get accurate titles
 * and social-preview images.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/menu/${slug}/theme`,
      { next: { revalidate: 300 } }
    );
    const { data } = await res.json();
    return {
      title: data?.restaurantName ?? 'Menu',
      description: data?.tagline ?? `Order from ${data?.restaurantName}`,
      openGraph: {
        title: data?.restaurantName,
        description: data?.tagline,
        images: data?.logoUrl ? [{ url: data.logoUrl }] : [],
      },
    };
  } catch {
    return { title: 'Menu' };
  }
}

/**
 * Layout for all /menu/[slug]/* routes.
 *
 * Hierarchy:
 *   QueryProvider (react-query)
 *     ThemeProvider (fetches theme, applies CSS vars, provides RestaurantContext)
 *       ConsentProvider (mounts CookieConsent banner, exposes consent context)
 *         {page content}
 *
 * Note: params is typed as a Promise in Next.js 15+ layouts.
 */
export default async function RestaurantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <QueryProvider>
      <ThemeProvider slug={slug}>
        <ConsentProvider>
          {children}
        </ConsentProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
