import React from "react";
import { graphql, StaticQuery } from "gatsby";
import theme from "../theme/theme.yaml";
import Article from "../components/Article";
import Headline from "../components/Article/Headline";
import Seo from "../components/Seo";
import { FaTag, FaRss, FaPaperPlane, FaLinkedin } from "react-icons/fa";
import { FaHashtag } from "react-icons/fa6";
import config from "../../content/meta/config";

const SubscribePage = (props) => {
  return (
    <StaticQuery
      query={graphql`
        query EmailQuery {
          site {
            siteMetadata {
              emailSubLink
            }
          }
        }
      `}
      render={(queryResults) => {
        const emailSubLink = queryResults.site.siteMetadata.emailSubLink;
        return (
          <React.Fragment>
            <Article theme={theme}>
              <header>
                <Headline
                  title="Learn to build humane, effective engineering organizations"
                  theme={theme}
                />
                <meta httpEquiv="refresh" content="0; url='/'" />
              </header>

              <p>Get a weekly email course on engineering leadership!</p>

              <a href="https://rubick.ck.page/subscribe" target="_blank" rel="noreferrer">
                <section className="subContainer">
                  <span className="subIcon">
                    <FaPaperPlane />
                  </span>
                  <span className="subText">Free Course</span>
                </section>
              </a>

              <a
                href="https://rubick.ck.page/products/engineering-leadership-course"
                target="_blank"
                rel="noreferrer"
              >
                <section className="subContainer2">
                  <span className="subIcon">
                    <FaPaperPlane />
                  </span>
                  <span className="subText">Paid course</span>
                </section>
              </a>

              <p></p>

              <p>
                Each week, you receive an email that describes something useful. If you've read my
                posts in the past and learned from them, sign up!{" "}
              </p>

              <p>
                The paid version is a great use for a "professional development" budget. Pay for it
                and expense it. The paid version helps me develop more curriculum, and will have
                some other benefits.
              </p>

              <p></p>

              <p>And finally, you can follow new posts by RSS, LinkedIn, or Bluesky</p>

              <a href="../rss.xml" target="_blank" rel="noreferrer">
                <section className="subContainer">
                  <span className="subIcon">
                    <FaRss />
                  </span>
                  <span className="subText">RSS</span>
                </section>
              </a>

              <a
                href="https://bsky.app/profile/jaderubick.bsky.social"
                target="_blank"
                rel="noreferrer"
              >
                <section className="subContainer">
                  <span className="subIcon">
                    <FaHashtag />
                  </span>
                  <span className="subText">Bluesky</span>
                </section>
              </a>

              <a href="https://rubick.ck.page/subscribe" target="_blank" rel="noreferrer">
                <section className="subContainer">
                  <span className="subIcon">
                    <FaPaperPlane />
                  </span>
                  <span className="subText">Email</span>
                </section>
              </a>

              <a href="https://www.linkedin.com/in/jaderubick/" target="_blank" rel="noreferrer">
                <section className="subContainer">
                  <span className="subIcon">
                    <FaLinkedin />
                  </span>
                  <span className="subText">LinkedIn</span>
                </section>
              </a>

              <style jsx>{`
                p {
                  font-size: ${theme.font.size.s};
                  line-height: ${theme.font.lineHeight.xxl};
                  margin: 0 0 1.5em;
                  margin-bottom: 40px;
                }

                .subContainer {
                  display: inline-block;
                  border-radius: 6px;
                  padding: 10px;
                  padding-bottom: 0px;
                  margin-right: 30px;
                  min-width: 130px;
                  border: 1px solid ${theme.color.neutral.gray.d};
                  :hover {
                    border: 1px solid #ccc;
                    .subText {
                      color: ${theme.color.brand.primary};
                    }
                  }
                }

                .subContainer2 {
                  display: inline-block;
                  border-radius: 6px;
                  padding: 10px;
                  padding-bottom: 0px;
                  margin-right: 30px;
                  min-width: 130px;
                  border: 1px solid ${theme.color.neutral.gray.d};
                  background-color: ${theme.color.brand.primaryLight};
                  :hover {
                    border: 1px solid #ccc;
                    .subText {
                      color: ${theme.color.brand.primary};
                    }
                  }
                }

                .subText {
                  text-align: right;
                  font-size: 20px;
                  color: ${theme.color.neutral.gray.j};
                }

                .subIcon {
                  vertical-align: middle;
                  font-size: 40px;
                  padding-right: 10px;
                  :global(svg) {
                    fill: ${theme.color.brand.primary};
                  }
                }
              `}</style>
            </Article>
            <Seo pageTitle="Subscribe" />
          </React.Fragment>
        );
      }}
    />
  );
};

export default SubscribePage;
