import indexStr from "./index.js?raw";
import packageJsonStr from "./package.json?raw";

export const files = {
  "index.js": {
    file: {
      contents: indexStr,
    },
  },
  "package.json": {
    file: {
      contents: packageJsonStr,
    },
  },
};
