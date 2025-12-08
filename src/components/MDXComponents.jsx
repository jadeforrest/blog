import ReImg from "./markdown/ReImg.jsx";

// Map custom HTML elements to React components
// This makes these components available in all MDX files without imports
export const components = {
  "re-img": ReImg,
};

export default components;
