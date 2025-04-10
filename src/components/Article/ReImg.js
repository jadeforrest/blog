import { Link, graphql, StaticQuery } from 'gatsby';
import Picture from 'gatsby-image';
import React from 'react';
import theme from "../../theme/theme.yaml";

const ReImg = (props) => {
    const fluid = (props.fluid ? props.fluid : (props.rehyped ? JSON.parse(props.rehyped) : undefined))
    const href = props.href || (fluid && fluid.originalImg) || (props.src ? props.src : "")
    
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

    // If we have a direct src and no fluid data, render a simple image
    if (props.src && !fluid) {
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

    // Otherwise use gatsby-image for better performance
    if (!fluid) return null;
    
    if (fluid.base64) delete fluid.base64; // Workaround a Gatsby bug where both "blur-up" and "tracedSVG" placeholders are shown

    if (!props.hovereffect) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer">
                <Picture
                    fluid={fluid}
                    title={props.title}
                    style={relativeStyle}
                />
            </a>
        );
    }

    return (
        <a href={href} target="_blank" rel="noopener noreferrer">
            <div className="imgContainer">
                {fluid.tracedSVG && (
                    <img
                        src={fluid.tracedSVG}
                        title={props.title}
                        style={relativeStyle} 
                    />
                )}
                <Picture
                    fluid={fluid}
                    title={props.title}
                    style={absoluteStyle}
                />
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