import { Link } from "react-router-dom";
import { REFERENCE_CARDS } from "../data/reference-cards";

const CLASS_LABEL: Record<"A" | "B", string> = {
  A: "Class A — the model doesn't know this word",
  B: "Class B — documented across multiple speakers",
};

export function ReferenceCardsPage() {
  return (
    <section className="page" aria-labelledby="reference-heading">
      <h1 id="reference-heading">Reference cards</h1>
      <p className="lede">
        Read one of these sentences aloud (or drop a recording of yourself reading one) on the{" "}
        <Link to="/">listen page</Link>. Each one is built to show a specific, evidenced kind of mismatch — never a
        judgment on how you said it.
      </p>
      <p className="status-note">
        <strong>Class A</strong> — a rare word or name the model has never learned, so it guesses wrong for anyone
        who says it. <strong>Class B</strong> — one specific, recurring mix-up the probe measured across multiple
        speakers and both models, with no match in its control group. Everything else the model gets wrong has no
        established pattern yet, and pitman says so rather than guessing why.
      </p>

      <ul className="card-list">
        {REFERENCE_CARDS.map((card) => (
          <li key={card.id} className="ref-card" data-testid="reference-card">
            <span className={`diff-chip ${card.evidenceClass === "A" ? "diff-sub" : "diff-ins"}`}>
              {CLASS_LABEL[card.evidenceClass]}
            </span>
            <p className="ref-card-sentence">&ldquo;{card.sentence}&rdquo;</p>
            <p className="ref-card-explanation">{card.explanation}</p>
            <p className="ref-card-citation">
              <em>{card.citation}</em>
            </p>
            <Link className="ref-card-try" to={`/?meant=${encodeURIComponent(card.sentence)}`}>
              Try this on the listen page →
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
