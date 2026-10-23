/** Public identity shared by search metadata and visible creator credits. */
export const SITE_IDENTITY = {
  name: "Zygoria",
  creator: "Dylan Sion Owen",
  creatorShortName: "Dylan Owen",
  url: "https://zygoria.com",
  title: "Zygoria — An Original World by Dylan Sion Owen",
  description: "Zygoria, created by Dylan Sion Owen. An original world with characters, stories, cards, and a game in development.",
};

const creatorId = `${SITE_IDENTITY.url}/#creator`;
const worldId = `${SITE_IDENTITY.url}/#zygoria`;
const websiteId = `${SITE_IDENTITY.url}/#website`;

export const SITE_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": creatorId,
      name: SITE_IDENTITY.creator,
      alternateName: SITE_IDENTITY.creatorShortName,
      description: "Creator of Zygoria, an original world with characters, stories, cards, and a game in development.",
      url: SITE_IDENTITY.url,
    },
    {
      "@type": "CreativeWork",
      "@id": worldId,
      name: SITE_IDENTITY.name,
      description: SITE_IDENTITY.description,
      url: SITE_IDENTITY.url,
      creator: { "@id": creatorId },
      author: { "@id": creatorId },
    },
    {
      "@type": "WebSite",
      "@id": websiteId,
      name: SITE_IDENTITY.name,
      url: SITE_IDENTITY.url,
      description: SITE_IDENTITY.description,
      creator: { "@id": creatorId },
      about: { "@id": worldId },
      inLanguage: "en",
    },
    {
      "@type": "WebPage",
      "@id": `${SITE_IDENTITY.url}/#webpage`,
      url: SITE_IDENTITY.url,
      name: SITE_IDENTITY.title,
      description: SITE_IDENTITY.description,
      isPartOf: { "@id": websiteId },
      about: { "@id": worldId },
      author: { "@id": creatorId },
    },
  ],
};