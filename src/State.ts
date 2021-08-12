import { items } from "./data/LinkedMap";
import { HoleName, holeNameToString, Term, termToString, Type, typeToString, VariableName, variableNameToString, makePlaceholderHole, makePlaceholderVariableName, enumerateHoles, VariableLabel, relabel } from "./language/Syntax";
import { Context, contextToString, getHoleContext, getHoleType, infer } from "./language/Typing";

export type State = {
  term: Term;
  type: Type;
  focus: Focus | undefined;
};

export type Focus = {
  name: HoleName;
  type: Type;
  context: Context;
  transitions: Transition[]; 
}

export type Transition
  = { case: "select"; name: HoleName; }
  | { case: "put"; put: Put }
  | { case: "relabel", name: VariableName, label: VariableLabel }
;

export type Put
  = { case: "unit" }
  | { case: "variable"; name: VariableName }
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
    return `id: ${focus.name}; type: ${typeToString(focus.type)}; context: ${contextToString(focus.context)}; transitions: ${focus.transitions.map(t => transitionToString(t)).join(", ")}`;
  } else 
    return "unfocussed"
}

export function transitionToString(transition: Transition): string {
  switch (transition.case) {
    case "select": return `select hole ${holeNameToString(transition.name)}`;
    case "put": return `put ${putToString(transition.put)}`;
    case "relabel": return `relabel ${variableNameToString(transition.name)} to ${transition.label}`;
  }
}

export function putToString(put: Put): string {
  switch (put.case) {
    case "unit": return `unit`;
    case "variable": return variableNameToString(put.name);
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
      let inference = infer(state.term);
      let holeContext = getHoleContext(transition.name, inference);
      let holeType = getHoleType(transition.name, inference);

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
      items(holeContext).forEach(item =>  putOptions.push({case: "variable", name: item[0]}));
      // Filter valid putOptions
      putOptions.forEach(put => {
        let fillTerm = generateFillTerm(put);
        let term = fillHole(state.term, transition.name, fillTerm);
        enumerateHoles(term);
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
          name: transition.name,
          type: holeType,
          context: holeContext,
          transitions
        }
      };
    }
    case "put": {
      // must have focus in order to "put"
      let focus = state.focus as Focus;
      let fillTerm = generateFillTerm(transition.put);
      let term = fillHole(state.term, focus.name, fillTerm);
      enumerateHoles(term);
      let inference = infer(term);
      return {
        term,
        type: inference.type,
        focus: undefined,
      };
    }
    case "relabel": {
      relabel(transition.name, transition.label, state.term);
      return {
        term: state.term,
        type: state.type,
        focus: undefined
      }
    }
  }
}

export function generateFillTerm(put: Put): Term {
  switch (put.case) {
    case "unit": return {case: "unit"};
    case "variable": return {case: "variable", name: put.name};
    case "abstraction": return {case: "abstraction", name: makePlaceholderVariableName(), body: makePlaceholderHole()};
    case "application": return {case: "application", applicant: makePlaceholderHole(), argument: makePlaceholderHole()};
    case "pair": return {case: "pair", proj1: makePlaceholderHole(), proj2: makePlaceholderHole()};
    case "proj1": return {case: "proj1", argument: makePlaceholderHole()};
    case "proj2": return {case: "proj2", argument: makePlaceholderHole()};
  }
}

export function fillHole(term: Term, name:HoleName, termFill: Term): Term {
  switch (term.case) {
    case "unit": return term;
    case "variable": return term;
    case "abstraction": return {case: "abstraction", name: term.name, body: fillHole(term.body, name, termFill)};
    case "application": return {case: "application", applicant: fillHole(term.applicant, name, termFill), argument: fillHole(term.argument, name, termFill)};
    case "pair": return {case: "pair", proj1: fillHole(term.proj1, name, termFill), proj2: fillHole(term.proj2, name, termFill)};
    case "proj1": return {case: "proj1", argument: fillHole(term.argument, name, termFill)};
    case "proj2": return {case: "proj2", argument: fillHole(term.argument, name, termFill)};
    case "hole": return term.name === name ? termFill : term;
  }
}

