import React from "react";
import { graphql, StaticQuery } from "gatsby";
import theme from "../theme/theme.yaml";
import Article from "../components/Article";
import Headline from "../components/Article/Headline";
import Seo from "../components/Seo";
import { FaEnvelope } from "react-icons/fa";
import sarah from "../images/png/sarah.png";
import config from "../../content/meta/config";

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

              <a
                href="https://rubick.ck.page/products/engineering-leadership-course"
                target="_blank"
                rel="noreferrer"
                className="subContainer2"
              >
                <span className="subIcon">
                  <FaEnvelope />
                </span>
                <span className="subText">Get Engineering Leadership Weekly</span>
                <span className="ctaSubtext">Supporter Edition</span>
              </a>

              <a href="/" className="subContainerFree">
                <span className="subIcon">
                  <FaEnvelope />
                </span>
                <span className="subText">Get the Free Version</span>
                <span className="ctaSubtext">Standard Edition</span>
              </a>

              <p>
                The newsletter basically feeds you most of the content from my blog, but on a weekly
                schedule.
              </p>

              <img src={sarah} className="charity" width="100%" />
              <p></p>

              <h2>About the newsletter</h2>

              <dl>
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
              </dl>

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

                dl {
                  line-height: ${theme.font.lineHeight.xxl};
                  margin: 0 0 1.5em;
                  margin-bottom: 40px;
                }

                dt {
                  margin-top: 30px;
                  font-weight: bold;
                  font-size: ${theme.font.size.m};
                  line-height: 1.4;
                }

                dd {
                  margin-top: 12px;
                  font-size: ${theme.font.size.s};
                  line-height: ${theme.font.lineHeight.xxl};
                }

                .subContainer2 {
                  display: inline-block;
                  border-radius: 12px;
                  padding: 24px 32px;
                  margin-right: 30px;
                  margin-bottom: 20px;
                  min-width: 300px;
                  border: none;
                  background: linear-gradient(135deg, ${theme.color.special.attention}, #d86519);
                  box-shadow: 0 6px 20px rgba(227, 114, 34, 0.25),
                    inset 0 1px 0 rgba(255, 255, 255, 0.2);
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
                    box-shadow: 0 8px 25px rgba(227, 114, 34, 0.35),
                      inset 0 1px 0 rgba(255, 255, 255, 0.3);
                    background: linear-gradient(135deg, #f5832a, ${theme.color.special.attention});

                    .subText {
                      transform: scale(1.02);
                    }
                    .subIcon :global(svg) {
                      transform: scale(1.1);
                    }
                  }

                  :active {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 15px rgba(227, 114, 34, 0.3);
                  }
                }

                .subText {
                  text-align: center;
                  font-size: 20px;
                  font-weight: ${theme.font.weight.bold};
                  color: ${theme.color.neutral.white};
                  margin-top: 12px;
                  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
                  letter-spacing: 0.5px;
                  transition: all 0.2s ease;
                  text-transform: uppercase;
                }

                .subIcon {
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

                .subContainerFree {
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

                    .subText {
                      color: ${theme.color.brand.primaryDark};
                      transform: scale(1.02);
                    }
                    .subIcon :global(svg) {
                      fill: ${theme.color.brand.primaryDark};
                      transform: scale(1.1);
                    }
                  }

                  :active {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
                  }

                  .subText {
                    text-align: center;
                    font-size: 20px;
                    font-weight: ${theme.font.weight.bold};
                    color: ${theme.color.brand.primary};
                    margin-top: 12px;
                    display: block;
                    text-transform: uppercase;
                    transition: all 0.2s ease;
                  }

                  .subIcon {
                    display: block;
                    text-align: center;
                    font-size: 48px;
                    margin-bottom: 12px;
                    :global(svg) {
                      fill: ${theme.color.brand.primary};
                      transition: transform 0.2s ease;
                    }
                  }

                  .ctaSubtext {
                    color: ${theme.color.neutral.gray.g};
                    text-shadow: none;
                  }
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
