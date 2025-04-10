import React from 'react';
import theme from "../../theme/theme.yaml";
import { StaticQuery, graphql } from "gatsby";
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
                sort: {
                  fields: [name]
                  order: [DESC]
                }
              ) {
                edges {
                  node {
                    id
                    absolutePath
                    publicURL
                  }
                }
              }
          }
        `}
        render={data => {

            return (
                <>
                    {data.allFile.edges.map((item,i) => (
                        <img 
                            key={`svggal${i}`}
                            src={item.node.publicURL}
                            alt=""
                            style={{ 
                                width: '100%', 
                                margin: '15px 0', 
                                transition: 'all 0.3s',
                                ':hover': {
                                    transform: 'scale(1.1)'
                                }
                            }}
                        />
                    ))}
                </>
            )
            
        }}
        />
    )
}

export default ReTracedSVGGallery