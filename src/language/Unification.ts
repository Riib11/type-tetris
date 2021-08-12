import { concatMaps, items, LinkedMap, nilMap, singleMap } from "../data/LinkedMap";
import { TermAnn, Type, typeToString, TypeVariableName, typeVariableNameToString } from "./Syntax";

// Types

export type Constraints = [Type, Type][];
export type Substitution = LinkedMap<TypeVariableName, Type>;

export function substitutionToString(sub: Substitution): string {
  return items(sub).map(item => `${typeVariableNameToString(item[0])} := ${typeToString(item[1])}`).join(", ");
}

export function constraintsToString(constraints: Constraints): string {
  return constraints.map(item => `${typeToString(item[0])} ~ ${typeToString(item[1])}`).join(", ");
}

// Unify constraints

export function unifyConstraints(constraints: Constraints): Substitution {
  let sub: Substitution = {case: "nil"};
  constraints.forEach(item => {
    let subNew = unify(applySubstitution(sub, item[0]), applySubstitution(sub, item[1]));
    sub = concatMaps(sub, subNew);
  });
  return sub;
}

// Unify two types

export function unify(type1: Type, type2: Type): Substitution {
  switch (type1.case) {
    case "unit": {
      switch (type2.case) {
        case "unit": return {case: "nil"};
        case "variable": return singleMap(type2.name, type1);
        case "arrow": throw errorUnification(type1, type2);;
        case "product": throw errorUnification(type1, type2);;
      }
      break;
    }
    case "variable": {
      switch (type2.case) {
        case "unit": return singleMap(type1.name, type2);
        case "variable": return (type1.name === type2.name) ? nilMap() : singleMap(type1.name, type2);
        case "arrow": checkCircularity(type1.name, type2); return singleMap(type1.name, type2);
        case "product": checkCircularity(type1.name, type2); return singleMap(type1.name, type2);
      }
      break;
    }
    case "arrow": {
      switch (type2.case) {
        case "unit": throw errorUnification(type1, type2);
        case "variable": checkCircularity(type2.name, type1); return singleMap(type2.name, type1);
        case "arrow": return concatMaps(unify(type1.domain, type2.domain), unify(type2.codomain, type1.codomain));
        case "product": throw errorUnification(type1, type2);
      }
      break;
    }
    case "product": {
      switch (type2.case) {
        case "unit": throw errorUnification(type1, type2);
        case "variable": checkCircularity(type2.name, type1); return singleMap(type2.name, type1);
        case "arrow": throw new Error(`cannot unify ${typeToString(type1)} with ${typeToString(type2)}`)
        case "product": return concatMaps(unify(type1.part1, type2.part1), unify(type1.part2, type2.part2));
      }
      break;
    }
  }
  throw new Error(`impossible: ${typeToString(type1)} ~ ${typeToString(type2)}`);
}

export function errorUnification(type1: Type, type2: Type): Error {
  return new Error(`cannot unify ${typeToString(type1)} with ${typeToString(type2)}`);
}

export function checkCircularity(name: TypeVariableName, type: Type): void {
  if (occursIn(name, type))
    throw new Error(`cannot unify ${typeToString({case: "variable", name: name})} with ${typeToString(type)} because of circularity on ${typeVariableNameToString(name)}`);
}

// Checks if `name` occurs in `type`
export function occursIn(name: TypeVariableName, type: Type): boolean {
  switch (type.case) {
    case "unit": return false;
    case "variable": return name === type.name;
    case "arrow": return occursIn(name, type.domain) || occursIn(name, type.codomain);
    case "product": return occursIn(name, type.part1) || occursIn(name, type.part2);
  }
}

// Substitution

export function applySubstitutionTermAnn(sub: Substitution, termAnn: TermAnn): TermAnn {
  switch (termAnn.case) {
    case "unit": return termAnn;
    case "variable": return {case: "variable", name: termAnn.name, type: applySubstitution(sub, termAnn.type)};
    case "abstraction": return {case: "abstraction", name: termAnn.name, body: applySubstitutionTermAnn(sub, termAnn.body), type: applySubstitution(sub, termAnn.type)};
    case "application": return {case: "application", applicant: applySubstitutionTermAnn(sub, termAnn.applicant), argument: applySubstitutionTermAnn(sub, termAnn.argument), type: applySubstitution(sub, termAnn.type)};
    case "pair": return {case: "pair", proj1: applySubstitutionTermAnn(sub, termAnn.proj1), proj2: applySubstitutionTermAnn(sub, termAnn.proj2), type: applySubstitution(sub, termAnn.type)};
    case "proj1": return {case: "proj1", argument: applySubstitutionTermAnn(sub, termAnn.argument), type: applySubstitution(sub, termAnn.type), part2: applySubstitution(sub, termAnn.part2)};
    case "proj2": return {case: "proj2", argument: applySubstitutionTermAnn(sub, termAnn.argument), type: applySubstitution(sub, termAnn.type), part1: applySubstitution(sub, termAnn.part1)};
    case "hole": return {case: "hole", name: termAnn.name, type: applySubstitution(sub, termAnn.type)};
  }
}

export function substitute(name: TypeVariableName, typeNew: Type, type: Type): Type {
  switch (type.case) {
    case "unit": return type;
    case "variable": return type.name === name ? typeNew : type;
    case "arrow": return {case: "arrow", domain: substitute(name, typeNew, type.domain), codomain: substitute(name, typeNew, type.codomain)};
    case "product": return { case: "product", part1: substitute(name, typeNew, type.part1), part2: substitute(name, typeNew, type.part2)};
  }
}

export function applySubstitution(sub: Substitution, type: Type): Type {
  function go(sub: Substitution, type: Type): Type {
    switch (sub.case) {
      case "nil": return type;
      case "cons": return substitute(sub.key, sub.value, go(sub.tail, type));
    }
  }
  let typeNew = go(sub, type);
  return typeNew;
}