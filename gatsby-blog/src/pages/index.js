import PropTypes from "prop-types";
import React from "react";
import { graphql } from "gatsby";
import theme from "../theme/theme.yaml";
import Article from "../components/Article";
import Seo from "../components/Seo";
import { FaRss, FaLinkedin } from "react-icons/fa";
import charity from "../images/png/charity.png";
import Butterfly from "../images/svg-icons/butterfly.svg";
import RecentPosts from "../components/Blog/RecentPosts";
import ConvertKitForm from "../components/ConvertKitForm";
import SubscribeLink from "../components/SubscribeLink";

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

        <SubscribeLink href="../rss.xml" icon={<FaRss />} text="RSS" />

        <SubscribeLink
          href="https://bsky.app/profile/jaderubick.bsky.social"
          icon={<Butterfly className="butterflyIcon" />}
          text="Bluesky"
        />

        <SubscribeLink
          href="https://www.linkedin.com/in/jaderubick/"
          icon={<FaLinkedin />}
          text="LinkedIn"
        />

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
        `}</style>
      </Article>
      <Seo pageTitle="Rubick.com" pathname={props.location.pathname} />
    </React.Fragment>
  );
};

IndexPage.propTypes = {
  data: PropTypes.object.isRequired,
  location: PropTypes.shape({
    pathname: PropTypes.string.isRequired,
  }).isRequired,
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
