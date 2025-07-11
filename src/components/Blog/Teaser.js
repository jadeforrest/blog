import { FaArrowRight } from "react-icons/fa/";
import { FaCalendar } from "react-icons/fa/";
import { FaTag } from "react-icons/fa/";
import { FaUser } from "react-icons/fa/";
import { GatsbyImage, getImage } from "gatsby-plugin-image";
import { Link } from "gatsby";
import PropTypes from "prop-types";
import React from "react";

/**
 * Teaser component that displays a preview of a blog post
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.theme - Theme object for styling
 * @param {Object} props.post - Post data
 * @param {string} props.post.excerpt - Post excerpt
 * @param {Object} props.post.fields - Post fields
 * @param {string} props.post.fields.slug - Post URL slug
 * @param {string} props.post.fields.prefix - Post date prefix
 * @param {Object} props.post.frontmatter - Post frontmatter
 * @param {string} props.post.frontmatter.title - Post title
 * @param {string[]} props.post.frontmatter.tags - Post tags
 * @param {Object} props.post.frontmatter.cover - Post cover image
 * @param {number} props.index - Index of the post in the list
 */
const Teaser = (props) => {
  const {
    theme,
    post: {
      excerpt,
      fields: { slug, prefix },
      frontmatter: {
        title,
        tags,
        author,
        cover: { children: [{ gatsbyImageData = null }] = [{ gatsbyImageData: null }] },
      },
    },
    index,
  } = props;

  return (
    <React.Fragment>
      <li>
        <Link to={slug} key={slug} className="link">
          <div className="gatsby-image-outer-wrapper">
            {gatsbyImageData && (
              <GatsbyImage
                image={gatsbyImageData}
                alt={title}
                loading={index == 0 ? "eager" : "lazy"}
              />
            )}
          </div>
          <h1>
            {title} <FaArrowRight className="arrow" />
          </h1>
          <p className="meta">
            <span>
              <FaCalendar size={18} /> {prefix}
            </span>
            {/* <span>
              <FaUser size={18} /> {author}
            </span> */}
            {tags &&
              tags.map((tag) => (
                <span key={tag}>
                  <FaTag size={18} /> {tag}
                </span>
              ))}
          </p>
          <p>{excerpt}</p>
        </Link>
      </li>

      {/* --- STYLES --- */}
      <style jsx>{`
        :global(.link) {
          width: 100%;
          color: ${theme.text.color.primary};
        }

        li {
          border: 1px solid transparent;
          border-radius: ${theme.size.radius.default};
          margin: ${`calc(${theme.space.default} * 2) 0 calc(${theme.space.default} * 3)`};
          padding: ${theme.space.inset.s};
          position: relative;
          transition: all ${theme.time.duration.default};
          background: transparent;

          :global(.gatsby-image-outer-wrapper) {
            border-radius: ${theme.size.radius.default};
            border: 1px solid ${theme.line.color};
            overflow: hidden;
          }
          :global(.gatsby-image-outer-wrapper img) {
            z-index: -1;
          }

          &:last-child {
            margin-bottom: 10px;
          }
        }

        li::after {
          border-top: 1px solid ${theme.line.color};
          content: "";
          height: 0;
          position: absolute;
          bottom: ${`calc(${theme.space.default} * -1.5)`};
          left: 50%;
          transform: translateX(-50%);
          transition: all ${theme.time.duration.default};
          width: 50%;
        }

        h1 {
          padding: ${theme.space.m} ${theme.space.s} 0;
          line-height: ${theme.blog.h1.lineHeight};
          font-size: ${theme.blog.h1.size};
          text-remove-gap: both;

          :global(.arrow) {
            display: none;
            position: relative;
            top: 7px;
          }
        }

        .meta {
          display: flex;
          flex-flow: row wrap;
          font-size: 0.8em;
          padding: ${theme.space.m} ${theme.space.s};
          background: transparent;

          :global(svg) {
            fill: ${theme.icon.color};
            margin: ${theme.space.inline.xs};
          }
          span {
            align-items: center;
            display: flex;
            text-transform: uppercase;
            margin: ${theme.space.xs} ${theme.space.s} ${theme.space.xs} 0;
          }
        }

        p {
          line-height: 1.5;
          padding: 0 ${theme.space.s};
          text-remove-gap: both;
        }

        @from-width tablet {
          li {
            margin: ${`calc(${theme.space.default} * 3) 0 calc(${theme.space.default} * 4)`};
            padding: ${theme.space.default};

            &::after {
              bottom: ${`calc(${theme.space.default} * -2)`};
            }

            &:first-child {
              &::before {
                top: ${`calc(${theme.space.default} * -1.75)`};
              }
            }
          }

          h1 {
            font-size: ${`calc(${theme.blog.h1.size} * 1.2)`};
            padding: ${`calc(${theme.space.default} * 1.5) ${theme.space.default} 0`};
            transition: all 0.5s;
          }
          .meta {
            padding: ${`calc(${theme.space.m} * 1.5) ${theme.space.m}`};
          }
          p {
            padding: 0 ${theme.space.default};
          }
        }
        @below desktop {
          li {
            border: 1px solid ${theme.line.color};
            box-shadow: 0px 3px 2px rgba(0, 0, 0, 0.03);
            margin-top: 20px;
            margin-bottom: 20px;

            &:first-child {
              margin-top: 0;
            }

            &::after {
              border-top: 0px;
            }
          }
        }
        @from-width desktop {
          li {
            margin: ${`calc(${theme.space.default} * 4) 0 calc(${theme.space.default} * 5)`};
            padding: 0 0 ${`calc(${theme.space.default} * 2)`};

            &::after {
              bottom: ${`calc(${theme.space.default} * -1.5)`};
            }

            &:first-child {
              &::before {
                top: ${`calc(${theme.space.default} * -2.75)`};
              }
            }
          }

          :global(.blogItemLink:first-child) > li::before {
            top: ${`calc(${theme.space.default} * -2.75)`};
          }
          h1 {
            font-size: 2.5em;
            padding: ${`calc(${theme.space.default} * 1.2) calc(${theme.space.default} * 2) 0`};
          }
          .meta {
            padding: ${`calc(${theme.space.default} * 1.5) calc(${theme.space.default} * 2)
              calc(${theme.space.default} * 0.5)`};
          }
          p {
            padding: ${`0 calc(${theme.space.default} * 2)`};
          }
          li:hover {
            border: 1px solid ${theme.line.color};
            box-shadow: 0px 3px 2px rgba(0, 0, 0, 0.03);
          }
          li:hover:after {
            bottom: ${`calc(${theme.space.default} * -2.5)`};
          }
          li {
            &:hover {
              :global(.gatsby-image-wrapper) {
                transform: scale(1.1);
              }
              h1 {
                color: ${theme.blog.h1.hoverColor};
              }
              :global(.arrow) {
                opacity: 1;
                stroke: ${theme.color.special.attention};
                transform: translateX(0);
              }
            }
            :global(.gatsby-image-wrapper) {
              transition: all ${theme.time.duration.default};
            }
            :global(.arrow) {
              display: inline-block;
              fill: ${theme.color.special.attention};
              stroke: ${theme.color.special.attention};
              stroke-width: 40;
              stroke-linecap: round;
              opacity: 0;
              transition: all 0.5s;
              transform: translateX(-50%);
            }
          }
        }
      `}</style>
    </React.Fragment>
  );
};

Teaser.propTypes = {
  theme: PropTypes.object.isRequired,
  post: PropTypes.shape({
    excerpt: PropTypes.string.isRequired,
    fields: PropTypes.shape({
      slug: PropTypes.string.isRequired,
      prefix: PropTypes.string.isRequired,
    }).isRequired,
    frontmatter: PropTypes.shape({
      title: PropTypes.string.isRequired,
      tags: PropTypes.arrayOf(PropTypes.string),
      author: PropTypes.string,
      cover: PropTypes.shape({
        children: PropTypes.arrayOf(
          PropTypes.shape({
            gatsbyImageData: PropTypes.object,
          })
        ),
      }),
    }).isRequired,
  }).isRequired,
  index: PropTypes.number.isRequired,
};

export default Teaser;
