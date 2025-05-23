import { FaTag, FaTags } from "react-icons/fa/";
import PropTypes from "prop-types";
import React from "react";
import { graphql, Link } from "gatsby";
import Seo from "../components/Seo";
import { ThemeContext } from "../layouts";
import Article from "../components/Article";
import Headline from "../components/Article/Headline";
import List from "../components/List";

const TagTemplate = (props) => {
  const {
    pageContext: { tag },
    data: {
      allMarkdownRemark: { totalCount, edges },
    },
  } = props;

  return (
    <React.Fragment>
      <ThemeContext.Consumer>
        {(theme) => (
          <Article theme={theme}>
            <header>
              <Headline theme={theme}>
                <span>Posts with tag</span> <FaTag />
                {tag}
              </Headline>
              <p className="meta">
                <strong>{totalCount}</strong> post{totalCount > 1 ? "s " : " "} tagged:
              </p>
              <List edges={edges} theme={theme} />
            </header>
            <footer className="all-tags-link">
              <Link to="/tags/">
                <FaTags />
                <span>View All Tags</span>
              </Link>
            </footer>

            {/* --- STYLES --- */}
            <style jsx>{`
              .all-tags-link {
                display: flex;
                justify-content: center;
                margin-top: ${theme.space.xl};
                padding-top: ${theme.space.l};
                border-top: 1px solid ${theme.line.color};
              }
              .all-tags-link :global(a) {
                display: flex;
                align-items: center;
                color: ${theme.color.neutral.gray.j};
                text-decoration: none;
                padding: ${theme.space.m};
                border-radius: ${theme.size.radius.small};
                transition: all 0.3s ease-in-out;
                font-weight: 600;
              }
              .all-tags-link :global(a:hover) {
                color: ${theme.color.brand.primary};
                background: ${theme.color.neutral.gray.c};
              }
              .all-tags-link :global(svg) {
                fill: ${theme.color.brand.primary};
                margin-right: ${theme.space.s};
                width: ${theme.space.m};
                height: ${theme.space.m};
                transition: all 0.5s;
              }
              @media (hover: hover) {
                .all-tags-link :global(a:hover svg) {
                  transform: scale(1.2);
                }
              }
            `}</style>
          </Article>
        )}
      </ThemeContext.Consumer>

      <Seo pageTitle="Posts with tag" />
    </React.Fragment>
  );
};

TagTemplate.propTypes = {
  data: PropTypes.object.isRequired,
  pageContext: PropTypes.object.isRequired,
};

export default TagTemplate;

// eslint-disable-next-line no-undef
export const tagQuery = graphql`
  query PostsByTag($tag: String) {
    allMarkdownRemark(
      limit: 1000
      sort: { fields: { prefix: DESC } }
      filter: { frontmatter: { tags: { in: [$tag] } } }
    ) {
      totalCount
      edges {
        node {
          fields {
            slug
          }
          excerpt
          timeToRead
          frontmatter {
            title
            tags
          }
        }
      }
    }
  }
`;
