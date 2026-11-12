import type { ComponentProps } from "react";
import { describe, expect, it } from "vitest";
import { NaeilHeader, type NaeilHeaderProps, type NaeilServiceHeaderProps } from "../../../components/naeil-header";
import { NaeilHeader as ProviderHeader, type NaeilHeaderProps as ProviderHeaderProps, type NaeilServiceHeaderProps as ProviderServiceHeaderProps } from "../../../naeil-locale/chrome";

interface ExtendedHeaderProps extends NaeilHeaderProps { consumerName: string }
interface ExtendedProviderHeaderProps extends ProviderHeaderProps { consumerName: string }
type HeaderProps = ComponentProps<typeof NaeilHeader>;
type ProviderProps = ComponentProps<typeof ProviderHeader>;

describe("public header prop compatibility", () => {
  it("keeps the legacy interface extensible and Omit preserves legacy keys", () => {
    const legacy: ExtendedHeaderProps = { locale: "en", consumerName: "Legacy", brandSuffix: "Home", className: "custom" };
    const provider: ExtendedProviderHeaderProps = legacy;
    const omitted: Omit<NaeilHeaderProps, "locale"> = { brandSuffix: "Home", statusSlot: "Ready", className: "custom" };
    const providerOmitted: Omit<ProviderHeaderProps, "locale"> = omitted;
    const element = <NaeilHeader {...legacy} />;
    expect(provider.brandSuffix).toBe("Home");
    expect(providerOmitted.brandSuffix).toBe("Home");
    expect(element.props.className).toBe("custom");
  });
  it("exports strict service types and component props through both public entries", () => {
    const service: NaeilServiceHeaderProps = { locale: "en", service: "home" };
    const providerService: ProviderServiceHeaderProps = service;
    const props: HeaderProps = service;
    const providerProps: ProviderProps = providerService;
    const elements = [<NaeilHeader {...props} key="standalone" />, <ProviderHeader {...providerProps} key="provider" />];
    expect(elements.map(element => element.props.service)).toEqual(["home", "home"]);
  });
  it("rejects service escape hatches in object literals and JSX on both entries", () => {
    // @ts-expect-error service ids must come from the lowercase catalog
    const unknown: HeaderProps = { locale: "en", service: "Home" };
    // @ts-expect-error service branding cannot be overridden
    const suffix: HeaderProps = { locale: "en", service: "home", brandSuffix: "Home" };
    // @ts-expect-error service styles cannot be overridden
    const frame: ProviderProps = { locale: "en", service: "home", className: "custom" };
    // @ts-expect-error the exported service type rejects catalog overrides
    const catalog: NaeilServiceHeaderProps = { locale: "en", service: "home", showProjects: true };
    // @ts-expect-error provider service types also reject brand overrides
    const providerSuffix: ProviderServiceHeaderProps = { locale: "en", service: "home", brandSuffix: "Home" };
    // @ts-expect-error the legacy interface remains restricted to omitted service
    const legacyService: NaeilHeaderProps = { locale: "en", service: "home" };
    // @ts-expect-error JSX must reject service brand overrides
    const badSuffix = <NaeilHeader locale="en" service="home" brandSuffix="Home" />;
    // @ts-expect-error JSX must reject service style overrides
    const badFrame = <NaeilHeader locale="en" service="home" className="custom" />;
    // @ts-expect-error provider JSX must reject service brand overrides
    const badProviderSuffix = <ProviderHeader locale="en" service="home" brandSuffix="Home" />;
    // @ts-expect-error provider JSX must reject service style overrides
    const badProviderFrame = <ProviderHeader locale="en" service="home" className="custom" />;
    expect([unknown, suffix, frame, catalog, providerSuffix, legacyService, badSuffix, badFrame, badProviderSuffix, badProviderFrame]).toHaveLength(10);
  });
});
