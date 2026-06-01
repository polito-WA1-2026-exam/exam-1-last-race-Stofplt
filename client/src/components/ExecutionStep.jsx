function ExecutionStep({ step }) {
  if (!step) {
    return null;
  }

  const effect = step.event?.effect;

  return (
    <article className="execution-step">
      <div className="execution-step-header">
        <span>Step {step.index}</span>
        <span>{step.line}</span>
      </div>
      <div className="execution-route">
        <span>{step.fromStation}</span>
        <span aria-hidden="true">{"->"}</span>
        <span>{step.toStation}</span>
      </div>
      <div className="execution-event">
        <span>{step.event?.description ?? "Pending event"}</span>
        {effect !== undefined && (
          <strong>{effect > 0 ? `+${effect}` : effect}</strong>
        )}
      </div>
      {step.coins !== null && (
        <div className="execution-coins">Coins: {step.coins}</div>
      )}
    </article>
  );
}

export default ExecutionStep;
