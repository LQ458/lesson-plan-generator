// Mock for rehype-katex
module.exports = function rehypeKatex() {
  return function transformer(tree) {
    // Mock implementation that does nothing
    return tree;
  };
};

module.exports.default = module.exports;