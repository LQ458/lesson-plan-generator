// Mock for react-markdown
import React from "react";

const ReactMarkdown = ({ children, remarkPlugins, components, ...props }) => {
  // Filter out props that shouldn't be passed to DOM elements
  const domProps = Object.keys(props).reduce((acc, key) => {
    if (
      !key.startsWith("remark") &&
      !key.startsWith("rehype") &&
      key !== "components"
    ) {
      acc[key] = props[key];
    }
    return acc;
  }, {});

  return React.createElement(
    "div",
    { "data-testid": "react-markdown", ...domProps },
    children,
  );
};

export default ReactMarkdown;
