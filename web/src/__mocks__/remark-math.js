// Mock for remark-math
module.exports = function remarkMath() {
  return function transformer(tree) {
    // Mock implementation that does nothing
    return tree;
  };
};

module.exports.default = module.exports;