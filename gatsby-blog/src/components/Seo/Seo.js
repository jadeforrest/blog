import React from "react";
import PropTypes from "prop-types";
import { Helmet } from "react-helmet-async";
import { useStaticQuery, graphql } from "gatsby";
import config from "../../../content/meta/config";

// Helper function to determine the canonical URL
// Strips query parameters while preserving the pathname exactly as Gatsby serves it
const getCanonicalUrl = (pathname) => {
  // Strip query parameters and hash from pathname if present
  const cleanPath = pathname ? pathname.split("?")[0].split("#")[0] : "/";

  // Construct the full canonical URL
  return `${config.siteUrl}${cleanPath}`;
};

const Seo = (props) => {
  const { data, pathname } = props;
  const pageTitle = props.pageTitle;
  const postTitle = ((data || {}).frontmatter || {}).title;
  const postDescription = ((data || {}).frontmatter || {}).description;
  const postCover = ((data || {}).frontmatter || {}).cover;
  const postSlug = ((data || {}).fields || {}).slug;

  const title = config.shortSiteTitle + " - " + (postTitle || pageTitle);
  const description = postDescription ? postDescription : config.siteDescription;
  const imagePath =
    postCover && postCover.childImageSharp
      ? postCover.childImageSharp.resize.src
      : config.siteImage;
  // Use the postSlug if available, otherwise empty string (for root path)
  const path = postSlug || "";
  const url = config.siteUrl + (config.pathPrefix ? config.pathPrefix : "") + path;
  const domain = useStaticQuery(plausibleDomainQuery).site.siteMetadata.plausibleDomain;
  const imagePathWithDomain = "https://" + domain + "/" + imagePath.replace(/^\//, "");

  // Generate canonical URL from pathname (strips query params)
  const canonicalUrl = getCanonicalUrl(pathname || path);

  return (
    <Helmet
      htmlAttributes={{
        lang: config.siteLanguage,
        prefix: "og: http://ogp.me/ns#",
      }}
    >
      {/* General tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {/* OpenGraph tags */}
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imagePathWithDomain} />
      <meta property="og:type" content="website" />
      {/* Canonical URL - always present, strips query parameters */}
      <link rel="canonical" href={canonicalUrl} />
      {/* Plausible Analytics */}
      {typeof window !== "undefined" && (
        <script async defer data-domain={domain} src="https://plausible.io/js/plausible.js" />
      )}
    </Helmet>
  );
};

Seo.propTypes = {
  data: PropTypes.object,
  pageTitle: PropTypes.string,
  pathname: PropTypes.string,
};

const plausibleDomainQuery = graphql`
  query plausibleDomainQuery {
    site {
      siteMetadata {
        plausibleDomain
      }
    }
  }
`;

export default Seo;
