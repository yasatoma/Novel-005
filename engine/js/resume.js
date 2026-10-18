export function resolveResumeIndex(commands, data = {}, state = {}) {
  const raw = Number.isInteger(data.resumeCommandIndex)
    ? data.resumeCommandIndex
    : (Number.isInteger(state.currentCommandIndex) ? state.currentCommandIndex : 0);
  let index = Math.max(0, Math.min(raw, commands.length));

  const reached = Array.isArray(state.reachedEndingIds) ? state.reachedEndingIds : [];
  const lastEndingId = reached.at(-1);
  if (!lastEndingId) return index;

  const endingIndex = commands.findIndex(command =>
    command.type === "ending" &&
    command.action === "reach" &&
    command.args?.id === lastEndingId
  );
  if (endingIndex < 0) return index;

  const target = commands[index];
  const pointsToSameEnding = target?.type === "ending" &&
    target.action === "reach" &&
    target.args?.id === lastEndingId;

  return pointsToSameEnding ? index : endingIndex;
}
