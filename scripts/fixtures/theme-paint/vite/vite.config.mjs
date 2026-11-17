import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { naeilThemeBootstrap } from "@naeil/ui/theme-bootstrap";
export default defineConfig({plugins:[tailwindcss(), {name:"naeil-theme", transformIndexHtml() { return [{tag:"script", attrs:{"data-naeil-theme-preference":""}, children:naeilThemeBootstrap, injectTo:"head-prepend"}]; }}]});
