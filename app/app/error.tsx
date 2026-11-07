"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty-state">
      <h1>Kurze Pause im Clubhaus.</h1>
      <p>Diese Seite konnte gerade nicht geladen werden.</p>
      <button className="button button-mango" onClick={reset}>
        Noch einmal versuchen
      </button>
    </div>
  );
}
