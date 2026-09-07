import { Link } from "react-router-dom";
import { REFERENCE_CARDS } from "../data/reference-cards";

const CLASS_LABEL: Record<"A" | "B", string> = {
  A: "class A · vocabulary gap",
  B: "class B · documented across speakers",
};

export function ReferenceCardsPage() {
  return (
    <div className="page stack gap-6">
      <header className="stack gap-4 section">
        <p className="eyebrow">practice sentences · every one from the probe</p>
        <h1 className="display">Sentences with a known answer</h1>
        <p className="lede">
          Read one aloud on the <Link to="/">listen page</Link>, or drop a recording. Each is a real sentence from the
          probe, chosen because a specific, evidenced kind of mismatch has already been measured on it — never
          because of how anyone said it.
        </p>
      </header>

      <div className="grid-2">
        <article className="card">
          <p className="card-tag">
            <span className="tab-dot dot-A" aria-hidden="true" />
            class A
          </p>
          <p className="prose">
            A rare word or name the model never learned, so it guesses wrong for anyone who says it.
          </p>
        </article>
        <article className="card">
          <p className="card-tag">
            <span className="tab-dot dot-B" aria-hidden="true" />
            class B
          </p>
          <p className="prose">
            One recurring mix-up measured across multiple speakers and both models, with no match in the control
            group. Anything else has no established pattern, and pitman says so rather than guessing.
          </p>
        </article>
      </div>

      <ul className="card-list">
        {REFERENCE_CARDS.map((card) => (
          <li key={card.id} className="card" data-testid="reference-card">
            <p className="card-tag">
              <span className={`tab-dot dot-${card.evidenceClass}`} aria-hidden="true" />
              {CLASS_LABEL[card.evidenceClass]}
            </p>
            <p className="ref-card-sentence">&ldquo;{card.sentence}&rdquo;</p>
            <p className="ref-card-explanation">{card.explanation}</p>
            <p className="ref-card-citation">{card.citation}</p>
            <Link className="ref-card-try" to={`/?meant=${encodeURIComponent(card.sentence)}`}>
              Try this <span aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
