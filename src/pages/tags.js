import { FaTag } from "react-icons/fa/";
import PropTypes from "prop-types";
import React from "react";
import { graphql, Link } from "gatsby";
import _ from "lodash";
import theme from "../theme/theme.yaml";
import Article from "../components/Article/";
import Headline from "../components/Article/Headline";
import List from "../components/List";
import Seo from "../components/Seo";

const TagsPage = (props) => {
  const {
    data: {
      posts: { edges: posts },
    },
  } = props;

  // Create tags list
  const tagsPosts = {};
  posts.forEach((edge) => {
    const {
      node: {
        frontmatter: { tags },
      },
    } = edge;

    if (tags && tags != null) {
      tags.forEach((tag) => {
        if (tag && tag != null) {
          if (!tagsPosts[tag]) {
            tagsPosts[tag] = [];
          }
          tagsPosts[tag].push(edge);
        }
      });
    }
  });

  const tagList = [];

  for (const tag in tagsPosts) {
    if (Object.prototype.hasOwnProperty.call(tagsPosts, tag)) {
      tagList.push([tag, tagsPosts[tag]]);
    }
  }

  return (
    <React.Fragment>
      <Article theme={theme}>
        <header>
          <Headline title="Posts by tag" theme={theme} />
        </header>
        {tagList.map((item) => (
          <section key={item[0]}>
            <h2>
              <Link to={`/tag/${_.kebabCase(item[0])}/`}>
                <FaTag /> {item[0]}
              </Link>
            </h2>
            <List edges={item[1]} theme={theme} />
          </section>
        ))}
        {/* --- STYLES --- */}
        <style jsx>{`
          h2 {
            margin: 0 0 0.5em;
            color: ${theme.color.neutral.gray.j};
          }
          h2 :global(a) {
            color: ${theme.color.neutral.gray.j};
            text-decoration: none;
            transition: all 0.3s ease-in-out;
          }
          @from-width desktop {
            h2 :global(a:hover) {
              color: ${theme.color.brand.primary};
            }
          }
          h2 :global(svg) {
            height: 0.8em;
            fill: ${theme.color.brand.primary};
          }
        `}</style>
      </Article>

      <Seo pageTitle="Tags" pathname={props.location.pathname} />
    </React.Fragment>
  );
};

TagsPage.propTypes = {
  data: PropTypes.object.isRequired,
  location: PropTypes.shape({
    pathname: PropTypes.string.isRequired,
  }).isRequired,
};

export default TagsPage;

// eslint-disable-next-line no-undef
export const query = graphql`
  query PostsQuery {
    posts: allMarkdownRemark(
      filter: { fileAbsolutePath: { regex: "//[0-9]+.*--/" } }
      sort: { fields: { prefix: DESC } }
    ) {
      edges {
        node {
          excerpt
          fields {
            slug
            prefix
          }
          frontmatter {
            title
            tags
            author
          }
        }
      }
    }
  }
`;
