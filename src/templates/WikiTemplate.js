import React from "react";
import PropTypes from "prop-types";
import { graphql } from "gatsby";
import Seo from "../components/Seo";
import Article from "../components/Article";
import Page from "../components/Page";
import { ThemeContext } from "../layouts";

const WikiTemplate = (props) => {
  const page = props.data.page;
  const { pageContext } = props;

  // Generate GitHub edit URL based on the page slug
  let slug = pageContext.slug.endsWith("/") ? pageContext.slug.slice(0, -1) : pageContext.slug;
  // Handle the root wiki page case
  if (slug === "") {
    slug = "/index";
  }
  const githubEditUrl = `https://github.com/jadeforrest/blog/edit/master/content/wiki${slug}.md`;

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
              <Page page={page} theme={theme} />
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
  }
`;
