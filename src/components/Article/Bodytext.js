import React from "react";
import PropTypes from "prop-types";
import rehypeReact from "rehype-react";
import Icons from "../../components/About/WebPresenceIcons";
import ReImg from "./ReImg";
import ReTracedSVGGallery from "./ReTracedSVGGallery";
import PostsByTag from "../PostsByTag";
import { Link } from "gatsby";

const Bodytext = (props) => {
  const { content, theme } = props;

  // Create a wrapper for PostsByTag that has access to theme
  const PostsByTagWithTheme = (props) => <PostsByTag {...props} theme={theme} />;

  // eslint-disable-next-line new-cap
  const renderAst = new rehypeReact({
    createElement: React.createElement,
    components: {
      "re-icons": Icons,
      "re-img": ReImg,
      "re-link": Link,
      "re-tracedsvg-gallery": ReTracedSVGGallery,
      "re-posts-by-tag": PostsByTagWithTheme,
    },
  }).Compiler;

  return (
    <React.Fragment>
      {/* Render markdown with Custom Components */}
      <div className="bodytext">{renderAst(content.htmlAst)}</div>

      {/* eslint-disable-next-line react/no-unknown-property */}
      <style jsx>{`
        .bodytext {
          animation-name: bodytextEntry;
          animation-duration: 0;
          color: ${theme.color.neutral.gray.j};

          :global(blockquote) {
            border-left: 5px solid #bbbbbb;
            margin: 2.5em 0;
            padding: 0em 1.1em 0em 1.3em;
            position: relative;
            font-style: italic;
          }

          :global(h2),
          :global(h3) {
            margin: 1.5em 0 1em;
          }

          :global(h2) {
            line-height: ${theme.font.lineHeight.s};
            font-size: ${theme.font.size.l};
          }

          :global(h3) {
            font-size: ${theme.font.size.m};
            line-height: ${theme.font.lineHeight.m};
          }

          :global(p) {
            font-size: ${theme.font.size.s};
            line-height: ${theme.font.lineHeight.xxl};
            margin: 0 0 1.5em;
          }

          :global(ul) {
            list-style: circle;
            margin: 0 0 1.5em;
            padding: 0 0 0 1.5em;
            list-style-type: square;
          }
          :global(li) {
            margin: 0.7em 2em;
            font-size: ${theme.font.size.s};
          }
          :global(a) {
            font-weight: ${theme.font.weight.bold};
            color: ${theme.color.brand.primary};
            text-decoration: none;
          }
          @from-width desktop {
            :global(a:hover) {
              color: ${theme.color.brand.primaryDark};
            }
          }
          :global(a.gatsby-resp-image-link) {
            border: 0;
            display: block;
            margin: 2.5em 0;
            border-radius: ${theme.size.radius.default};
            overflow: hidden;
            border: 1px solid ${theme.line.color};
          }
          :global(:not(pre) > code.language-text) {
            background: white;
          }
          :global(code.language-text) {
            text-shadow: none;
            color: inherit;
            padding: 0.1em 0.3em 0.2em;
            border-radius: 0.1em;
          }
        }
      `}</style>
    </React.Fragment>
  );
};

Bodytext.propTypes = {
  content: PropTypes.shape({
    htmlAst: PropTypes.object.isRequired,
  }).isRequired,
  theme: PropTypes.object.isRequired,
};

export default Bodytext;
