import React from 'react';
import theme from "../../theme/theme.yaml";
import { StaticQuery, graphql } from "gatsby";
import { GatsbyImage, getImage } from 'gatsby-plugin-image';
import ReImg from "./ReImg";

const ReTracedSVGGallery = (props) => {
    return (
        <StaticQuery
        query={graphql`
          query ReTracedSVGGalleryQuery {
            allFile(
                filter: {
                  name: {
                    regex: "/^(?!.*(-meme|meme-|spacex))/"
                  },
                  relativePath: { regex: "/.*(jpg|jpeg|png)/" },
                  sourceInstanceName: { regex: "/(posts)/" }
                },
                sort: { name: DESC }
              ) {
                edges {
                  node {
                    id
                    absolutePath
                    childImageSharp {
                        gatsbyImageData(
                            width: 800,
                            height: 360,
                            transformOptions: {
                                cropFocus: CENTER,
                            },
                            quality: 90,
                            placeholder: BLURRED
                        )
                    }
                  }
                }
              }
          }
        `}
        render={data => {

            return (
                <>
                    {data.allFile.edges.map((item,i) =>
                        <ReImg
                            key={`svggal${i}`}
                            fluid={item.node.childImageSharp.gatsbyImageData}
                            hovereffect={true}
                        />
                    )}
                </>
            )
            
        }}
        />
    )
}

export default ReTracedSVGGallery