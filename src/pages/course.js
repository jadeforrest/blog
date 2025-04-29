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
              >
                <section className="subContainer2">
                  <span className="subIcon">
                    <FaSeedling />
                  </span>
                  <span className="subText">Frontline management bootcamp</span>
                </section>
              </a>

              <p>
                This is a paid course delivered via newsletter. It's designed for engineering
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
                  are optional, and it's up to you to decide which you want to integrate into your
                  management practice. For example, there is an assignment to set up your support
                  network, with some suggestions for how to do so. You don't have to do any of them,
                  but you'll probably find it helpful.
                </dd>

                <dt>Are there assessments or quizzes with this course?</dt>
                <dd>No. The course does not have any assessments.</dd>

                <dt>Is there any interaction with other students?</dt>
                <dd>
                  Not currently. I did have a Slack community for participants, but we haven't had a
                  critical mass yet.
                </dd>

                <dt>I can't afford your course, but really want to take it</dt>
                <dd>
                  <a href="/contact/">Contact me!</a> I'll set you up.
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
                  You can, but if you're thinking about that, I would just sign up for the course.
                  At the end of the course, you will automatically transition into receiving the
                  newsletter. You will get a few duplicate emails, but not many.
                </dd>

                <dt>If I pay for the course and don't like it, can I get a refund?</dt>
                <dd>
                  Yes, I provide refunds with no questions asked, for two months after the course
                  starts. <a href="/contact/">Contact me</a>.
                </dd>

                <dt>Is it annoying to unsubscribe if I'm finished with it?</dt>
                <dd>Every email has an unsubscribe link in it. It should be super easy.</dd>

                <dt>How do I give you feedback on any of the course content?</dt>
                <dd>You can reply to any email and I'll read it. I really appreciate feedback!</dd>

                <dt>How relevant is this content for non-engineering managers and leaders?</dt>
                <dd>
                  The Frontline Management course is very engineering focused. It's best suited for
                  engineering managers, though some content may be applicable to other technical
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
            <Seo pageTitle="Management Course" />
          </React.Fragment>
        );
      }}
    />
  );
};

export default CoursePage;
