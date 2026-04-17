const reactInternalConfig = require("./react-internal");

module.exports = {
  ...reactInternalConfig,
  extends: [...reactInternalConfig.extends, "next/core-web-vitals"],
};
