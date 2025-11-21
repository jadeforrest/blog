import PropTypes from "prop-types";
import React from "react";
import { GatsbyImage, getImage } from "gatsby-plugin-image";
import { Link } from "gatsby";
import { FaCalendar } from "react-icons/fa";
import { FaArrowRight } from "react-icons/fa";

/**
 * RecentPosts component that displays a compact list of the most recent blog posts
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.theme - Theme object for styling
 * @param {Array} props.posts - Array of post data
 */
const RecentPosts = (props) => {
  const { theme, posts } = props;

  return (
    <React.Fragment>
      <div className="recent-posts">
        <h2>Recent posts</h2>
        <div className="posts-container">
          {posts.map((post, index) => {
            const {
              node: {
                excerpt,
                fields: { slug, prefix },
                frontmatter: {
                  title,
                  cover: { children: [{ gatsbyImageData = null }] = [{ gatsbyImageData: null }] },
                },
              },
            } = post;

            return (
              <div key={slug} className="post-item">
                <div className="post-image">
                  {gatsbyImageData && (
                    <Link to={slug}>
                      <GatsbyImage
                        image={gatsbyImageData}
                        alt={title}
                        loading={index === 0 ? "eager" : "lazy"}
                      />
                    </Link>
                  )}
                </div>
                <div className="post-content">
                  <h3>
                    <Link to={slug}>{title}</Link>
                  </h3>
                  <div className="post-meta">
                    <span>
                      <FaCalendar size={14} /> {prefix}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="view-all-links">
          <div className="view-all-tags">
            <Link to="/tags">
              View all tags <FaArrowRight />
            </Link>
          </div>
          <div className="view-all-posts">
            <Link to="/posts">
              View all posts <FaArrowRight />
            </Link>
          </div>
        </div>
      </div>

      {/* --- STYLES --- */}
      <style jsx>{`
        .recent-posts {
          margin: ${theme.space.default} 0;
        }

        h2 {
          font-size: ${theme.heading.size.h2};
          line-height: ${theme.heading.lineHeight.h2};
          font-weight: ${theme.heading.weight};
          margin: ${theme.space.stack.m};
          text-align: center;
          color: ${theme.color.neutral.gray.j};
        }

        h3 {
          font-size: ${theme.heading.size.h3};
          line-height: ${theme.heading.lineHeight.h3};
          margin: 0 0 ${theme.space.xs} 0;
        }

        .posts-container {
          display: flex;
          flex-direction: column;
          gap: ${theme.space.s};
          max-width: 100%;
        }

        .post-item {
          display: flex;
          border-radius: ${theme.size.radius.default};
          overflow: hidden;
          background: ${theme.color.neutral.white};
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          transition: all ${theme.time.duration.default};
          margin-bottom: ${theme.space.s};
        }

        .post-item:hover {
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
        }

        .post-image {
          flex: 0 0 120px;
          height: 90px;
        }

        .post-image :global(a),
        .post-image :global(.gatsby-image-wrapper) {
          height: 100%;
          width: 100%;
        }

        .post-content {
          flex: 1;
          padding: ${theme.space.xs};
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .post-meta {
          font-size: ${theme.font.size.xs};
          color: ${theme.color.neutral.gray.j};
          margin-top: auto;
        }

        .post-meta span {
          display: flex;
          align-items: center;
        }

        .post-meta :global(svg) {
          margin-right: ${theme.space.xs};
          fill: ${theme.color.brand.primary};
        }

        .view-all-links {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: ${theme.space.m};
        }

        .view-all-tags {
          text-align: left;
        }

        .view-all-posts {
          text-align: right;
        }

        .view-all-tags :global(a),
        .view-all-posts :global(a) {
          color: ${theme.color.brand.primary};
          font-size: ${theme.font.size.s};
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          transition: all ${theme.time.duration.default};
        }

        .view-all-tags :global(a:hover),
        .view-all-posts :global(a:hover) {
          color: ${theme.color.brand.primaryDark};
        }

        .view-all-tags :global(svg),
        .view-all-posts :global(svg) {
          margin-left: ${theme.space.xs};
          transition: transform ${theme.time.duration.default};
        }

        .view-all-tags :global(a:hover svg),
        .view-all-posts :global(a:hover svg) {
          transform: translateX(4px);
        }

        @from-width tablet {
          .posts-container {
            margin-top: ${theme.space.l};
          }

          .post-item {
            margin-bottom: ${theme.space.m};
          }

          .post-image {
            flex: 0 0 180px;
            height: 120px;
          }

          .post-content {
            padding: ${theme.space.s};
          }
        }

        @from-width desktop {
          .post-content {
            padding: ${theme.space.m};
          }
        }
      `}</style>
    </React.Fragment>
  );
};

RecentPosts.propTypes = {
  theme: PropTypes.object.isRequired,
  posts: PropTypes.array.isRequired,
};

export default RecentPosts;
