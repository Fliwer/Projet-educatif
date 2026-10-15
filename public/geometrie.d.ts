import type { Illustration } from "../src/formats.ts";
export function illustrationHtml(illustration: Illustration): string;
export function figureSvg(figure: Illustration["figures"][number], options?: { sommets?: boolean }): string;
