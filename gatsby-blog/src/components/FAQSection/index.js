import React from "react";
import PropTypes from "prop-types";
import theme from "../../theme/theme.yaml";

const FAQSection = ({ children, variant = "default" }) => {
  return (
    <>
      <dl className="faqSection">{children}</dl>

      <style jsx>{`
        .faqSection {
          line-height: ${theme.font.lineHeight.xxl};
          margin: 0 0 1.5em;
          margin-bottom: 40px;
        }

        .faqSection :global(dt) {
          margin-top: ${variant === "compact" ? "20px" : "30px"};
          font-weight: bold;
          font-size: ${variant === "compact" ? theme.font.size.s : theme.font.size.m};
          line-height: ${variant === "compact" ? "1" : "1.4"};
        }

        .faqSection :global(dd) {
          margin-top: ${variant === "compact" ? "20px" : "12px"};
          font-size: ${variant === "compact" ? theme.font.size.xs : theme.font.size.s};
          line-height: ${theme.font.lineHeight.xxl};
        }
      `}</style>
    </>
  );
};

FAQSection.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(["default", "compact"]),
};

export default FAQSection;
