export function createUpdateReaction<State>(): UpdateReaction<State> {
  return (state: State, update: Partial<State>) => ({ ...state, ...update });
}

export type UpdateReaction<State> = (s: State, u: Partial<State>) => State;
export type WithUpdateReaction<State> = {
  update: UpdateReaction<State>;
};
