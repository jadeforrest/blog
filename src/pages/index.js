import PropTypes from "prop-types";
import React from "react";
import { graphql } from "gatsby";
import theme from "../theme/theme.yaml";
import Article from "../components/Article";
import Headline from "../components/Article/Headline";
import Seo from "../components/Seo";
import { FaEnvelope, FaRss, FaLinkedin } from "react-icons/fa";
import charity from "../images/png/charity.png";
import Butterfly from "../images/svg-icons/butterfly.svg";
import RecentPosts from "../components/Blog/RecentPosts";
import ConvertKitForm from "../components/ConvertKitForm";

const IndexPage = (props) => {
  const { data } = props;
  const posts = data.allMarkdownRemark.edges;

  return (
    <React.Fragment>
      <Article theme={theme}>
        <header>
          <title>Learn to build humane, effective engineering organizations</title>
        </header>

        <ConvertKitForm />

        <p></p>

        <img src={charity} className="charity" width="100%" />
        <p></p>

        <RecentPosts theme={theme} posts={posts} />

        <a href="../rss.xml" target="_blank" rel="noreferrer">
          <section className="subContainer">
            <span className="subIcon">
              <FaRss />
            </span>
            <span className="subText">RSS</span>
          </section>
        </a>

        <a href="https://bsky.app/profile/jaderubick.bsky.social" target="_blank" rel="noreferrer">
          <section className="subContainer">
            <span className="subIcon">
              <Butterfly className="butterflyIcon" />
            </span>
            <span className="subText">Bluesky</span>
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
            font-size: ${theme.font.size.m};
            line-height: ${theme.font.lineHeight.xxl};
            margin: 0 0 1.5em;
            margin-bottom: 40px;
          }
          ul {
            font-size: ${theme.font.size.s};
            line-height: ${theme.font.lineHeight.xxl};
            margin: 0 0 1.5em;
            margin-bottom: 40px;
          }
          li {
            margin-left: 18px;
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

          .subText {
            color: ${theme.color.neutral.gray.j};
            margin-bottom: 18px;
          }

          .subIcon {
            vertical-align: middle;
            font-size: 40px;
            padding-right: 10px;
            :global(svg) {
              fill: ${theme.color.brand.primary};
            }
            :global(.butterflyIcon) {
              width: 1em;
              height: 1em;
            }
          }


        `}</style>
      </Article>
      <Seo pageTitle="Rubick.com" pathname={props.location.pathname} />
    </React.Fragment>
  );
};

IndexPage.propTypes = {
  data: PropTypes.object.isRequired,
};

export const query = graphql`
  query {
    allMarkdownRemark(
      filter: { fields: { source: { eq: "posts" } } }
      sort: { fields: { prefix: DESC } }
      limit: 5
    ) {
      edges {
        node {
          id
          excerpt
          fields {
            slug
            prefix
          }
          frontmatter {
            title
            cover {
              children {
                ... on ImageSharp {
                  gatsbyImageData(
                    width: 800
                    height: 360
                    transformOptions: { cropFocus: CENTER }
                    quality: 90
                    placeholder: BLURRED
                  )
                }
              }
            }
          }
        }
      }
    }
  }
`;

export default IndexPage;
