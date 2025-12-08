import React from "react";
import PropTypes from "prop-types";
import { Link } from "gatsby";
import { currDate } from "../../utils/helpers";
import { FaTag, FaCalendar } from "react-icons/fa";

/**
 * Meta component that displays post metadata like date, author, and tags
 * @component
 * @param {Object} props - Component props
 * @param {string} [props.author] - Author name
 * @param {string[]} [props.tags] - Array of post tags
 * @param {Object} props.theme - Theme object for styling
 * @param {string} [props.lastEdit] - Last edit date
 * @param {string} [props.prefix] - Date prefix, defaults to current date
 * @returns {React.ReactElement} Meta component
 */
const Meta = (props) => {
  const { tags, theme } = props;
  const prefix = props.prefix || currDate(); /* Intent: get date placeholder for viewing drafts. */

  return (
    <p className="meta">
      <span>
        <FaCalendar size={18} /> {prefix}
      </span>

      {/* <span>
        <FaUser size={18} /> {authorName}
      </span> */}

      {tags &&
        tags.map((tag) => (
          <span key={tag}>
            <Link to={`/tag/${tag.split(" ").join("-")}`}>
              <span>
                <FaTag size={18} />
                {tag}
              </span>
            </Link>
          </span>
        ))}

      {/* --- STYLES --- */}
      <style jsx>{`
        .meta {
          display: flex;
          flex-flow: row wrap;
          font-size: 0.8em;
          margin: ${theme.space.m} 0;
          background: transparent;
          color: ${theme.color.neutral.gray.j};

          :global(svg) {
            fill: ${theme.text.color.accent.purple};
            margin: ${theme.space.inline.xs};
          }
          span {
            align-items: center;
            display: flex;
            text-transform: uppercase;
            margin: ${theme.space.xs} ${theme.space.s} ${theme.space.xs} 0;
          }
        }
        @from-width tablet {
          .meta {
            margin: ${`calc(${theme.space.m} * 1.5) 0 ${theme.space.m}`};
          }
        }
        @media (hover: hover) {
          .meta {
            :global(a svg) {
              transition: all 0.5s ease-in-out;
              -webkit-transition: all 0.5s ease-in-out;
              -moz-transition: all 0.5s ease-in-out;
            }
            :global(a:hover svg) {
              transition: all 0.5s ease-in-out;
              -webkit-transition: all 0.5s ease-in-out;
              -moz-transition: all 0.5s ease-in-out;
              transform: scale(1.3);
              color: ${theme.text.color.accent.gold};
            }
          }
        }
      `}</style>
    </p>
  );
};

Meta.propTypes = {
  author: PropTypes.string,
  tags: PropTypes.arrayOf(PropTypes.string),
  theme: PropTypes.object.isRequired,
  lastEdit: PropTypes.string,
  prefix: PropTypes.string,
};

export default Meta;
