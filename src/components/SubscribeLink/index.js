import React from "react";
import PropTypes from "prop-types";
import theme from "../../theme/theme.yaml";

const SubscribeLink = ({ href, icon, text, highlighted = false, isExternal = true }) => {
  const linkProps = isExternal ? { target: "_blank", rel: "noreferrer" } : {};

  return (
    <>
      <a href={href} {...linkProps} className={highlighted ? "linkHighlighted" : "linkContainer"}>
        <span className="linkIcon">{icon}</span>
        <span className="linkText">{text}</span>
      </a>

      <style jsx>{`
        .linkContainer,
        .linkHighlighted {
          display: inline-block;
          border-radius: 6px;
          padding: 10px;
          padding-bottom: 0px;
          margin-right: 30px;
          min-width: 130px;
          border: 1px solid ${theme.color.neutral.gray.d};
          text-decoration: none;

          :hover {
            border: 1px solid #ccc;
            .linkText {
              color: ${theme.color.brand.primary};
            }
          }
        }

        .linkHighlighted {
          background-color: ${theme.color.brand.primaryLight};
        }

        .linkText {
          text-align: right;
          font-size: 20px;
          color: ${theme.color.neutral.gray.j};
          margin-bottom: 18px;
        }

        .linkIcon {
          vertical-align: middle;
          font-size: 40px;
          padding-right: 10px;
          :global(svg) {
            fill: ${theme.color.brand.primary};
          }
          :global(.butterflyIcon) {
            width: 1em;
            height: 1em;
          }
        }

        @media (max-width: 600px) {
          .linkContainer,
          .linkHighlighted {
            display: block;
            margin: 0 auto 16px auto;
            min-width: 200px;
            max-width: 300px;
            text-align: center;
          }
        }
      `}</style>
    </>
  );
};

SubscribeLink.propTypes = {
  href: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  text: PropTypes.string.isRequired,
  highlighted: PropTypes.bool,
  isExternal: PropTypes.bool,
};

export default SubscribeLink;
