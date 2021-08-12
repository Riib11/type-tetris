import { appendMap, cloneMap, items, LinkedMap, lookup } from "../data/LinkedMap";
import { collectHoleTypes, enumerateTypeVariableNames, extractType, HoleName, holeNameToString, makePlaceholderTypeVariable, Term, TermAnn, termAnnToString, termToString, Type, typeToString, VariableName, variableNameToString } from "./Syntax";
import { applySubstitutionTermAnn, Constraints, constraintsToString, Substitution, substitutionToString, unifyConstraints } from "./Unification";

// Types

export type Context = LinkedMap<VariableName, Type>;
export type Inference = {
  termAnn: TermAnn,
  type: Type,
  substitution: Substitution,
  holeContexts: Map<HoleName, Context>;
  holeTypes: Map<HoleName, Type>;
}

export function contextToString(context: Context): string {
  let res: string = items(context).map(item => `${variableNameToString(item[0])}: ${typeToString(item[1])}`).join(", ");
  return res;
}

export function getHoleContext(holeName: HoleName, inference: Inference): Context {
  let context = inference.holeContexts.get(holeName);
  if (context !== undefined)
    return context;
  else
    throw new Error(`hole ${holeNameToString(holeName)} not found in ${termAnnToString(inference.termAnn)}`);
}

export function getHoleType(holeName: HoleName, inference: Inference): Type {
  let type = inference.holeTypes.get(holeName);
  if (type !== undefined)
    return type;
  else
    throw new Error(`hole ${holeNameToString(holeName)} not found in ${termAnnToString(inference.termAnn)}`);
}


// Inference

export function infer(term: Term): Inference {
  console.log("------------------------------------------------------");
  let termAnn: TermAnn = annotate(term);
  console.log(`orig termAnn: ${termAnnToString(termAnn)}`);
  let constraints: Constraints = calculateConstraints(termAnn);
  console.log(`constraints: ${constraintsToString(constraints)}`);
  let substitution: Substitution = unifyConstraints(constraints);
  console.log(`substitution: ${substitutionToString(substitution)}`);
  termAnn = applySubstitutionTermAnn(substitution, termAnn);
  enumerateTypeVariableNames(termAnn);
  console.log(`result termAnn: ${termAnnToString(termAnn)}`);
  let type = extractType(termAnn);
  let holeContexts: Map<HoleName, Context> = collectHoleContexts(termAnn);
  let holeTypes: Map<HoleName, Type> = collectHoleTypes(termAnn);
  return {
    termAnn,
    type,
    substitution,
    holeContexts,
    holeTypes
  };
}

// Annotation

export function annotate(term: Term): TermAnn {
  console.log(`annotatingL ${termToString(term)}`);
  function go(context: Context, term: Term): TermAnn {
    switch (term.case) {
      case "unit": return {case: "unit"};
      case "variable": return {case: "variable", name: term.name, type: inferVariable(context, term.name)};
      case "abstraction": {
        let domain = makePlaceholderTypeVariable();
        let body = go(appendMap(term.name, domain, context), term.body);
        return {case: "abstraction", name: term.name, body, type: {case: "arrow", domain, codomain: extractType(body)}};
      }
      case "application": return {case: "application", applicant: go(context, term.applicant), argument: go(context, term.argument), type: makePlaceholderTypeVariable()};
      case "pair": return {case: "pair", proj1: go(context, term.proj1), proj2: go(context, term.proj2), type: makePlaceholderTypeVariable()};
      case "proj1": return {case: "proj1", argument: go(context, term.argument), type: makePlaceholderTypeVariable(), part2: makePlaceholderTypeVariable()};
      case "proj2": return {case: "proj2", argument: go(context, term.argument), type: makePlaceholderTypeVariable(), part1: makePlaceholderTypeVariable()};
      case "hole": return {case: "hole", name: term.name, type: makePlaceholderTypeVariable()};
    };
  }
  let termAnn = go({case: "nil"}, term);
  enumerateTypeVariableNames(termAnn);
  return termAnn;
}

export function calculateConstraints(termAnn: TermAnn): Constraints {
  let termAnns: TermAnn[] = [termAnn];
  let constraints: Constraints = [];
  
  // TODO: not needed because termAnn.part[1|2] -- implicit universal quantificiations
  // let freshTypeVariableName = makeFreshTypeVariableName(termAnn);
  // function makeFreshTypeVariable(): Type {
  //   let type: Type = {case: "variable", name: freshTypeVariableName};
  //   freshTypeVariableName = nextTypeVariableName(freshTypeVariableName);
  //   return type;
  // }

  while (true) {
    let termAnn = termAnns.pop();
    if (termAnn === undefined) break;
    switch (termAnn.case) {
      case "unit": break;
      case "variable": break;
      case "abstraction": termAnns.push(termAnn.body); break;
      case "application": {
        let [arrow, domain] = [extractType(termAnn.applicant), extractType(termAnn.argument)];
        termAnns.push(termAnn.argument);
        termAnns.push(termAnn.applicant);
        constraints.push([arrow, {case: "arrow", domain, codomain: extractType(termAnn)}]);
        break;
      }
      case "pair": {
        let [part1, part2] = [extractType(termAnn.proj1), extractType(termAnn.proj2)];
        termAnns.push(termAnn.proj1);
        termAnns.push(termAnn.proj2);
        constraints.push([{case: "product", part1, part2} , termAnn.type]);
        break;
      }
      case "proj1": {
        termAnns.push(termAnn.argument);
        constraints.push([extractType(termAnn.argument), {case: "product", part1: extractType(termAnn), part2: termAnn.part2}]);
        console.log(`constraint from proj1: ${constraintsToString([[{case: "product", part1: extractType(termAnn), part2: termAnn.part2}, extractType(termAnn.argument)]])}`)
        break;
      }
      case "proj2": {
        termAnns.push(termAnn.argument);
        constraints.push([{case: "product", part1: termAnn.part1, part2: extractType(termAnn)}, extractType(termAnn.argument)]);
        console.log(`constraint from proj2: ${constraintsToString([[{case: "product", part1: termAnn.part1, part2: extractType(termAnn)}, extractType(termAnn.argument)]])}`)
        break;
      }
      case "hole": break;
      default: throw new Error("impossible");
    }
  }
  return constraints.reverse();
}

export function inferVariable(context: Context, name: VariableName): Type {
  let type = lookup(context, name);
  if (type !== undefined)
    return type;
  else
    throw new Error(`variable name ${variableNameToString(name)} not found in context ${contextToString(context)}`);
}

// Holes

export function collectHoleContexts(termAnn: TermAnn): Map<HoleName, Context> {
  let holeContexts: Map<HoleName, Context> = new Map();
  function go(context: Context, termAnn: TermAnn): void {
    switch (termAnn.case) {
      case "unit": return;
      case "variable": return;
      case "abstraction": {
        switch (termAnn.type.case) {
          case "arrow": go(appendMap(termAnn.name, termAnn.type.domain, context), termAnn.body); return;
          default: throw new Error("impossible");
        }
      }
      case "application": go(context, termAnn.applicant); go(context, termAnn.argument); break;
      case "pair": go(context, termAnn.proj1); go(context, termAnn.proj2); break;
      case "proj1": go(context, termAnn.argument); return;
      case "proj2": go(context, termAnn.argument); return;
      case "hole": holeContexts.set(termAnn.name, cloneMap(context)); break;
    }
  }
  go({case: "nil"}, termAnn);
  return holeContexts;
}
