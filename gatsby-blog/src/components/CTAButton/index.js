import React from "react";
import PropTypes from "prop-types";
import theme from "../../theme/theme.yaml";

const CTAButton = ({ href, icon, mainText, subText, variant = "primary", isExternal = true }) => {
  const linkProps = isExternal ? { target: "_blank", rel: "noreferrer" } : {};

  return (
    <>
      <a
        href={href}
        {...linkProps}
        className={variant === "primary" ? "ctaButtonPrimary" : "ctaButtonSecondary"}
      >
        <span className="ctaIcon">{icon}</span>
        <span className="ctaText">{mainText}</span>
        <span className="ctaSubtext">{subText}</span>
      </a>

      <style jsx>{`
        .ctaButtonPrimary {
          display: inline-block;
          border-radius: 12px;
          padding: 24px 32px;
          margin-right: 30px;
          margin-bottom: 20px;
          min-width: 300px;
          border: none;
          background: linear-gradient(135deg, ${theme.color.special.attention}, #d86519);
          box-shadow: 0 6px 20px rgba(227, 114, 34, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2);
          cursor: pointer;
          transition: all 0.2s ease;
          transform: translateY(0);
          position: relative;
          text-decoration: none;

          &::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border-radius: 12px;
            background: linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.1),
              rgba(255, 255, 255, 0.05)
            );
            pointer-events: none;
          }

          :hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(227, 114, 34, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3);
            background: linear-gradient(135deg, #f5832a, ${theme.color.special.attention});

            .ctaText {
              transform: scale(1.02);
            }
            .ctaIcon :global(svg) {
              transform: scale(1.1);
            }
          }

          :active {
            transform: translateY(-1px);
            box-shadow: 0 4px 15px rgba(227, 114, 34, 0.3);
          }
        }

        .ctaButtonSecondary {
          display: inline-block;
          border-radius: 12px;
          padding: 24px 32px;
          margin-right: 30px;
          margin-bottom: 20px;
          min-width: 300px;
          width: 463px;
          max-width: 100%;
          border: 2px solid ${theme.color.brand.primary};
          background: ${theme.color.neutral.white};
          cursor: pointer;
          transition: all 0.2s ease;
          transform: translateY(0);
          text-decoration: none;

          :hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
            border-color: ${theme.color.brand.primaryDark};

            .ctaText {
              color: ${theme.color.brand.primaryDark};
              transform: scale(1.02);
            }
            .ctaIcon :global(svg) {
              fill: ${theme.color.brand.primaryDark};
              transform: scale(1.1);
            }
          }

          :active {
            transform: translateY(-1px);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
          }

          .ctaText {
            color: ${theme.color.brand.primary};
          }

          .ctaIcon :global(svg) {
            fill: ${theme.color.brand.primary};
          }

          .ctaSubtext {
            color: ${theme.color.neutral.gray.g};
            text-shadow: none;
          }
        }

        .ctaText {
          text-align: center;
          font-size: 20px;
          font-weight: ${theme.font.weight.bold};
          color: ${theme.color.neutral.white};
          margin-top: 12px;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          letter-spacing: 0.5px;
          transition: all 0.2s ease;
          text-transform: uppercase;
          display: block;
        }

        .ctaIcon {
          display: block;
          text-align: center;
          font-size: 48px;
          margin-bottom: 12px;
          :global(svg) {
            fill: ${theme.color.neutral.white};
            transition: transform 0.2s ease;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
          }
        }

        .ctaSubtext {
          display: block;
          text-align: center;
          font-size: 14px;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.9);
          margin-top: 4px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
          text-transform: none;
          letter-spacing: 0.3px;
        }

        @media (max-width: 600px) {
          .ctaButtonPrimary,
          .ctaButtonSecondary {
            display: block;
            width: 100%;
            max-width: 100%;
            min-width: unset;
            margin-right: 0;
            margin-bottom: 16px;
            padding: 20px 20px;
          }
        }
      `}</style>
    </>
  );
};

CTAButton.propTypes = {
  href: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  mainText: PropTypes.string.isRequired,
  subText: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(["primary", "secondary"]),
  isExternal: PropTypes.bool,
};

export default CTAButton;
