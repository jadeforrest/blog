import React from "react";
import PropTypes from "prop-types";
import { graphql } from "gatsby";
import { Link } from "gatsby";
import Seo from "../components/Seo";
import Article from "../components/Article";
import Page from "../components/Page";
import { ThemeContext } from "../layouts";

const buildWikiStructure = (wikiPages, filterPath = null) => {
  const structure = {};

  wikiPages.forEach(({ node }) => {
    const slug = node.fields.slug;
    const title = node.frontmatter.title;

    // Skip the root index page itself
    if (slug === "/" || slug === "/index/") {
      return;
    }

    // If filtering for a specific path, only include pages in that path
    if (filterPath) {
      const normalizedSlug = slug.replace(/^\//, "").replace(/\/$/, "");
      const normalizedFilter = filterPath.replace(/^\//, "").replace(/\/$/, "");

      // Skip if page is not in the filtered directory
      if (!normalizedSlug.startsWith(normalizedFilter + "/")) {
        return;
      }
    }

    // Remove leading slash and split path
    const pathParts = slug.replace(/^\//, "").replace(/\/$/, "").split("/");

    // If filtering, adjust the path parts to be relative to the filter
    let adjustedParts = pathParts;
    if (filterPath) {
      const filterParts = filterPath.replace(/^\//, "").replace(/\/$/, "").split("/");
      adjustedParts = pathParts.slice(filterParts.length);
    }

    let current = structure;
    for (let i = 0; i < adjustedParts.length - 1; i++) {
      const dir = adjustedParts[i];
      if (!current[dir]) {
        current[dir] = { isDirectory: true, children: {} };
      }
      current = current[dir].children;
    }

    // Add the page
    const fileName = adjustedParts[adjustedParts.length - 1];
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

  // Check if this is an index page (root or subdirectory)
  // An index page is when we don't have page content (markdown file doesn't exist)
  // OR it's the root wiki index
  const isRootIndexPage = pageContext.slug === "/" || pageContext.slug === "/index/";
  const isSubdirectoryIndexPage =
    !page && pageContext.slug.endsWith("/") && pageContext.slug !== "/";
  const isIndexPage = isRootIndexPage || isSubdirectoryIndexPage;

  // Get the directory path for subdirectory index pages
  const directoryPath = isSubdirectoryIndexPage ? pageContext.slug : null;

  // Build breadcrumbs for navigation
  const buildBreadcrumbs = () => {
    const currentSlug = pageContext.slug;
    const breadcrumbs = [];

    // Always start with the root wiki
    breadcrumbs.push({
      title: "Wiki",
      path: "/wiki/",
      isActive: currentSlug === "/" || currentSlug === "/index/",
    });

    // If we're not at the root, build the path
    if (currentSlug !== "/" && currentSlug !== "/index/") {
      const pathParts = currentSlug.replace(/^\//, "").replace(/\/$/, "").split("/");

      // Build breadcrumbs for each directory level
      let currentPath = "";
      for (let i = 0; i < pathParts.length; i++) {
        currentPath += "/" + pathParts[i];
        const isLastPart = i === pathParts.length - 1;
        const isDirectory = isLastPart && currentSlug.endsWith("/");

        // For the last part, check if it's a directory index or a page
        const title = pathParts[i];
        const capitalizedTitle = title.charAt(0).toUpperCase() + title.slice(1);

        if (isLastPart && !isDirectory) {
          // This is a page, use the page title if available
          const pageTitle = page ? page.frontmatter.title : capitalizedTitle;
          breadcrumbs.push({
            title: pageTitle,
            path: null, // Current page, no link
            isActive: true,
          });
        } else {
          // This is a directory
          breadcrumbs.push({
            title: capitalizedTitle,
            path: `/wiki${currentPath}/`,
            isActive: isLastPart,
          });
        }
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = buildBreadcrumbs();

  return (
    <React.Fragment>
      <ThemeContext.Consumer>
        {(theme) => (
          <div className="wiki-template">
            <React.Fragment>
              {!isIndexPage && (
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
              )}

              <Article theme={theme}>
                {/* Breadcrumbs inside article */}
                {breadcrumbs.length > 1 && (
                  <div className="wiki-breadcrumbs">
                    {breadcrumbs.map((crumb, index) => (
                      <span key={index} className="breadcrumb-item">
                        {index > 0 && <span className="breadcrumb-separator"> › </span>}
                        {crumb.path ? (
                          <Link to={crumb.path} className="breadcrumb-link">
                            {crumb.title}
                          </Link>
                        ) : (
                          <span className="breadcrumb-current">{crumb.title}</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
                {isIndexPage && allWikiPages ? (
                  <div>
                    <h1>
                      {page
                        ? page.frontmatter.title
                        : directoryPath
                        ? directoryPath.replace(/\/$/, "").split("/").pop()
                        : "Wiki"}
                    </h1>
                    <div style={{ marginTop: "2em" }}>
                      {renderWikiStructure(
                        buildWikiStructure(allWikiPages.edges, directoryPath),
                        0,
                        theme
                      )}
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

                .wiki-breadcrumbs {
                  padding: ${theme.space.xs} 0;
                  margin-bottom: ${theme.space.s};
                  border-bottom: 1px solid ${theme.color.neutral.gray.d};
                  font-size: 0.85em;
                  color: ${theme.color.neutral.gray.g};
                }

                .breadcrumb-item {
                  display: inline;
                }

                .breadcrumb-separator {
                  color: ${theme.color.neutral.gray.f};
                  margin: 0 0.5em;
                }

                .breadcrumb-link {
                  color: ${theme.color.brand.primary};
                  text-decoration: none;
                }

                .breadcrumb-link:hover {
                  text-decoration: underline;
                }

                .breadcrumb-current {
                  color: ${theme.color.neutral.gray.g};
                  font-weight: 600;
                }

                @from-width desktop {
                  .wiki-template :global(.article) {
                    margin-top: ${isIndexPage ? `0` : `calc(${theme.space.xs} * 2 + 1.5em)`};
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
