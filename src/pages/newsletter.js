import React from "react";
import { graphql, StaticQuery } from "gatsby";
import theme from "../theme/theme.yaml";
import Article from "../components/Article";
import Headline from "../components/Article/Headline";
import Seo from "../components/Seo";
import { FaEnvelope } from "react-icons/fa";
import sarah from "../images/png/sarah.png";
import CTAButton from "../components/CTAButton";
import FAQSection from "../components/FAQSection";

const NewsletterPage = (props) => {
  return (
    <StaticQuery
      query={graphql`
        query EmailQuery3 {
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
                <Headline title="Engineering Leadership Weekly" theme={theme} />
              </header>

              <p>I offer a weekly newsletter on leadership:</p>

              <CTAButton
                href="https://rubick.ck.page/products/engineering-leadership-course"
                icon={<FaEnvelope />}
                mainText="Get Engineering Leadership Weekly"
                subText="Supporter Edition"
                variant="primary"
              />

              <CTAButton
                href="/"
                icon={<FaEnvelope />}
                mainText="Get the Free Version"
                subText="Standard Edition"
                variant="secondary"
                isExternal={false}
              />

              <p>
                The newsletter basically feeds you most of the content from my blog, but on a weekly
                schedule.
              </p>

              <img src={sarah} className="charity" width="100%" />
              <p></p>

              <h2>About the newsletter</h2>

              <FAQSection>
                <dt>
                  How is the paid version of Engineering Leadership Weekly different than the free
                  version?
                </dt>
                <dd>It's not different. But the paid version supports my writing.</dd>

                <dt>Where do I sign up for the free version?</dt>
                <dd>
                  It is on the <a href="/">main page</a> of rubick.com
                </dd>

                <dt>How much email will I be receiving, and for how long?</dt>
                <dd>
                  Engineering Leadership Weekly is a weekly email with almost two weeks's content.
                  <br />
                  <br />
                  When you get to the end, you'll get less frequent emails, since I write less
                  frequently than once a week.
                </dd>

                <dt>Can I sign up for both the newsletter and course?</dt>
                <dd>
                  You can, but if you're thinking about that, I would just sign up for the course.
                  At the end of the course, you will automatically transition into receiving the
                  newsletter. You will get a few duplicate emails, but not many.
                </dd>

                <dt>If I pay for the newsletter and don't like it, can I get a refund?</dt>
                <dd>
                  Yes, I provide refunds with no questions asked, for two months after the
                  newsletter starts. <a href="/contact/">Contact me</a>.
                </dd>

                <dt>Is it annoying to unsubscribe if I'm finished with it?</dt>
                <dd>Every email has an unsubscribe link in it. It should be super easy.</dd>

                <dt>How do I give you feedback on any of the newsletter content?</dt>
                <dd>You can reply to any email and I'll read it. I really appreciate feedback!</dd>

                <dt>How relevant is this content for non-engineering managers and leaders?</dt>
                <dd>
                  Ironically, the Engineering Leadership Weekly is LESS engineering focused than the
                  name suggests. Almost all the content is valuable to leaders from a design or
                  product management background. Around half of the content could be valuable
                  outside of a product development organization, for managers and leaders from many
                  places. Just keep in mind you may need to adopt the content more to your local
                  situation.
                </dd>
              </FAQSection>

              <style jsx>{`
                p {
                  font-size: ${theme.font.size.s};
                  line-height: ${theme.font.lineHeight.xxl};
                  margin: 0 0 1.5em;
                  margin-bottom: 40px;
                }

                h2 {
                  font-size: ${theme.heading.size.h2};
                  line-height: ${theme.heading.lineHeight.h2};
                  font-weight: ${theme.heading.weight};
                  color: ${theme.color.neutral.gray.j};
                  margin: 1.5em 0 0.75em;
                }
              `}</style>
            </Article>
            <Seo pageTitle="Leadership Newsletter" pathname={props.location.pathname} />
          </React.Fragment>
        );
      }}
    />
  );
};

export default NewsletterPage;
