import React from "react";
import { renderToString } from "react-dom/server";
import { ThemeFixture } from "./theme-preference";
process.stdout.write(renderToString(React.createElement(ThemeFixture)));
