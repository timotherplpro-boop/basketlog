import MemberArea from "../../components/MemberArea";

// Mêmes habillage et barre de navigation que les pages /app (les fiches de match y vivaient avant).
export default function NbaLayout({ children }) {
  return <MemberArea>{children}</MemberArea>;
}
