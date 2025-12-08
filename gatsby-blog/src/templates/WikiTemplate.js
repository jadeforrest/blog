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
    const icon = node.frontmatter.icon;
    const description = node.frontmatter.description;

    // Skip the root index page itself
    if (slug === "/" || slug === "/index/") {
      return;
    }

    // Skip directory index pages in structure building
    if (slug.endsWith("/index/") || slug.endsWith("/index")) {
      return;
    }

    // Don't skip directory landing pages - we need them to build the directory structure
    // The index files provide metadata, but the directory pages provide the structure

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
    // For pages that end with slash, we still want to treat them as pages, not directories
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
      // Get metadata for this directory
      const dirPath = "/" + pathParts.slice(0, i + 1).join("/");
      const metadata = directoryMetadata[dirPath] || {};

      if (!current[dir]) {
        current[dir] = {
          isDirectory: true,
          children: {},
          title: metadata.title || dir.charAt(0).toUpperCase() + dir.slice(1),
          icon: metadata.icon || "📁",
          description: metadata.description,
        };
      } else {
        // Directory already exists, but update with metadata if we have it
        if (metadata.title) current[dir].title = metadata.title;
        if (metadata.icon) current[dir].icon = metadata.icon;
        if (metadata.description !== undefined) current[dir].description = metadata.description;
      }

      // Ensure we have a valid directory structure (but don't overwrite existing metadata)
      if (!current[dir] || !current[dir].children) {
        if (!current[dir]) {
          current[dir] = {
            isDirectory: true,
            children: {},
            title: dir.charAt(0).toUpperCase() + dir.slice(1),
            icon: "📁",
            description: null,
          };
        } else {
          // Just ensure children exists without overwriting metadata
          current[dir].children = current[dir].children || {};
        }
      }
      current = current[dir].children;
    }

    // Add the page
    const fileName = adjustedParts[adjustedParts.length - 1];
    if (current && typeof current === "object") {
      // For wiki pages, remove trailing slash to match the actual page URLs created in gatsby-node.js
      const normalizedSlug =
        slug.endsWith("/") && !slug.endsWith("/index/") ? slug.replace(/\/$/, "") : slug;

      current[fileName] = {
        isDirectory: false,
        title: title,
        slug: normalizedSlug,
        icon: icon,
        description: description,
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
    const items = Object.keys(structure).sort();
    const hasAnyItemsWithMetadata = items.some((key) => {
      const item = structure[key];
      return !item.isDirectory && item.icon && item.description;
    });

    // If we have individual pages with metadata, wrap them in a single card
    if (hasAnyItemsWithMetadata) {
      return (
        <div className="wiki-grid">
          <div
            className="wiki-category-card"
            style={{
              border: "3px solid #999999",
              borderRadius: "8px",
              padding: "24px",
              marginBottom: "24px",
              backgroundColor: "white",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
              display: "block",
              width: "100%",
            }}
          >
            <div className="wiki-category-content">
              {items.map((key) => {
                const item = structure[key];

                if (item.isDirectory) {
                  return (
                    <div key={key} className="wiki-nested-directory">
                      <div className="wiki-nested-directory-title">
                        <span className="wiki-nested-icon">{item.icon || "📁"}</span>
                        {item.title || key}/
                      </div>
                      <div className="wiki-nested-children">
                        {renderWikiStructure(item.children, level + 1, theme)}
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div
                      key={key}
                      className="wiki-page-item-with-metadata"
                      style={{
                        marginBottom: "20px",
                        paddingBottom: "16px",
                        borderBottom:
                          items.indexOf(key) < items.length - 1 ? "1px solid #e5e7eb" : "none",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          marginBottom: "8px",
                        }}
                      >
                        {item.icon && (
                          <span
                            style={{
                              marginRight: "12px",
                              fontSize: "1.2em",
                              flexShrink: 0,
                              lineHeight: "1.4em",
                            }}
                          >
                            {item.icon}
                          </span>
                        )}
                        <div style={{ flex: 1 }}>
                          <Link
                            to={`/wiki${item.slug}`}
                            style={{
                              color: "#2563EB",
                              textDecoration: "none",
                              fontSize: "1.1em",
                              fontWeight: 500,
                              lineHeight: "1.4em",
                            }}
                          >
                            {item.title}
                          </Link>
                          {item.description && (
                            <div
                              style={{
                                color: "#6b7280",
                                fontSize: "0.95em",
                                marginTop: "4px",
                                lineHeight: 1.5,
                              }}
                            >
                              {item.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        </div>
      );
    }

    // Original logic for directories and simple pages
    return (
      <div className="wiki-grid">
        {items.map((key) => {
          const item = structure[key];

          if (item.isDirectory) {
            return (
              <div
                key={key}
                className="wiki-category-card"
                style={{
                  border: "3px solid #999999",
                  borderRadius: "8px",
                  padding: "24px",
                  marginBottom: "24px",
                  backgroundColor: "white",
                  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
                  display: "block",
                  width: "100%",
                }}
              >
                <div
                  className="wiki-category-header"
                  style={{
                    marginBottom: "16px",
                    paddingBottom: "8px",
                    borderBottom: "1px solid #ccc",
                  }}
                >
                  <h3
                    className="wiki-category-title"
                    style={{
                      margin: 0,
                      fontSize: "1.4em",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <span className="wiki-category-icon" style={{ marginRight: "12px" }}>
                      {item.icon}
                    </span>
                    {item.title}
                  </h3>
                </div>
                {item.description && (
                  <div
                    className="wiki-category-description"
                    style={{
                      color: "#6b7280",
                      fontSize: "1em",
                      marginBottom: "16px",
                      lineHeight: 1.5,
                    }}
                  >
                    {item.description}
                  </div>
                )}
                <div className="wiki-category-content" style={{ marginTop: "16px" }}>
                  {renderWikiStructure(item.children, level + 1, theme)}
                </div>
              </div>
            );
          } else {
            return (
              <div key={key} className="wiki-single-page-card">
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  {item.icon && (
                    <span
                      style={{
                        fontSize: "1.2em",
                        flexShrink: 0,
                        lineHeight: "1.4em",
                      }}
                    >
                      {item.icon}
                    </span>
                  )}
                  <div style={{ flex: 1 }}>
                    <Link
                      to={`/wiki${item.slug}`}
                      className="wiki-page-link"
                      style={{
                        fontSize: "1.1em",
                        fontWeight: 500,
                        display: "block",
                        marginBottom: item.description ? "4px" : "0",
                      }}
                    >
                      {item.title}
                    </Link>
                    {item.description && (
                      <div
                        style={{
                          color: "#6b7280",
                          fontSize: "0.95em",
                          lineHeight: 1.5,
                        }}
                      >
                        {item.description}
                      </div>
                    )}
                  </div>
                </div>
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
              // Skip entries with no title or empty title
              if (!item.title || item.title.trim() === "") {
                return null;
              }

              return (
                <li
                  key={key}
                  className="wiki-page-item"
                  style={{
                    paddingLeft: "0px",
                    listStyle: "none",
                    display: "flex",
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    style={{
                      marginRight: "8px",
                      marginLeft: "24px",
                      color: "#9CA3AF",
                      fontSize: "1.2em",
                      lineHeight: "1.4em",
                    }}
                  >
                    •
                  </span>
                  <Link
                    to={`/wiki${item.slug}`}
                    className="wiki-page-link"
                    style={{
                      color: "#2563EB",
                      textDecoration: "none",
                      fontSize: "0.95em",
                      lineHeight: "1.4em",
                    }}
                  >
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
  let page = props.data.page;
  const allWikiPages = props.data.allWikiPages;
  const { pageContext } = props;

  // Track if we're using index content for a directory page
  let usingIndexContent = false;

  // For directory pages without direct content, try to find the index page
  if (!page && pageContext.slug.endsWith("/") && pageContext.slug !== "/") {
    const indexSlug = pageContext.slug + "index/";
    const indexPageNode = allWikiPages.edges.find(({ node }) => node.fields.slug === indexSlug);
    if (indexPageNode) {
      page = {
        id: indexPageNode.node.id,
        html: indexPageNode.node.html,
        htmlAst: indexPageNode.node.htmlAst,
        frontmatter: indexPageNode.node.frontmatter,
      };
      usingIndexContent = true;
    }
  }

  // Generate GitHub edit URL based on the page slug
  let slug = pageContext.slug.endsWith("/") ? pageContext.slug.slice(0, -1) : pageContext.slug;
  // Handle the root wiki page case
  if (slug === "") {
    slug = "/index";
  }
  // For directory pages that serve index.md files, add /index to the GitHub URL
  // This includes both fallback cases and pages that are directory indexes
  if (pageContext.slug.endsWith("/") && pageContext.slug !== "/" && page) {
    // A directory index page has sub-pages under it, while a regular page does not
    // Check if there are other pages that start with this slug (indicating it's a directory)
    const slugPrefix = pageContext.slug;
    const hasSubPages = allWikiPages.edges.some(
      ({ node }) => node.fields.slug !== pageContext.slug && node.fields.slug.startsWith(slugPrefix)
    );

    if (hasSubPages || usingIndexContent) {
      slug = slug + "/index";
    }
  }
  const githubEditUrl = `https://github.com/jadeforrest/blog/edit/master/content/wiki${slug}.md`;

  // Check if this is an index page (root or subdirectory)
  // Index pages show directory listings. We distinguish:
  // - Root wiki index: "/" or "/index/"
  // - Directory index pages: "/tools/index/" (explicit index pages)
  // - Directory pages: "/tools/" (auto-generated, no direct markdown content)
  // - Regular pages: have direct page content, even if slug ends with "/"
  const isRootIndexPage = pageContext.slug === "/" || pageContext.slug === "/index/";
  const isDirectoryIndexPage = pageContext.slug.endsWith("/index/");
  // Directory page: ends with "/" but NOT "/index/"
  const isDirectoryPage =
    pageContext.slug.endsWith("/") &&
    pageContext.slug !== "/" &&
    !pageContext.slug.endsWith("/index/");
  const isIndexPage = isRootIndexPage || isDirectoryIndexPage || isDirectoryPage;

  // Get the directory path for subdirectory index pages
  const directoryPath =
    isDirectoryIndexPage || isDirectoryPage
      ? pageContext.slug.endsWith("/index/")
        ? pageContext.slug.replace("/index/", "/")
        : pageContext.slug
      : null;

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

              {/* Edit link after breadcrumbs */}
              {pageContext.slug !== "/" && pageContext.slug !== "/index/" && page && (
                <div
                  className="wiki-edit-header"
                  style={{ marginBottom: "20px", textAlign: "right" }}
                >
                  <a
                    href={githubEditUrl}
                    className="wiki-edit-link"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: "0.9em",
                      color: "#666",
                      textDecoration: "none",
                      border: "1px solid #ddd",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      display: "inline-block",
                    }}
                  >
                    Edit this page on github
                  </a>
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

            {/* --- STYLES --- */}
            {/* eslint-disable-next-line react/no-unknown-property */}
            <style jsx global>{`
              .wiki-template h1 {
                margin: 0.5em 0 0.2em !important;
                line-height: 1.3 !important;
                padding: 0.2em 0 0.1em 0 !important;
                font-size: 2.5em !important;
              }

              .wiki-template h2 {
                margin: 0.6em 0 0.3em !important;
                line-height: 1.4 !important;
                padding: 0.4em 0 0.2em 0 !important;
                font-size: 2em !important;
              }

              .wiki-template h3 {
                margin: 0.5em 0 0.2em !important;
                line-height: 1.4 !important;
                padding: 0.2em 0 0.1em 0 !important;
                font-size: 1.6em !important;
              }

              .wiki-template p {
                margin: 0 0 1.8em 0 !important;
                line-height: 1.7 !important;
                padding-bottom: 0.5em !important;
              }

              .wiki-template ul {
                margin: 0 0 1.8em 0 !important;
                line-height: 1.7 !important;
                padding-bottom: 1em !important;
              }

              .wiki-template li {
                margin: 0.3em 0 !important;
                line-height: 1.7 !important;
                padding: 0.1em 0 !important;
              }
            `}</style>
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
        pathname={props.location.pathname}
      />
    </React.Fragment>
  );
};

WikiTemplate.propTypes = {
  data: PropTypes.object.isRequired,
  pageContext: PropTypes.object.isRequired,
  location: PropTypes.shape({
    pathname: PropTypes.string.isRequired,
  }).isRequired,
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
          id
          html
          htmlAst
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
