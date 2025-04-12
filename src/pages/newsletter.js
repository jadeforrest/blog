import React from "react";
import { graphql, StaticQuery } from "gatsby";
import theme from "../theme/theme.yaml";
import Article from "../components/Article";
import Headline from "../components/Article/Headline";
import Seo from "../components/Seo";
import { FaEnvelope } from "react-icons/fa";
import config from "../../content/meta/config";

const NewsletterPage = props => {

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
      render={ queryResults => {
        const emailSubLink = queryResults.site.siteMetadata.emailSubLink
        return (
          <React.Fragment>
            <Article theme={theme}>
              <header>
                <Headline title="Engineering Leadership Weekly" theme={theme} />
              </header>

              <p>I offer a weekly newsletter on leadership:</p>

              <a href="https://rubick.ck.page/products/engineering-leadership-course" target="_blank">
                <section className="subContainer2">
                  <span className="subIcon"><FaEnvelope /></span>
                  <span className="subText">Engineering leadership weekly</span>
                </section>
              </a>

              <p>This newsletter is offered as paid or <a href="/">free</a>. It covers a wide range of 
              topics for engineering, product, and design leaders. This contains most of the writing on rubick.com,
              sent once a week to your email.</p>

              <h2>About the newsletter</h2>

              <dl>
                <dt>What is the format for this newsletter?</dt>
                <dd>It is an email-based newsletter sent weekly.</dd>

                <dt>How is the paid version of Engineering Leadership Weekly different than the free version?</dt>
                <dd>The paid version includes a 1-1 session with me, and also supports my
                  writing. If you're able to do the paid version, please do. This newsletter 
                  is something I do because I want people to pass on the things I've learned. 
                  I can make much better money doing other work. So this helps make it 
                  financially viable.
                </dd>

                <dt>Where do I sign up for the free version?</dt>
                <dd>It is on the <a href="/">main page</a> of rubick.com</dd>

                <dt>How much email will I be receiving, and for how long?</dt>
                <dd>Engineering Leadership Weekly is a weekly email with over a year's content. 
                  <br /><br />
                  After the newsletter, you may get occasional emails, as I add additional content.
                </dd>

                <dt>Can I sign up for both the newsletter and course?</dt>
                <dd>You can, but if you're thinking about that, I would just sign up for the course. At the end of the course, you will automatically transition into receiving the newsletter.
                  You will get a few duplicate emails, but not many.
                </dd>

                <dt>If I pay for the newsletter and don't like it, can I get a refund?</dt>
                <dd>Yes, I provide refunds with no questions asked, for two months after the
                  newsletter starts. <a href="/contact/">Contact me</a>.
                </dd>

                <dt>Is it annoying to unsubscribe if I'm finished with it?</dt>
                <dd>Every email has an unsubscribe link in it. It should be super easy.
                </dd>

                <dt>How do I give you feedback on any of the newsletter content?</dt>
                <dd>You can reply to any email and I'll read it. I really appreciate feedback!
                </dd>

                <dt>How relevant is this content for non-engineering managers and leaders?</dt>
                <dd>Ironically, the Engineering Leadership Weekly is LESS engineering focused than the name suggests. 
                  Almost all the content is valuable to leaders from a design or product management background. 
                  Around half of the content could be valuable outside of a product development organization, 
                  for managers and leaders from many places. Just keep in mind you may need to adopt the content more
                  to your local situation.
                </dd>
              </dl>              

              <style jsx>{`
                p {
                  font-size: ${theme.font.size.s};
                  line-height: ${theme.font.lineHeight.xxl};
                  margin: 0 0 1.5em;
                  margin-bottom: 40px;
                }

                dl {
                  line-height: ${theme.font.lineHeight.xxl};
                  margin: 0 0 1.5em;
                  margin-bottom: 40px;                  
                }

                dt {
                  margin-top: 20px;
                  font-weight: bold;
                  font-size: ${theme.font.size.s};
                }

                dd {
                  margin-top: 20px;
                  font-size: ${theme.font.size.xs};
                }

                .subContainer2 {
                  display: inline-block;
                  border-radius: 6px;
                  padding: 10px;
                  padding-bottom: 0px;
                  margin-right: 30px;
                  margin-bottom: 20px;
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
            <Seo pageTitle="Leadership Newsletter"/>
          </React.Fragment>
        )}
      }
    />
  )
};

export default NewsletterPage;