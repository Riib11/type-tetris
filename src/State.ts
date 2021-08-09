import { TypeVariable } from "typescript";
import { Term, Type, HoleId, VariableId, TypeVariableId } from "./language/Syntax";
import { infer, Inference, Context, isSubtype } from "./Typing";

type State = {
  term: Term;
  type: Type;
  focus: Focus | undefined;
};

type Focus = {
  id:  HoleId;
  type: Type;
  context: Context;
  transitions: Transition[]; 
}

type Transition
  = { case: "select"; id: HoleId; }
  | { case: "put"; put: Put }
;

type Put
  = { case: "unit" }
  | { case: "variable"; id: VariableId }
  | { case: "abstraction"; domain: Type; id: VariableId }
  | { case: "application" }

// Update

export function update(state: State, transition: Transition): State {
  switch (transition.case) {
    case "select": {
      let inference: Inference = infer(state.term);
      let holeContext = inference.holeContexts.get(transition.id) as Context;
      let holeType = inference.holeTypes.get(transition.id) as Type;

      // calculate available transitions from state focussed on this hole
      let transitions: Transition[] = [];

      // produce fresh type/term variable ids
      let freshVariableId: VariableId = inference.maxVariableId + 1;
      let freshTypeVariableId: TypeVariableId = inference.maxTypeVariableId + 1;
      let freshHoleId: HoleId = inference.maxHoleId + 1;

      // basic constructors
      switch (holeType.case) {
        case "unit": {
          transitions.push({ case: "put", put: {case: "unit"} });
          transitions.push({ case: "put", put: {case: "application"} });
          break;
        }
        case "arrow": {
          transitions.push({ case: "put", put: {case: "abstraction", domain: holeType.domain, id: freshVariableId}});
          transitions.push({ case: "put", put: {case: "application"}});
          break;
        }
        case "variable": {
          transitions.push({ case: "put", put: {case: "unit"}});
          transitions.push({ case: "put", put: {case: "abstraction", domain: {case: "variable", id: freshTypeVariableId}, id: freshVariableId}});
          transitions.push({ case: "put", put: {case: "application" } });
          break;
        }
      }

      // variable constructors
      holeContext.forEach((type, id) => {
        if (isSubtype(holeContext, type, holeType)) {
          transitions.push({ case: "put", put: { case: "variable", id } });
        }
      });

      // hole selections
      getHoleIds(state.term).forEach(id => {
        transitions.push({ case: "select", id });
      });

      // new state
      return {
        term: state.term,
        type: state.type,
        focus: {
          id:  transition.id,
          type: holeType,
          context: holeContext,
          transitions
        }
      };
    }
    
    case "put": {
      // must have focus in order to "put"
      let focus: Focus = state.focus as Focus;

      
      // inference
      let inference = infer(state.term);
      let freshHoleId = inference.maxHoleId + 1;
      
      // fill hole
      let term;
      switch (transition.put.case) {
        case "unit": {
          term = fillHole(state.term, focus.id, {case: "unit"});
          break;
        }
        case "variable": {
          term = fillHole(state.term, focus.id, {case: "variable", id: transition.put.id});
          break;
        }
        case "abstraction": {
          let body: Term = {case: "hole", id: freshHoleId};
          term = fillHole(state.term, focus.id, {case: "abstraction", id: transition.put.id, domain: transition.put.domain, body});
          break;
        }
        case "application": {
          let applicant: Term = {case: "hole", id: freshHoleId};
          let argument:  Term = {case: "hole", id: freshHoleId+1};
          term = fillHole(state.term, focus.id, {case: "application", applicant, argument});
          break;
        }
      }
      if (term !== undefined) {
        let inference = infer(term);
        // new state
        return {
          term: term,
          type: inference.type,
          focus: undefined // unfocus
        }  
      } else {
        throw new Error("impossible");
      }
    }
  }
}

// Holes

function getHoleIds(term: Term): HoleId[] {
  let holeIds: HoleId[] = [];
  function go(term: Term): void {
    switch (term.case) {
      case "unit": break;
      case "variable": break;
      case "abstraction": go(term.body); break;
      case "application": go(term.applicant); go(term.argument); break;
      case "hole": holeIds.push(term.id); break;
    }    
  }
  go(term);
  return holeIds;
}

function fillHole(term: Term, id:  HoleId, termFill: Term): Term {
  function go(term: Term): Term {
    switch (term.case) {
      case "unit": return term;
      case "variable": return term;
      case "abstraction": return { case: "abstraction", id: term.id, domain: term.domain, body: go(term.body) };
      case "application": return { case: "application", applicant: go(term.applicant), argument: go(term.argument) };
      case "hole": return termFill;
    }
  }
  return go(term);
}

