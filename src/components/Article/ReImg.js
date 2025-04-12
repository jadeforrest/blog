import { Link, graphql, StaticQuery } from 'gatsby';
import { GatsbyImage, getImage } from 'gatsby-plugin-image';
import React from 'react';
import theme from "../../theme/theme.yaml";

// Helper to convert old fluid format to a compatible format for rendering
const createCompatibleImageData = (fluid) => {
  if (!fluid) return null;
  
  // This is already in gatsby-plugin-image format
  if (fluid.images && fluid.layout) {
    return fluid;
  }
  
  // If we have an old fluid object with src, let's convert it
  if (fluid.src) {
    // Return a standard img element instead of trying to convert
    return {
      type: 'fluid',
      src: fluid.src,
      srcSet: fluid.srcSet,
      base64: fluid.base64,
      aspectRatio: fluid.aspectRatio,
      sizes: fluid.sizes,
      originalImg: fluid.originalImg
    };
  }
  
  return null;
};

const ReImg = (props) => {
    // Parse the image data from props
    let imageData;
    if (props.fluid) {
        imageData = props.fluid;
    } else if (props.rehyped) {
        try {
            imageData = JSON.parse(props.rehyped);
        } catch (e) {
            // Silent error - just return undefined
            imageData = undefined;
        }
    }
    
    // Create compatible image format
    const compatibleImage = createCompatibleImageData(imageData);
    
    // Build href for links
    const href = props.href || 
                (imageData && imageData.originalImg) || 
                (props.src ? props.src : "")
    
    const relativeStyle = {
        position: 'relative',
        top: 0,
        left: (props.meme ? '15%' : '0'),
        margin: '2.5em 0',
        width: (props.width ? props.width : '100%'),
        display: 'block',
        borderRadius: theme.size.radius.default,
        overflow: 'hidden'
    }
    
    const absoluteStyle = {
        position: 'absolute',
        top: 0,
        left: 0,
        width: "100%",
        borderRadius: theme.size.radius.default,
        overflow: 'hidden'
    }

    // Direct src image (no need for image processing)
    if (props.src && !compatibleImage) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer">
                <div className="imgContainer">
                    <img
                        src={props.src}
                        title={props.title}
                        alt={props.alt || props.title || ""}
                        style={relativeStyle} 
                    />
                </div>
                <style jsx>{`
                .imgContainer {
                    position: relative;
                    top: 0;
                    left: 0;
                }
                @from-width desktop {
                    .imgContainer img {
                        transition: 300ms ease-in-out;
                    }
                    .imgContainer img:hover {
                        transform: scale(1.05);
                    }
                }
                `}</style>
            </a>
        );
    }

    // Otherwise use gatsby-plugin-image for better performance
    if (!compatibleImage) {
        return null;
    }

    // Check if we have a proper gatsbyImageData object
    if (compatibleImage.images && compatibleImage.layout) {
        // Using GatsbyImage component
        if (!props.hovereffect) {
            return (
                <a href={href} target="_blank" rel="noopener noreferrer">
                    <GatsbyImage
                        image={compatibleImage}
                        alt={props.alt || props.title || ""}
                        title={props.title}
                        style={relativeStyle}
                    />
                </a>
            );
        }
    } else if (compatibleImage.type === 'fluid') {
        // Using the old fluid format - render a standard img tag
        return (
            <a href={href} target="_blank" rel="noopener noreferrer">
                <div className="imgContainer">
                    <img
                        src={compatibleImage.src}
                        srcSet={compatibleImage.srcSet}
                        sizes={compatibleImage.sizes}
                        title={props.title}
                        alt={props.alt || props.title || ""}
                        style={relativeStyle}
                    />
                </div>
                <style jsx>{`
                .imgContainer {
                    position: relative;
                    top: 0;
                    left: 0;
                }
                @from-width desktop {
                    .imgContainer img {
                        transition: 300ms ease-in-out;
                    }
                    .imgContainer img:hover {
                        transform: scale(1.05);
                    }
                }
                `}</style>
            </a>
        );
    } else {
        // Fallback to simple image if we have props.src
        if (props.src) {
            return (
                <a href={href} target="_blank" rel="noopener noreferrer">
                    <img
                        src={props.src}
                        title={props.title}
                        alt={props.alt || props.title || ""}
                        style={relativeStyle}
                    />
                </a>
            );
        }
        return null;
    }

    // Hover effect version for gatsby-plugin-image
    return (
        <a href={href} target="_blank" rel="noopener noreferrer">
            <div className="imgContainer">
                {compatibleImage.images && compatibleImage.layout ? (
                  <GatsbyImage
                    image={compatibleImage}
                    alt={props.alt || props.title || ""}
                    title={props.title}
                    style={absoluteStyle}
                  />
                ) : (
                  <img
                    src={compatibleImage.src}
                    srcSet={compatibleImage.srcSet}
                    sizes={compatibleImage.sizes}
                    alt={props.alt || props.title || ""}
                    title={props.title}
                    style={absoluteStyle}
                  />
                )}
            </div>
            <style jsx>{`
            .imgContainer {
                position: relative;
                top: 0;
                left: 0;
            }
            @from-width desktop {
                :global(picture) {
                    transition: 300ms ease-in-out;
                }
                :global(.imgContainer > .gatsby-image-wrapper > picture):hover {
                    opacity: 0;
                }
            }
            `}</style>
        </a>
    );
};

export default ReImg;