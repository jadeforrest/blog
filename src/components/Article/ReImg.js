import { Link, graphql, StaticQuery } from 'gatsby';
import React from 'react';
import theme from "../../theme/theme.yaml";

const ReImg = (props) => {
    // Simple image rendering since we removed Sharp
    const src = props.src || "";
    
    const imgStyle = {
        position: 'relative',
        top: 0,
        left: (props.meme ? '15%' : '0'),
        margin: '2.5em 0',
        width: (props.width ? props.width : '100%'),
        display: 'block',
        borderRadius: theme.size.radius.default,
        overflow: 'hidden'
    }

    return (
        <a href={props.href || src} target="_blank" rel="noopener noreferrer">
            <div className="imgContainer">
                <img
                    src={src}
                    title={props.title}
                    alt={props.alt || props.title || ""}
                    style={imgStyle} 
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
};

export default ReImg;