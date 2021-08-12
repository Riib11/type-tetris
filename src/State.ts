import { toArray } from "./data/List";
import { HoleId, holeIdToString, Term, termToString, Type, typeToString, VariableId, variableIdToString } from "./language/Syntax";
import { collectHoleContexts, Context, contextToString, infer, Inference, extractHoleType } from "./language/Typing";

export type State = {
  term: Term;
  type: Type;
  focus: Focus | undefined;
};

export type Focus = {
  id: HoleId;
  type: Type;
  context: Context;
  transitions: Transition[]; 
}

export type Transition
  = { case: "select"; id: HoleId; }
  | { case: "put"; put: Put }
;

export type Put
  = { case: "unit" }
  | { case: "variable"; id: VariableId }
  | { case: "abstraction" }
  | { case: "application" }
  | { case: "pair" }
  | { case: "proj1" }
  | { case: "proj2" }

export function stateToString(state: State): string {
  return `term: ${termToString(state.term)}; type: ${typeToString(state.type)}; focus: ${focusToString(state.focus)}`;
}

export function focusToString(focus: Focus | undefined): string {
  if (focus !== undefined) {
    return `id: ${focus.id}; type: ${typeToString(focus.type)}; context: ${contextToString(focus.context)}; transitions: ${focus.transitions.map(t => transitionToString(t)).join(", ")}`;
  } else 
    return "unfocussed"
}

export function transitionToString(transition: Transition): string {
  switch (transition.case) {
    case "select": {
      return `select hole id ${transition.id}`;
    }
    case "put": {
      return `put ${putToString(transition.put)}`;
    }
  }
}

export function putToString(put: Put): string {
  switch (put.case) {
    case "unit": return `unit`;
    case "variable": return variableIdToString(put.id);
    case "abstraction": return `λ ?`;
    case "application": return `? ?`;
    case "pair": return `(? , ?)`
    case "proj1": return `π₁ ?`
    case "proj2": return `π₂ ?`
  }
}

// Update

export function update(state: State, transition: Transition): State {
  switch (transition.case) {
    case "select": {
      // Infer hole type and context
      let inference: Inference = infer(state.term);
      let holeType: Type = extractHoleType(inference.termAnn, transition.id);
      let holeContexts: Map<HoleId, Context> = collectHoleContexts(inference.termAnn);
      {
        let arr: string[] = [];
        holeContexts.forEach((context, id) => arr.push(`${holeIdToString(id)}: ${contextToString(context)}`));
      }
      let holeContext: Context;
      {
        let res = holeContexts.get(transition.id);
        if (res !== undefined)
          holeContext = res;
        else {
          throw new Error(`hole id ${transition.id} not found among hole contexts`);
        }
      }

      // Collect transitions
      let transitions: Transition[] = [];
      let putOptions: Put[] = [];
      // Basic constructors
      putOptions.push({case: "unit"});
      putOptions.push({case: "application"});
      putOptions.push({case: "abstraction"});
      putOptions.push({case: "pair"});
      putOptions.push({case: "proj1"});
      putOptions.push({case: "proj2"});
      // Variable constructors
      toArray(holeContext).forEach((_, id) =>
        putOptions.push({case: "variable", id})
      );
      putOptions.forEach(put => {
        let fillTerm: Term;
        switch (put.case) {
          case "unit": fillTerm = {case: "unit"}; break;
          case "variable": fillTerm = {case: "variable", id: put.id}; break;
          case "abstraction": fillTerm = {case: "abstraction", body: {case: "hole", id: -1}}; break;
          case "application": fillTerm = {case: "application", applicant: {case: "hole", id: -1}, argument: {case: "hole", id: -1}}; break;
          case "pair": fillTerm = {case: "pair", part1: {case: "hole", id: -1}, part2: {case: "hole", id: -1}}; break;
          case "proj1": fillTerm = {case: "proj1", argument: {case: "hole", id: -1}}; break;
          case "proj2": fillTerm = {case: "proj2", argument: {case: "hole", id: -1}}; break;
        }
        let term: Term = fillHole(state.term, transition.id, fillTerm);
        term = enumerateHoles(term);
        try {
          infer(term);
          // if succeeds, then add
          transitions.push({case: "put", put});
        } catch (e) {
          // pass
          console.log(`failed inference: ${e}`);
        }
      });

      // New state
      return {
        term: state.term,
        type: inference.type,
        focus: {
          id: transition.id,
          type: holeType,
          context: holeContext,
          transitions
        }
      };
    }
    case "put": {
      // must have focus in order to "put"
      let focus: Focus = state.focus as Focus;
      let fillTerm: Term;
      switch (transition.put.case) {
        case "unit": fillTerm = {case: "unit"}; break;
        case "variable": fillTerm = {case: "variable", id: transition.put.id}; break;
        case "abstraction": fillTerm = {case: "abstraction", body: {case: "hole", id: -1}}; break;
        case "application": fillTerm = {case: "application", applicant: {case: "hole", id: -1}, argument: {case: "hole", id: -1}}; break;
        case "pair": fillTerm = {case: "pair", part1: {case: "hole", id: -1}, part2: {case: "hole", id: -1}}; break;
        case "proj1": fillTerm = {case: "proj1", argument: {case: "hole", id: -1}}; break;
        case "proj2": fillTerm = {case: "proj2", argument: {case: "hole", id: -1}}; break;
      }
      let term: Term = fillHole(state.term, focus.id, fillTerm);
      term = enumerateHoles(term);
      let inference: Inference = infer(term);
      return {
        term,
        type: inference.type,
        focus: undefined,
      };
    }
  }

  throw new Error("unimplemented");
}

export function fillHole(term: Term, id:HoleId, termFill: Term): Term {
  switch (term.case) {
    case "unit": return term;
    case "variable": return term;
    case "abstraction": return {case: "abstraction", body: fillHole(term.body, id, termFill)};
    case "application": return {case: "application", applicant: fillHole(term.applicant, id, termFill), argument: fillHole(term.argument, id, termFill)};
    case "pair": return {case: "pair", part1: fillHole(term.part1, id, termFill), part2: fillHole(term.part2, id, termFill)};
    case "proj1": return {case: "proj1", argument: fillHole(term.argument, id, termFill)};
    case "proj2": return {case: "proj2", argument: fillHole(term.argument, id, termFill)};
    case "hole": {
      if (term.id === id)
        return termFill;
      else 
        return term;
    }
  }
}

export function enumerateHoles(term: Term): Term {
  let freshHoleId = 0;
  function freshHole(): Term {
    let term: Term = {case: "hole", id: freshHoleId};
    freshHoleId++;
    return term;
  }
  function go(term: Term): Term {
    switch (term.case) {
      case "unit": return term;
      case "variable": return term;
      case "abstraction": return {case: "abstraction", body: go(term.body)};
      case "application": return {case: "application", applicant: go(term.applicant), argument: go(term.argument)};
      case "pair": return {case: "pair", part1: go(term.part1), part2: go(term.part2)};
      case "proj1": return {case: "proj1", argument: go(term.argument)};
      case "proj2": return {case: "proj2", argument: go(term.argument)};
      case "hole": return freshHole();
    }
  }
  term = go(term);
  return term;
}