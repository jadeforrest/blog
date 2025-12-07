require("dotenv").config();
const config = require("./content/meta/config");

module.exports = {
  // pathPrefix: config.pathPrefix,

  siteMetadata: {
    title: config.siteTitle,
    description: config.siteDescription,
    siteUrl: config.siteUrl,
    plausibleDomain: process.env.PLAUSIBLE_DOMAIN || "",
    contactPostAddress: process.env.CONTACT_POST_ADDRESS || "",
    emailSubLink: process.env.EMAIL_SUB_LINK || "",
  },
  plugins: [
    `gatsby-plugin-styled-jsx`, // the plugin's code is inserted directly to gatsby-node.js and gatsby-ssr.js files
    `gatsby-plugin-styled-jsx-postcss`, // as above
    `gatsby-plugin-meta-redirect`, // Create redirects at build time
    `gatsby-plugin-image`,
    {
      resolve: `gatsby-plugin-layout`,
      options: {
        component: require.resolve(`./src/layouts/`)
      }
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `images`,
        path: `${__dirname}/src/images/`
      }
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/content/posts/`,
        name: "posts"
      }
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/content/pages/`,
        name: "pages"
      }
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/content/wiki/`,
        name: "wiki"
      }
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `parts`,
        path: `${__dirname}/content/parts/`
      }
    },
    {
      resolve: `gatsby-transformer-remark`,
      options: {
        plugins: [
          {
            resolve: "gatsby-remark-component-parent2div",
            options: { components: ["re-icons", "re-img", "re-tracedsvg-gallery"] }
          },
          `gatsby-plugin-sharp`,
          {
            resolve: `gatsby-remark-images`,
            options: {
              maxWidth: 800,
              backgroundColor: "transparent",
              quality: 90
            }
          },
          {
            resolve: `gatsby-remark-rehype-images`,
            options: {
              tag: 're-img',
              maxWidth: 800,
              quality: 90,
              useGatsbyImage: true
            }
          },

          {
            resolve: `gatsby-remark-responsive-iframe`,
            options: {
              wrapperStyle: `margin-bottom: 2em`
            }
          },
          `gatsby-remark-prismjs`,
          `gatsby-remark-copy-linked-files`,
          `gatsby-remark-smartypants`,
          {
            resolve: "gatsby-remark-emojis",
            options: {
              // Deactivate the plugin globally (default: true)
              active: true,
              // Add a custom css class
              class: "emoji-icon",
              // Select the size (available size: 16, 24, 32, 64)
              size: 64,
              // Add custom styles
              styles: {
                display: "inline",
                margin: "0",
                "margin-top": "1px",
                position: "relative",
                top: "5px",
                width: "25px"
              }
            }
          }
        ]
      }
    },
    `gatsby-plugin-sharp`,
    `gatsby-transformer-sharp`,
    // `gatsby-plugin-react-helmet`, // Replaced with react-helmet-async (no plugin needed)
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: config.manifestName,
        short_name: config.manifestShortName,
        start_url: config.manifestStartUrl,
        background_color: config.manifestBackgroundColor,
        theme_color: config.manifestThemeColor,
        display: config.manifestDisplay,
        icons: [
          {
            src: "/icons/icon-48x48.png",
            sizes: "48x48",
            type: "image/png"
          },
          {
            src: "/icons/icon-96x96.png",
            sizes: "96x96",
            type: "image/png"
          },
          {
            src: "/icons/icon-144x144.png",
            sizes: "144x144",
            type: "image/png"
          },
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icons/icon-256x256.png",
            sizes: "256x256",
            type: "image/png"
          },
          {
            src: "/icons/icon-384x384.png",
            sizes: "384x384",
            type: "image/png"
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      }
    },
    {
      resolve: `gatsby-plugin-feed`,
      options: {
        query: `
          {
            site {
              siteMetadata {
                title
                description
                siteUrl
                site_url: siteUrl
              }
            }
          }
        `,
        feeds: [
          {
            serialize: ({ query: { site, allMarkdownRemark } }) => {
              return allMarkdownRemark.edges.map(edge => {
                return Object.assign({}, edge.node.frontmatter, {
                  description: edge.node.excerpt,
                  date: edge.node.fields.prefix,
                  url: site.siteMetadata.siteUrl + edge.node.fields.slug,
                  guid: site.siteMetadata.siteUrl + edge.node.fields.slug,
                  custom_elements: [{ "content:encoded": edge.node.html }]
                });
              });
            },
            query: `
              {
                allMarkdownRemark(
                  limit: 1000,
                  sort: { fields: {prefix: DESC} },
                  filter: {
                    fields: {
                      prefix: { regex: "/[0-9]{4}.*/" },
                      slug: { ne: null }
                    }
                  }
                ) {
                  edges {
                    node {
                      excerpt
                      html
                      fields {
                        slug
                        prefix
                      }
                      frontmatter {
                        title
                      }
                    }
                  }
                }
              }
            `,
              output: "/rss.xml",
	      title: config.siteTitle  // fix for issue @https://github.com/gatsbyjs/gatsby/issues/17100
          }
        ]
      }
    },
    {
      resolve: `gatsby-plugin-sitemap`
    },
    {
      resolve: "gatsby-plugin-react-svg",
      options: {
        include: /svg-icons/
      }
    },
    {
      resolve: "gatsby-plugin-local-search",
      options: {
        name: "pages",
        engine: "flexsearch",
        engineOptions: {
          encode: "icase",
          tokenize: "forward",
          threshold: 1,
          resolution: 3,
          depth: 2,
          stemmer: {
            "e": "",
            "s": "",
            "ing": "",
            "ly": "",
            "ed": "",
            "er": "",
            "est": "",
            "es": "",
            "ies": "y"
          }
        },
        query: `
          {
            allMarkdownRemark(
              filter: {
                fields: { slug: { ne: null } }
                fileAbsolutePath: { regex: "/(posts|wiki|pages)/" }
              }
            ) {
              nodes {
                id
                fields {
                  slug
                  prefix
                  source
                }
                frontmatter {
                  title
                  tags
                  description
                }
                excerpt
              }
            }
          }
        `,
        ref: "id",
        index: ["title", "tags", "excerpt", "description"],
        store: ["id", "slug", "title", "tags", "date"],
        normalizer: ({ data }) => {
          // Index markdown content
          const markdownPages = data.allMarkdownRemark.nodes
            .filter(node => {
              // Skip drafts
              return !node.fields.slug.includes("--draft");
            })
            .map(node => {
              // Wiki pages need /wiki prefix, posts and pages don't
              const slug = node.fields.source === "wiki"
                ? `/wiki${node.fields.slug}`.replace(/\/$/, "")
                : node.fields.slug;

              return {
                id: node.id,
                slug: slug,
                title: node.frontmatter.title,
                tags: node.frontmatter.tags || [],
                excerpt: node.excerpt,
                description: node.frontmatter.description,
                date: node.fields.prefix
              };
            });

          // Add static JSX pages to search index
          const staticPages = [
            {
              id: "page-home",
              slug: "/",
              title: "Rubick.com - Engineering Leadership",
              tags: ["leadership", "engineering", "blog"],
              excerpt: "Learn to build humane, effective engineering organizations. Blog posts, newsletter, and course on engineering leadership and management.",
              description: "Learn to build humane, effective engineering organizations",
              date: null
            },
            {
              id: "page-about",
              slug: "/about/",
              title: "About Jade Rubick - Engineering Leadership Consultant",
              tags: ["about", "consulting", "advisor", "fractional", "interim"],
              excerpt: "I build thriving engineering organizations. I help with scaling engineering, leadership coaching, product delivery, hiring, quality, and organizational structure. Available for executive advisory, fractional work, and interim VP of Engineering roles.",
              description: "Engineering leadership consultant specializing in scaling, hiring, and organizational design",
              date: null
            },
            {
              id: "page-course",
              slug: "/course/",
              title: "Frontline Management Bootcamp",
              tags: ["course", "management", "leadership", "engineering managers"],
              excerpt: "A 5-month email-based course for engineering managers who are just getting started or have some experience. Learn practical management skills delivered weekly.",
              description: "Email-based course for new engineering managers",
              date: null
            },
            {
              id: "page-newsletter",
              slug: "/newsletter/",
              title: "Engineering Leadership Weekly",
              tags: ["newsletter", "leadership", "engineering", "management"],
              excerpt: "Weekly newsletter on engineering leadership. Get blog content delivered to your inbox on a weekly schedule. Available in free and supporter editions.",
              description: "Weekly newsletter on engineering leadership and management",
              date: null
            }
          ];

          return [...markdownPages, ...staticPages];
        }
      }
    }
  ]
};
