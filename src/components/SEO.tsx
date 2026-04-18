import { Helmet } from 'react-helmet-async';

const SITE_NAME   = 'Das Matas';
const SITE_URL    = 'https://www.dasmatas.com.br';
const TWITTER     = '@dasmatas';
const DEFAULT_IMG = `${SITE_URL}/og-image.jpg`;

interface SEOProps {
  title: string;
  description: string;
  /** URL canônica sem barra final, ex: '/planos' */
  path?: string;
  image?: string;
  type?: 'website' | 'article';
  /** JSON-LD structured data adicional */
  schema?: object | object[];
  noindex?: boolean;
}

export function SEO({
  title,
  description,
  path = '',
  image = DEFAULT_IMG,
  type = 'website',
  schema,
  noindex = false,
}: SEOProps) {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const canonical = `${SITE_URL}${path}`;
  const ogImage   = image.startsWith('http') ? image : `${SITE_URL}${image}`;

  return (
    <Helmet>
      {/* Primary */}
      <title>{fullTitle}</title>
      <meta name="title"       content={fullTitle} />
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:type"        content={type} />
      <meta property="og:url"         content={canonical} />
      <meta property="og:site_name"   content={SITE_NAME} />
      <meta property="og:title"       content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image"       content={ogImage} />
      <meta property="og:image:alt"   content={fullTitle} />
      <meta property="og:locale"      content="pt_BR" />

      {/* Twitter Card */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:site"        content={TWITTER} />
      <meta name="twitter:url"         content={canonical} />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image"       content={ogImage} />

      {/* Structured data */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(Array.isArray(schema) ? { '@context': 'https://schema.org', '@graph': schema } : schema)}
        </script>
      )}
    </Helmet>
  );
}
