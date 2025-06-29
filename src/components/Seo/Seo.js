import React from "react";
import PropTypes from "prop-types";
import { Helmet } from "react-helmet-async";
import { useStaticQuery, graphql } from "gatsby";
import config from "../../../content/meta/config";

// Helper function to determine the canonical URL for different page types
const getCanonicalUrl = (postSlug, url, pageTitle) => {
  // For the home/index page (special case)
  if (
    !postSlug &&
    (pageTitle === "Rubick.com" || url === config.siteUrl || url === config.siteUrl + "/")
  ) {
    return "https://www.rubick.com";
  }

  // For all other pages (posts, tags, about, etc.), use the full URL
  // This ensures we respect the site's routing structure
  return url;
};

const Seo = (props) => {
  const { data } = props;
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
      {/* Only add canonical for homepage and pages with a slug */}
      {(postSlug || pageTitle === "Rubick.com") && (
        <link rel="canonical" href={getCanonicalUrl(postSlug, url, pageTitle)} />
      )}
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
