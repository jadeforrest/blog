import React from "react";
import { graphql, StaticQuery } from "gatsby";
import theme from "../theme/theme.yaml";
import Article from "../components/Article";
import Headline from "../components/Article/Headline";
import Seo from "../components/Seo";
import { FaTag, FaRss, FaPaperPlane, FaLinkedin } from "react-icons/fa";
import Butterfly from "../images/svg-icons/butterfly.svg";
import config from "../../content/meta/config";
import SubscribeLink from "../components/SubscribeLink";

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

              <SubscribeLink
                href="https://rubick.ck.page/subscribe"
                icon={<FaPaperPlane />}
                text="Free Course"
              />

              <SubscribeLink
                href="https://rubick.ck.page/products/engineering-leadership-course"
                icon={<FaPaperPlane />}
                text="Paid course"
                highlighted
              />

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

              <SubscribeLink href="../rss.xml" icon={<FaRss />} text="RSS" />

              <SubscribeLink
                href="https://bsky.app/profile/jaderubick.bsky.social"
                icon={<Butterfly className="butterflyIcon" />}
                text="Bluesky"
              />

              <SubscribeLink
                href="https://rubick.ck.page/subscribe"
                icon={<FaPaperPlane />}
                text="Email"
              />

              <SubscribeLink
                href="https://www.linkedin.com/in/jaderubick/"
                icon={<FaLinkedin />}
                text="LinkedIn"
              />

              <style jsx>{`
                p {
                  font-size: ${theme.font.size.s};
                  line-height: ${theme.font.lineHeight.xxl};
                  margin: 0 0 1.5em;
                  margin-bottom: 40px;
                }
              `}</style>
            </Article>
            <Seo pageTitle="Subscribe" pathname={props.location.pathname} />
          </React.Fragment>
        );
      }}
    />
  );
};

export default SubscribePage;
