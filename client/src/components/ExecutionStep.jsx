function ExecutionStep({ step }) {
  if (!step) {
    return null;
  }

  const effect = step.event?.effect;

  return (
    <article className="execution-step d-grid gap-2">
      <div className="d-flex align-items-center justify-content-between gap-2 text-secondary">
        <span>Step {step.index}</span>
        <span>{step.line}</span>
      </div>
      <div className="d-flex align-items-center gap-2 fw-semibold">
        <span>{step.fromStation}</span>
        <span aria-hidden="true">{"->"}</span>
        <span>{step.toStation}</span>
      </div>
      <div className="d-flex align-items-center justify-content-between gap-2">
        <span>{step.event?.description ?? "Pending event"}</span>
        {effect !== undefined && (
          <strong>{effect > 0 ? `+${effect}` : effect}</strong>
        )}
      </div>
      {step.coins !== null && (
        <div className="text-body-secondary">Coins: {step.coins}</div>
      )}
    </article>
  );
}

export default ExecutionStep;
