import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
const config = { poweredByHeader: false };
export default withNextIntl(config);
