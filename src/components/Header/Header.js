import { Link } from "gatsby";
import PropTypes from "prop-types";
import React from "react";
import VisibilitySensor from "react-visibility-sensor";
import { FaHome } from "react-icons/fa/";

import { ScreenWidthContext } from "../../layouts";
import config from "../../../content/meta/config";
import Menu from "../Menu";

import avatar from "../../images/jpg/avatar.jpg";

class Header extends React.Component {
  state = {
    fixed: false,
    scrollDirection: "up",
    prevScrollY: 0,
  };

  componentDidMount() {
    if (typeof window !== "undefined") {
      window.addEventListener("scroll", this.handleScroll);
    }
  }

  componentWillUnmount() {
    if (typeof window !== "undefined") {
      window.removeEventListener("scroll", this.handleScroll);
    }
  }

  handleScroll = () => {
    const currentScrollY = window.scrollY;
    const { prevScrollY, scrollDirection } = this.state;

    // Only change direction if we've scrolled at least 5px in the new direction
    // This prevents rapid toggling when scrolling small amounts
    if (
      (currentScrollY > prevScrollY + 5 && scrollDirection !== "down") ||
      (currentScrollY < prevScrollY - 5 && scrollDirection !== "up")
    ) {
      this.setState({
        scrollDirection: currentScrollY > prevScrollY ? "down" : "up",
      });
    }

    this.setState({
      prevScrollY: currentScrollY,
    });
  };

  visibilitySensorChange = (val) => {
    if (val) {
      this.setState({ fixed: false });
    } else {
      this.setState({ fixed: true });
    }
  };

  getHeaderSize = () => {
    const fixed = this.state.fixed ? "fixed" : "";
    const homepage = this.props.path === "/" ? "homepage" : "";
    return "fixed"; // `${fixed} ${homepage}` (Change me if you want a more "lively" navbar)
  };

  render() {
    const { path, theme } = this.props;
    const { fixed, scrollDirection } = this.state;

    return (
      <React.Fragment>
        <header className={`header ${this.getHeaderSize()}`}>
          <Link to="/" className="logoType">
            <div className="logo">
              <img
                src={config.gravatarImgMd5 == "" ? avatar : config.gravatarImgMd5}
                alt={config.siteTitle}
              />
            </div>
            <div className="type">
              <div className="h1menu">{config.headerTitle} </div>
              <div className="h2menu">{config.headerSubTitle}</div>
            </div>
            <div className="home-icon">
              <FaHome />
            </div>
          </Link>
          <ScreenWidthContext.Consumer>
            {(width) => <Menu path={path} fixed={fixed} screenWidth={width} theme={theme} />}
          </ScreenWidthContext.Consumer>
        </header>
        {!path.startsWith("/wiki/") && (
          <div className={`availability-container ${scrollDirection === "down" ? "hide" : ""}`}>
            <Link to="/about/" className="availability">
              Availability: waiting list for interim roles, available for advising, individual and
              group coaching
            </Link>
          </div>
        )}
        <VisibilitySensor onChange={this.visibilitySensorChange}>
          <div className="sensor" />
        </VisibilitySensor>

        {/* --- STYLES --- */}
        <style jsx>{`
          .header {
            z-index: 5;
            padding-bottom: 0px !important;
            align-items: center;
            justify-content: center;
            background-color: ${theme.color.neutral.white};
            display: flex;
            height: ${theme.header.height.default};
            position: relative;
            top: 0;
            width: 100%;
            align-items: center;

            :global(a.logoType) {
              align-items: center;
              display: flex;
              flex-direction: "column";
              color: ${theme.text.color.primary};

              .home-icon {
                margin-right: ${theme.space.xs};
                display: flex;
                align-items: center;
                font-size: ${theme.font.size.s};
                color: ${theme.text.color.primary};
              }

              .logo {
                flex-shrink: 0;
              }
            }

            &.homepage {
              position: absolute;
              background-color: transparent;
              height: ${theme.header.height.homepage};
            }
          }

          .h1menu {
            font-size: ${theme.font.size.m};
            font-weight: ${theme.font.weight.standard};
            margin: ${theme.space.stack.xs};
          }

          .h2menu {
            font-weight: ${theme.font.weight.standard};
            font-size: ${theme.font.size.xxs};
            letter-spacing: 0;
            margin: 0;
          }

          .logo {
            border-radius: ${theme.size.radius.small};
            border: 1px solid #eee;
            display: inline-block;
            height: 44px;
            margin: ${theme.space.inline.default};
            overflow: hidden;
            width: 44px;
            transition: all 0.5s;

            .homepage & {
              height: 60px;
              width: 60px;
            }

            img {
              width: 100%;
            }
          }

          .availability-container {
            display: flex;
            justify-content: center;
            background-color: ${theme.color.neutral.white};
            border-bottom: 1px solid ${theme.color.neutral.gray.c};
            padding: ${theme.space.xs} 0;
            position: relative;
            z-index: 4;
            max-height: 2rem;
            overflow: hidden;
            transition: max-height 0.3s ease, padding 0.3s ease, opacity 0.3s ease;
            opacity: 1;

            &.hide {
              max-height: 0;
              padding: 0;
              opacity: 0;
              border-bottom: none;
            }

            :global(a.availability) {
              font-size: 0.75em;
              color: #6b8a7d; /* greyish green */
              text-decoration: none;
              text-align: center;
              max-width: 90%;

              &:hover {
                text-decoration: underline;
              }
            }
          }

          .sensor {
            display: block;
            position: absolute;
            bottom: 0;
            z-index: 1;
            left: 0;
            right: 0;
            height: 1px;
            top: ${path === "/" ? theme.header.height.homepage : theme.header.height.default};
          }

          @from-width tablet {
            .header {
              padding: ${theme.space.inset.l};

              &.homepage {
                height: ${theme.header.height.homepage};
              }
            }
          }

          @below desktop {
            :global(a.logoType) {
              visibility: hidden;
            }
            .availability-container {
              display: none;
            }
            .header.homepage {
              .logo {
                border: none;
              }

              :global(a.logoType),
              h1 {
                color: ${theme.color.neutral.white};
              }
              h2 {
                color: ${theme.color.neutral.gray.d};
              }
            }
          }

          @from-width desktop {
            .header {
              align-items: center;
              background-color: ${theme.color.neutral.white};
              display: flex;
              position: absolute;
              top: 0;
              width: 100%;
              justify-content: space-between;
              transition: padding 0.5s;
            }

            .header.fixed {
              height: ${theme.header.height.fixed};
              background-color: ${theme.color.neutral.white};
              left: 0;
              padding: 0 ${theme.space.m};
              position: fixed;
              top: 0;
              width: 100%;
              border-bottom: 2px solid ${theme.color.menu.border};
            }

            .header.fixed {
              height: ${theme.header.height.fixed};
              background-color: ${theme.color.neutral.white};
              left: 0;
              padding: 0 ${theme.space.m};
              position: fixed;
              top: 0;
              width: 100%;
              z-index: 5;
            }

            .header.fixed + .availability-container {
              position: fixed;
              top: ${theme.header.height.fixed};
              left: 0;
              right: 0;
              z-index: 4;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

              &.hide {
                box-shadow: none;
              }
            }

            .header.fixed h1 {
              margin: ${theme.space.stack.xxs};
            }

            .header.fixed h2 {
              display: none;
            }

            .header.homepage:not(.fixed) {
              :global(a.logoType),
              h1 {
                color: ${theme.color.neutral.white};
              }
              h2 {
                color: ${theme.color.neutral.gray.d};
              }
            }
            .header :global(a.logoType) {
              text-align: left;
              flex-direction: row;
              flex-shrink: 0;
              width: auto;

              .home-icon {
                margin-right: ${theme.space.xs};
              }
            }

            .logo {
              margin: ${theme.space.inline.default};

              .fixed & {
                height: 36px;
                width: 36px;
              }

              .header.homepage:not(.fixed) & {
                border: none;
              }
            }

            h2 {
              animation-duration: ${theme.time.duration.default};
              animation-name: h2Entry;
            }

            @keyframes h2Entry {
              from {
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }
          }
        `}</style>
      </React.Fragment>
    );
  }
}

Header.propTypes = {
  path: PropTypes.string.isRequired,
  theme: PropTypes.object.isRequired,
};

export default Header;
