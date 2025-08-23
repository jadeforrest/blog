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
  const directoryMetadata = {};

  // First pass: collect directory metadata from index pages
  wikiPages.forEach(({ node }) => {
    const slug = node.fields.slug;
    const title = node.frontmatter.title;
    const icon = node.frontmatter.icon;
    const description = node.frontmatter.description;

    // Check if this is a directory index page
    // Handle both /business/index/ and /business/ patterns
    if (slug.endsWith("/index/") || slug.endsWith("/index")) {
      const directoryPath = slug.replace(/\/index\/?$/, "");
      directoryMetadata[directoryPath] = {
        title,
        icon,
        description,
      };
    } else if (slug.endsWith("/") && slug.split("/").length === 3) {
      // This handles /business/ patterns (2 slashes = 3 parts when split)
      const directoryPath = slug.replace(/\/$/, "");
      // Only add if we don't already have metadata (prefer explicit index files)
      if (!directoryMetadata[directoryPath]) {
        directoryMetadata[directoryPath] = {
          title,
          icon,
          description,
        };
      }
    }
  });

  // Second pass: build structure
  wikiPages.forEach(({ node }) => {
    const slug = node.fields.slug;
    const title = node.frontmatter.title;

    // Skip the root index page itself
    if (slug === "/" || slug === "/index/") {
      return;
    }

    // Skip directory index pages in structure building
    if (slug.endsWith("/index/") || slug.endsWith("/index")) {
      return;
    }

    // Skip directory landing pages (like /business/)
    if (slug.endsWith("/") && slug.split("/").length === 3) {
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
        // Get metadata for this directory
        const dirPath = "/" + pathParts.slice(0, i + 1).join("/");
        const metadata = directoryMetadata[dirPath] || {};

        current[dir] = {
          isDirectory: true,
          children: {},
          title: metadata.title || dir.charAt(0).toUpperCase() + dir.slice(1),
          icon: metadata.icon || "📁",
          description: metadata.description,
        };
      }
      // Ensure we have a valid directory structure
      if (!current[dir] || !current[dir].children) {
        console.warn(`Invalid directory structure at ${dir}`, current[dir]);
        current[dir] = {
          isDirectory: true,
          children: {},
          title: dir.charAt(0).toUpperCase() + dir.slice(1),
          icon: "📁",
          description: null,
        };
      }
      current = current[dir].children;
    }

    // Add the page
    const fileName = adjustedParts[adjustedParts.length - 1];
    if (current && typeof current === "object") {
      current[fileName] = {
        isDirectory: false,
        title: title,
        slug: slug,
      };
    }
  });

  return structure;
};

const countPagesInDirectory = (children) => {
  if (!children || typeof children !== "object") return 0;
  let count = 0;
  Object.keys(children).forEach((key) => {
    const item = children[key];
    if (item && item.isDirectory && item.children) {
      count += countPagesInDirectory(item.children);
    } else if (item && !item.isDirectory) {
      count += 1;
    }
  });
  return count;
};

const renderWikiStructure = (structure, level = 0, theme) => {
  if (level === 0) {
    // Root level - use card-based layout
    return (
      <div className="wiki-grid">
        {Object.keys(structure)
          .sort()
          .map((key) => {
            const item = structure[key];

            if (item.isDirectory) {
              return (
                <div 
                  key={key} 
                  className="wiki-category-card"
                  style={{
                    border: '3px solid #999999',
                    borderRadius: '8px',
                    padding: '24px',
                    marginBottom: '24px',
                    backgroundColor: 'white',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                    display: 'block',
                    width: '100%'
                  }}
                >
                  <div 
                    className="wiki-category-header"
                    style={{
                      marginBottom: '16px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid #ccc'
                    }}
                  >
                    <h3 
                      className="wiki-category-title"
                      style={{
                        margin: 0,
                        fontSize: '1.4em',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <span 
                        className="wiki-category-icon"
                        style={{ marginRight: '12px' }}
                      >
                        {item.icon}
                      </span>
                      {item.title}
                    </h3>
                  </div>
                  {item.description && (
                    <div 
                      className="wiki-category-description"
                      style={{
                        color: '#6b7280',
                        fontSize: '1em',
                        marginBottom: '16px',
                        lineHeight: 1.5
                      }}
                    >
                      {item.description}
                    </div>
                  )}
                  <div 
                    className="wiki-category-content"
                    style={{ marginTop: '16px' }}
                  >
                    {renderWikiStructure(item.children, level + 1, theme)}
                  </div>
                </div>
              );
            } else {
              return (
                <div key={key} className="wiki-single-page-card">
                  <Link to={`/wiki${item.slug}`} className="wiki-page-link">
                    {item.title}
                  </Link>
                </div>
              );
            }
          })}
      </div>
    );
  } else {
    // Nested levels - use simple list layout
    return (
      <ul className="wiki-page-list">
        {Object.keys(structure)
          .sort()
          .map((key) => {
            const item = structure[key];

            if (item.isDirectory) {
              return (
                <li key={key} className="wiki-nested-directory">
                  <div className="wiki-nested-directory-title">
                    <span className="wiki-nested-icon">{item.icon || "📁"}</span>
                    {item.title || key}/
                  </div>
                  <div className="wiki-nested-children">
                    {renderWikiStructure(item.children, level + 1, theme)}
                  </div>
                </li>
              );
            } else {
              return (
                <li key={key} className="wiki-page-item">
                  <Link to={`/wiki${item.slug}`} className="wiki-page-link">
                    {item.title}
                  </Link>
                </li>
              );
            }
          })}
      </ul>
    );
  }
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
                    {/* Show page content if it exists (for directory index pages) */}
                    {page && page.html && (
                      <div
                        className="wiki-page-content"
                        dangerouslySetInnerHTML={{ __html: page.html }}
                      />
                    )}
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

                /* New wiki grid styles */
                .wiki-grid {
                  display: block;
                  margin-top: ${theme.space.xl};
                  padding: 0;
                }


                .wiki-category-card {
                  background: white !important;
                  border: 3px solid #999999 !important;
                  outline: 2px solid #666666 !important;
                  border-radius: 8px !important;
                  padding: 24px !important;
                  margin: 24px 0 !important;
                  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2) !important;
                  display: block !important;
                  width: 100% !important;
                  box-sizing: border-box !important;
                }

                .wiki-category-card:hover {
                  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.25) !important;
                  border-color: #2563eb !important;
                }

                .wiki-category-header {
                  margin-bottom: ${theme.space.m};
                  padding-bottom: ${theme.space.s};
                  border-bottom: 1px solid ${theme.color.neutral.gray.c};
                }

                .wiki-category-title {
                  margin: 0;
                  font-size: 1.4em;
                  font-weight: 600;
                  color: ${theme.color.neutral.gray.j};
                  flex: 1;
                  line-height: 1.3;
                  display: flex;
                  align-items: center;
                  gap: ${theme.space.s};
                }

                .wiki-category-icon {
                  font-size: 1.2em;
                  flex-shrink: 0;
                  line-height: 1;
                  margin-right: ${theme.space.s};
                }


                .wiki-category-description {
                  color: ${theme.color.neutral.gray.h};
                  font-size: 1em;
                  margin-bottom: ${theme.space.m};
                  line-height: 1.5;
                  font-weight: 400;
                }

                .wiki-category-content {
                  margin-top: ${theme.space.m};
                }

                .wiki-single-page-card {
                  background: ${theme.color.neutral.white};
                  border: 1px solid ${theme.color.neutral.gray.d};
                  border-radius: 8px;
                  padding: ${theme.space.m};
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                  transition: box-shadow 0.2s ease, transform 0.2s ease;
                }

                .wiki-single-page-card:hover {
                  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                  transform: translateY(-1px);
                }

                .wiki-page-link {
                  display: flex;
                  align-items: center;
                  gap: ${theme.space.xs};
                  color: ${theme.color.brand.primary};
                  text-decoration: none;
                  font-weight: 500;
                }

                .wiki-page-link:hover {
                  color: ${theme.color.brand.primaryActive};
                }

                .wiki-page-icon {
                  font-size: 1.2em;
                  flex-shrink: 0;
                }

                .wiki-page-title {
                  flex: 1;
                }

                /* Page content styles */
                .wiki-page-content {
                  margin-bottom: ${theme.space.xl};
                  padding-bottom: ${theme.space.l};
                  border-bottom: 2px solid ${theme.color.neutral.gray.c};
                }

                /* List styles for pages */
                .wiki-page-list {
                  list-style: none;
                  padding: 0;
                  margin: 0;
                }

                .wiki-page-item {
                  margin-bottom: ${theme.space.s};
                }

                .wiki-page-link {
                  color: ${theme.color.brand.primary};
                  text-decoration: none;
                  font-size: 0.95em;
                  padding: ${theme.space.xs} 0;
                  display: block;
                  transition: color 0.2s ease;
                }

                .wiki-page-link:hover {
                  color: ${theme.color.brand.primaryActive || theme.color.brand.primary};
                  text-decoration: underline;
                }

                .wiki-page-link:before {
                  content: "•";
                  color: ${theme.color.neutral.gray.f};
                  margin-right: ${theme.space.xs};
                }

                /* Nested directory styles */
                .wiki-nested-directory {
                  margin-bottom: ${theme.space.m};
                }

                .wiki-nested-directory-title {
                  display: flex;
                  align-items: center;
                  gap: ${theme.space.xs};
                  font-weight: 600;
                  color: ${theme.color.neutral.gray.i};
                  margin-bottom: ${theme.space.s};
                  font-size: 1em;
                  padding: ${theme.space.xs} 0;
                }

                .wiki-nested-icon {
                  font-size: 1.1em;
                  flex-shrink: 0;
                }

                .wiki-nested-children {
                  margin-left: ${theme.space.m};
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

      <Seo
        data={page}
        pageTitle={
          page
            ? page.frontmatter.title
            : isRootIndexPage
            ? "Wiki"
            : directoryPath
            ? directoryPath.replace(/\/$/, "").split("/").pop()
            : "Wiki"
        }
      />
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
            icon
            description
          }
        }
      }
    }
  }
`;
