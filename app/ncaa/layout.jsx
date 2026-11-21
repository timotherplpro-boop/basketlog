import MemberArea from "../../components/MemberArea";

// Même habillage que les pages /app et /nba (barre de navigation, espace membre).
export default function NcaaLayout({ children }) {
  return <MemberArea>{children}</MemberArea>;
}
