import React, { useState, useEffect } from "react";

/**
 * Enhanced ReImg component for responsive image loading
 * - Uses WebP format with fallback to original
 * - Generates responsive srcset for multiple sizes
 * - Includes width/height to prevent layout shift
 * - Lazy loading enabled
 */

const ReImg = ({ src, alt, title, width, height, href }) => {
  const [metadata, setMetadata] = useState({});

  useEffect(() => {
    // Load image metadata on mount
    fetch("/image-metadata.json")
      .then((r) => r.json())
      .then((data) => setMetadata(data[src] || {}))
      .catch(() => {
        // Metadata not available, component will work without dimensions
      });
  }, [src]);
  if (!src) {
    console.warn("ReImg: No src provided");
    return null;
  }

  // Extract path components
  const baseName = src.replace(/\.(jpg|jpeg|png|gif|webp)$/i, "");
  const ext = src.match(/\.(jpg|jpeg|png|gif|webp)$/i)?.[0] || "";

  // Get dimensions from props, metadata, or leave undefined
  const imgWidth = width || metadata.width;
  const imgHeight = height || metadata.height;

  // Responsive sizes for WebP versions (640, 960, 1280)
  const sizes = [640, 960, 1280];
  const webpSources = sizes.map((size) => {
    const webpSrc = `${baseName}-${size}.webp`;
    return `${webpSrc} ${size}w`;
  }).join(", ");

  const imgStyle = {
    margin: "2.5em 0",
    width: "100%",
    height: "auto",
    display: "block",
    borderRadius: "4px",
  };

  const linkHref = href || src;

  return (
    <a href={linkHref} target="_blank" rel="noopener noreferrer">
      <div className="img-container">
        <picture>
          {/* WebP sources with responsive sizes */}
          <source
            type="image/webp"
            srcSet={webpSources}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 800px"
          />
          {/* Fallback to original image */}
          <img
            src={src}
            alt={alt || title || ""}
            title={title}
            width={imgWidth}
            height={imgHeight}
            loading="lazy"
            style={imgStyle}
          />
        </picture>
      </div>
    </a>
  );
};

export default ReImg;
