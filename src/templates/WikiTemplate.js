import React from "react";
import PropTypes from "prop-types";
import { graphql } from "gatsby";
import { Link } from "gatsby";
import Seo from "../components/Seo";
import Article from "../components/Article";
import Page from "../components/Page";
import { ThemeContext } from "../layouts";

const buildWikiStructure = (wikiPages) => {
  const structure = {};

  wikiPages.forEach(({ node }) => {
    const slug = node.fields.slug;
    const title = node.frontmatter.title;

    // Skip the index page itself
    if (slug === "/" || slug === "/index/") {
      return;
    }

    // Remove leading slash and split path
    const pathParts = slug.replace(/^\//, "").replace(/\/$/, "").split("/");

    let current = structure;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const dir = pathParts[i];
      if (!current[dir]) {
        current[dir] = { isDirectory: true, children: {} };
      }
      current = current[dir].children;
    }

    // Add the page
    const fileName = pathParts[pathParts.length - 1];
    current[fileName] = {
      isDirectory: false,
      title: title,
      slug: slug,
    };
  });

  return structure;
};

const renderWikiStructure = (structure, level = 0, theme) => {
  const indent = "  ".repeat(level);

  return Object.keys(structure)
    .sort()
    .map((key) => {
      const item = structure[key];

      if (item.isDirectory) {
        return (
          <div key={key}>
            <div
              style={{ marginLeft: `${level * 20}px`, fontWeight: "bold", marginBottom: "0.25em" }}
            >
              {key}/
            </div>
            {renderWikiStructure(item.children, level + 1, theme)}
          </div>
        );
      } else {
        return (
          <div key={key} style={{ marginLeft: `${level * 20}px`, marginBottom: "0.25em" }}>
            <Link
              to={`/wiki${item.slug}`}
              style={{ color: theme.color.brand.primary, textDecoration: "none" }}
            >
              {item.title}
            </Link>
          </div>
        );
      }
    });
};

const WikiTemplate = (props) => {
  const page = props.data.page;
  const allWikiPages = props.data.allWikiPages;
  const { pageContext } = props;

  // Generate GitHub edit URL based on the page slug
  let slug = pageContext.slug.endsWith("/") ? pageContext.slug.slice(0, -1) : pageContext.slug;
  // Handle the root wiki page case
  if (slug === "") {
    slug = "/index";
  }
  const githubEditUrl = `https://github.com/jadeforrest/blog/edit/master/content/wiki${slug}.md`;

  // Check if this is the index page
  const isIndexPage = pageContext.slug === "/" || pageContext.slug === "/index/";

  return (
    <React.Fragment>
      <ThemeContext.Consumer>
        {(theme) => (
          <div className="wiki-template">
            <React.Fragment>
              <div className="wiki-edit-header">
                <a
                  href={githubEditUrl}
                  className="wiki-edit-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Edit this page on github
                </a>
              </div>
              <Article theme={theme}>
                {isIndexPage && allWikiPages ? (
                  <div>
                    <h1>{page.frontmatter.title}</h1>
                    <div style={{ marginTop: "2em" }}>
                      {renderWikiStructure(buildWikiStructure(allWikiPages.edges), 0, theme)}
                    </div>
                  </div>
                ) : (
                  <Page page={page} theme={theme} />
                )}
              </Article>

              <style jsx>{`
                .wiki-edit-header {
                  display: flex;
                  justify-content: center;
                  background-color: ${theme.color.neutral.white};
                  border-bottom: 1px solid ${theme.color.neutral.gray.c};
                  padding: ${theme.space.xs} 0;
                  position: relative;
                  z-index: 6;
                }

                @from-width desktop {
                  .wiki-edit-header {
                    position: fixed;
                    top: ${theme.header.height.fixed};
                    left: 0;
                    right: 0;
                    z-index: 6;
                  }
                }

                .wiki-edit-link {
                  font-size: 0.75em;
                  color: #6b8a7d;
                  text-decoration: none;
                  text-align: center;
                  max-width: 90%;
                }

                .wiki-edit-link:hover {
                  text-decoration: underline;
                }

                @from-width desktop {
                  :global(.wiki-template) :global(.article) {
                    margin-top: calc(${theme.space.xs} * 2 + 1.5em);
                  }
                }
              `}</style>
            </React.Fragment>
          </div>
        )}
      </ThemeContext.Consumer>

      <Seo data={page} />
    </React.Fragment>
  );
};

WikiTemplate.propTypes = {
  data: PropTypes.object.isRequired,
  pageContext: PropTypes.object.isRequired,
};

export default WikiTemplate;

// eslint-disable-next-line no-undef
export const pageQuery = graphql`
  query WikiByPath($slug: String!) {
    page: markdownRemark(fields: { slug: { eq: $slug } }) {
      id
      html
      htmlAst
      frontmatter {
        title
      }
    }
    allWikiPages: allMarkdownRemark(
      filter: { fields: { source: { eq: "wiki" } } }
      sort: { fields: { slug: ASC } }
    ) {
      edges {
        node {
          fields {
            slug
          }
          frontmatter {
            title
          }
        }
      }
    }
  }
`;
