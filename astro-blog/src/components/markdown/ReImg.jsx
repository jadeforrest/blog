import React from "react";

/**
 * Simplified ReImg component for Astro migration
 * Handles basic image display with src prop
 *
 * TODO: Add more sophisticated image handling from Gatsby version
 */
const ReImg = ({ src, alt, title, width, href }) => {
  if (!src) {
    console.warn("ReImg: No src provided");
    return null;
  }

  const imgStyle = {
    margin: "2.5em 0",
    width: width || "100%",
    display: "block",
    borderRadius: "4px",
    overflow: "hidden",
  };

  const linkHref = href || src;

  return (
    <a href={linkHref} target="_blank" rel="noopener noreferrer">
      <div className="img-container">
        <img
          src={src}
          alt={alt || title || ""}
          title={title}
          style={imgStyle}
        />
      </div>
      <style jsx>{`
        .img-container {
          position: relative;
        }
        .img-container img {
          transition: transform 300ms ease-in-out;
        }
        .img-container img:hover {
          transform: scale(1.05);
        }
      `}</style>
    </a>
  );
};

export default ReImg;
