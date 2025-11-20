import React from "react";
import { graphql, StaticQuery } from "gatsby";
import theme from "../theme/theme.yaml";
import Article from "../components/Article";
import Headline from "../components/Article/Headline";
import Seo from "../components/Seo";
import { FaSeedling } from "react-icons/fa";
import rachel from "../images/png/rachel.png";
import config from "../../content/meta/config";

const CoursePage = (props) => {
  return (
    <StaticQuery
      query={graphql`
        query EmailQuery4 {
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
                <Headline title="Frontline management course" theme={theme} />
              </header>

              <p>I offer a newsletter-based course on engineering management:</p>

              <a
                href="https://rubick.ck.page/products/management-bootcamp"
                target="_blank"
                rel="noreferrer"
                className="subContainer2"
              >
                <span className="subIcon">
                  <FaSeedling />
                </span>
                <span className="subText">Start Management Bootcamp</span>
                <span className="ctaSubtext">5-Month Course</span>
              </a>

              <p>
                This is a paid course delivered via newsletter. It&apos;s designed for engineering
                managers who are just getting started or have some experience.
              </p>

              <img src={rachel} className="charity" width="50%" />
              <p></p>

              <h2>About the course</h2>

              <dl>
                <dt>What is the format for this course?</dt>
                <dd>It is an email-based newsletter course.</dd>

                <dt>How much time does this course require?</dt>
                <dd>
                  The amount of time you devote to it depends on you.
                  <br />
                  <br />
                  The Frontline Management Bootcamp course has some assignments. But all assignments
                  are optional, and it&apos;s up to you to decide which you want to integrate into
                  your management practice. For example, there is an assignment to set up your
                  support network, with some suggestions for how to do so. You don&apos;t have to do
                  any of them, but you&apos;ll probably find it helpful.
                </dd>

                <dt>Are there assessments or quizzes with this course?</dt>
                <dd>No. The course does not have any assessments.</dd>

                <dt>Is there any interaction with other students?</dt>
                <dd>
                  Not currently. I did have a Slack community for participants, but we haven&apos;t
                  had a critical mass yet.
                </dd>

                <dt>I can&apos;t afford your course, but really want to take it</dt>
                <dd>
                  <a href="/contact/">Contact me!</a> I&apos;ll set you up.
                </dd>

                <dt>How much email will I be receiving, and for how long?</dt>
                <dd>
                  The Frontline Management Bootcamp course is delivered weekly. It is a five month
                  course.
                  <br />
                  <br />
                  After the course, you will get all the content from the Engineering Leadership
                  Weekly newsletter. That is another year plus of newsletters.
                </dd>

                <dt>Can I sign up for both the newsletter and course?</dt>
                <dd>
                  You can, but if you&apos;re thinking about that, I would just sign up for the
                  course. At the end of the course, you will automatically transition into receiving
                  the newsletter. You will get a few duplicate emails, but not many.
                </dd>

                <dt>If I pay for the course and don&apos;t like it, can I get a refund?</dt>
                <dd>
                  Yes, I provide refunds with no questions asked, for two months after the course
                  starts. <a href="/contact/">Contact me</a>.
                </dd>

                <dt>Is it annoying to unsubscribe if I&apos;m finished with it?</dt>
                <dd>Every email has an unsubscribe link in it. It should be super easy.</dd>

                <dt>How do I give you feedback on any of the course content?</dt>
                <dd>
                  You can reply to any email and I&apos;ll read it. I really appreciate feedback!
                </dd>

                <dt>How relevant is this content for non-engineering managers and leaders?</dt>
                <dd>
                  The Frontline Management course is very engineering focused. It&apos;s best suited
                  for engineering managers, though some content may be applicable to other technical
                  disciplines.
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
              `}</style>
            </Article>
            <Seo pageTitle="Management Course" pathname={props.location.pathname} />
          </React.Fragment>
        );
      }}
    />
  );
};

export default CoursePage;
