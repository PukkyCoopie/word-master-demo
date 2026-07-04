/**
 * @param {string} resolvedWord
 * @param {{ viaButton: boolean, appliedWord: string | null }} session
 * @param {string | null | undefined} pendingChargeWord
 * @returns {boolean}
 */
export function shouldChargeHintOnSuccessfulSubmit(resolvedWord, session, pendingChargeWord) {
  const word = String(resolvedWord ?? "").toLowerCase().trim();
  if (!word) return false;
  const applied = String(session.appliedWord ?? "").toLowerCase().trim();
  const pending = String(pendingChargeWord ?? "").toLowerCase().trim();
  return (
    (session.viaButton && !!applied && word === applied) ||
    (!!pending && word === pending)
  );
}
