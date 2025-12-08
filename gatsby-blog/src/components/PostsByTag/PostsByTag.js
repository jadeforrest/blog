import React from "react";
import PropTypes from "prop-types";
import { useStaticQuery, graphql } from "gatsby";
import List from "../List";

const PostsByTag = (props) => {
  const { tag, theme, limit } = props;

  const data = useStaticQuery(graphql`
    query AllPostsForTag {
      allMarkdownRemark(
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
  `);

  // Filter posts by tag
  const filteredPosts = data.allMarkdownRemark.edges.filter((edge) => {
    const {
      node: {
        frontmatter: { tags },
      },
    } = edge;
    return tags && tags.includes(tag);
  });

  // Apply limit if specified
  const postsToShow = limit ? filteredPosts.slice(0, limit) : filteredPosts;

  if (postsToShow.length === 0) {
    return null;
  }

  return (
    <React.Fragment>
      <List edges={postsToShow} theme={theme} />
    </React.Fragment>
  );
};

PostsByTag.propTypes = {
  tag: PropTypes.string.isRequired,
  theme: PropTypes.object.isRequired,
  limit: PropTypes.number,
};

export default PostsByTag;
