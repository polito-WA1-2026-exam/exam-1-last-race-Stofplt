function ExecutionStep({ step }) {
  if (!step) {
    return null;
  }

  return (
    <li>
      {step.fromStation} - {step.toStation}
    </li>
  );
}

export default ExecutionStep;
