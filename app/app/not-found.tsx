import Link from "next/link";
import { Mascot } from "@/components/ui";
export default function NotFound() {
  return (
    <div className="empty-state">
      <Mascot pose="404" size={240} />
      <h1>Hier ist noch kein Zimmer.</h1>
      <p>Zurück zu den Menschen, die schon da sind.</p>
      <Link className="button button-mango" href="/">
        Zum Clubhaus →
      </Link>
    </div>
  );
}
