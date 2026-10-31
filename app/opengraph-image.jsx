import { ogImage, OG_SIZE } from "../lib/og";

export const alt = "Basketlog : analyse les matchs NBA et EuroLeague avant qu'ils commencent";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OG() {
  return ogImage("fr");
}
