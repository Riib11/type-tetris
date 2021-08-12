import { concatMaps, items, LinkedMap, mapMap, reverseMap, singleMap } from "../data/LinkedMap";
import { append, cloneList, List, toArray } from "../data/List";
import { extractTypes, HoleId, Term, TermAnn, termAnnToString, Type, typeToString, TypeVariableId, typeVariableIdToString, VariableId } from "./Syntax";

export type Context = List<Type>;
export type Constraints = [Type, Type][];
export type Substitution = LinkedMap<TypeVariableId, Type>;

export function contextToString(context: Context): string {
  let res: string = toArray(context).map((type, id) => `${id}: ${typeToString(type)}`).join(", ");
  return res;
}

export function constraintsToString(constraints: Constraints): string {
  return constraints.map(item => `${typeToString(item[0])} ~ ${typeToString(item[1])}`).join(", ");
}

export function substitutionToString(substitution: Substitution): string {
  return items(substitution).map(item => `${typeVariableIdToString(item[0])} := ${typeToString(item[1])}`).join(", ");
}

export function annotate(term: Term): TermAnn {
  let freshTypeVariableId = 0;
  function makeFreshTypeVariable(): Type {
    let type: Type = {case: "variable", id: freshTypeVariableId};
    freshTypeVariableId++;
    return type;
  }

  function go(context: Context, term: Term): TermAnn {
    switch (term.case) {
      case "unit": return {case: "unit"};
      case "variable": return {case: "variable", id: term.id, type: inferVariable(context, term.id)};
      case "abstraction": {
        let domain: Type = makeFreshTypeVariable();
        let body: TermAnn = go({case: "cons", head: domain, tail: context}, term.body);
        return {case: "abstraction", body, type: {case: "arrow", domain, codomain: extractType(body)}};
      }
      case "application": return {case: "application", applicant: go(context, term.applicant), argument: go(context, term.argument), type: makeFreshTypeVariable()};
      case "pair": return {case: "pair", part1: go(context, term.part1), part2: go(context, term.part2), type: makeFreshTypeVariable()};
      case "proj1": return {case: "proj1", argument: go(context, term.argument), type: makeFreshTypeVariable()};
      case "proj2": return {case: "proj2", argument: go(context, term.argument), type: makeFreshTypeVariable()};
      case "hole": return {case: "hole", id: term.id, type: makeFreshTypeVariable()};
    };
    throw new Error("impossible")
  }
  return go({case: "nil"}, term);
}

export function collectConstraints(termAnn: TermAnn): Constraints {
  let termAnns: List<TermAnn> = {case: "cons", head: termAnn, tail: {case: "nil"}};
  // let constraints: List<[Type, Type]> = {case: "nil"};
  let constraints: Constraints = [];
  
  let freshTypeVariableId = makeFreshTypeVariableId(termAnn);
  function freshTV(): Type {
    let type: Type = {case: "variable", id: freshTypeVariableId};
    freshTypeVariableId++;
    return type;
  }

  while (termAnns.case !== "nil") {
    let termAnn: TermAnn = termAnns.head;
    termAnns = termAnns.tail;
    switch (termAnn.case) {
      case "unit": break;
      case "variable": break;
      case "abstraction": {
        termAnns = append(termAnn.body, termAnns);
        break;
      }
      case "application": {
        let [f, a] = [extractType(termAnn.applicant), extractType(termAnn.argument)];
        termAnns = append(termAnn.argument, termAnns);
        termAnns = append(termAnn.applicant, termAnns);
        constraints.push([f, {case: "arrow", domain: a, codomain: extractType(termAnn)}]);
        break;
      }
      case "pair": {
        let [part1, part2] = [extractType(termAnn.part1), extractType(termAnn.part2)];
        termAnns = append(termAnn.part1, termAnns);
        termAnns = append(termAnn.part2, termAnns);
        constraints.push([{case: "product", part1, part2} , termAnn.type]);
        break;
      }
      case "proj1": {
        let part2 = freshTV();
        termAnns = append(termAnn.argument, termAnns);
        constraints.push([extractType(termAnn.argument), {case: "product", part1: extractType(termAnn), part2}]);
        break;
      }
      case "proj2": {
        let part1 = freshTV();
        termAnns = append(termAnn.argument, termAnns);
        constraints.push([extractType(termAnn.argument), {case: "product", part1, part2: extractType(termAnn)}]);
        break;
      }
      case "hole": break;
    }
  }
  return constraints.reverse();
}

export function inferVariable(context: Context, id: VariableId): Type {
  switch (context.case) {
    case "nil": throw new Error("variable id out-of-bounds");
    case "cons": {
      if (id === 0)
        return context.head;
      else
        return inferVariable(context.tail, id-1);
    }
  }
}

export type Inference = {
  termAnn: TermAnn,
  type: Type,
  substitution: Substitution,
  holeContexts: Map<HoleId, Context>;
}

export function infer(term: Term): Inference {
  // console.log("------------------------------------------------------");
  let termAnn: TermAnn = annotate(term);
  // console.log(`orig termAnn: ${termAnnToString(termAnn)}`);
  let constraints: Constraints = collectConstraints(termAnn);
  // console.log(`constraints: ${constraintsToString(constraints)}`);
  let substitution: Substitution = unifyConstraints(constraints);
  // console.log(`substitution: ${substitutionToString(substitution)}`);
  termAnn = applySubstitutionTermAnn(substitution, termAnn);
  termAnn = normalizeTypeVariableIds(termAnn);
  // console.log(`result termAnn: ${termAnnToString(termAnn)}`);
  let type = extractType(termAnn);
  let holeContexts: Map<HoleId, Context> = collectHoleContexts(termAnn);
  return {
    termAnn,
    type,
    substitution,
    holeContexts
  };
}

export function applySubstitutionTermAnn(substitution: Substitution, termAnn: TermAnn): TermAnn {
  switch (termAnn.case) {
    case "unit": return termAnn;
    case "variable": return {case: "variable", id: termAnn.id, type: applySubstitution(substitution, termAnn.type)};
    case "abstraction": return {case: "abstraction", body: applySubstitutionTermAnn(substitution, termAnn.body), type: applySubstitution(substitution, termAnn.type)};
    case "application": return {case: "application", applicant: applySubstitutionTermAnn(substitution, termAnn.applicant), argument: applySubstitutionTermAnn(substitution, termAnn.argument), type: applySubstitution(substitution, termAnn.type)};
    case "pair": return {case: "pair", part1: applySubstitutionTermAnn(substitution, termAnn.part1), part2: applySubstitutionTermAnn(substitution, termAnn.part2), type: applySubstitution(substitution, termAnn.type)};
    case "proj1": return {case: "proj1", argument: applySubstitutionTermAnn(substitution, termAnn.argument), type: applySubstitution(substitution, termAnn.type)};
    case "proj2": return {case: "proj2", argument: applySubstitutionTermAnn(substitution, termAnn.argument), type: applySubstitution(substitution, termAnn.type)};
    case "hole": return {case: "hole", id: termAnn.id, type: applySubstitution(substitution, termAnn.type)};
  }
}

export function collectHoleContexts(termAnn: TermAnn): Map<HoleId, Context> {
  let holeContexts: Map<HoleId, Context> = new Map();
  function go(context: Context, termAnn: TermAnn): void {
    switch (termAnn.case) {
      case "unit": return;
      case "variable": return;
      case "abstraction": {
        switch (termAnn.type.case) {
          case "arrow": {
            go({case: "cons", head: termAnn.type.domain, tail: context}, termAnn.body);
            return;
          }
          default: {
            throw new Error("impossible");
          }
        }
      }
      case "application": {
        go(context, termAnn.applicant);
        go(context, termAnn.argument);
        break;
      }
      case "pair": {
        go(context, termAnn.part1);
        go(context, termAnn.part2);
        break;
      }
      case "proj1": go(context, termAnn.argument); return;
      case "proj2": go(context, termAnn.argument); return;
      case "hole": holeContexts.set(termAnn.id, cloneList(context)); break;
    }
  }
  go({case: "nil"}, termAnn);
  return holeContexts;
}

export function substitute(id: TypeVariableId, typeNew: Type, type: Type): Type {
  switch (type.case) {
    case "unit": return type;
    case "variable": {
      if (type.id === id)
        return typeNew;
      else
        return type;
    }
    case "arrow": {
      return {
        case: "arrow",
        domain: substitute(id, typeNew, type.domain),
        codomain: substitute(id, typeNew, type.codomain)
      };
    }
    case "product": {
      return {
        case: "product",
        part1: substitute(id, typeNew, type.part1),
        part2: substitute(id, typeNew, type.part2)
      }
    }
  }
}

export function applySubstitution(substitution: Substitution, type: Type): Type {
  function go(substitution: Substitution, type: Type): Type {
    switch (substitution.case) {
      case "nil": return type;
      case "cons": {
        type = go(substitution.tail, type);
        type = substitute(substitution.key, substitution.value, type);
        return type;
      }
    }
  }
  type = go(substitution, type);
  return type;
}

export function unifyConstraints(constraints: Constraints): Substitution {
  let substitution: Substitution = {case: "nil"};
  constraints.forEach(item => {
    let sub = unify(applySubstitution(substitution, item[0]), applySubstitution(substitution, item[1]));
    substitution = concatMaps(substitution, sub);
  });
  return substitution;
}

export function unify(type1: Type, type2: Type): Substitution {
  switch (type1.case) {
    case "unit": {
      switch (type2.case) {
        case "unit": return {case: "nil"};
        case "variable": return singleMap(type2.id, type1);
        case "arrow": throw new Error(`cannot unify ${typeToString(type1)} with ${typeToString(type2)}`);
        case "product": throw new Error(`cannot unify ${typeToString(type1)} with ${typeToString(type2)}`);
      }
      break;
    }
    case "variable": {
      switch (type2.case) {
        case "unit": return singleMap(type1.id, type2);
        case "variable": {
          if (type1.id === type2.id)
            return {case: "nil"};
          else
            return singleMap(type1.id, type2);
        }
        case "arrow": {
          if (occursIn(type1.id, type2))
            throw new Error(`cannot unify ${typeToString(type1)} with ${typeToString(type2)} because of circularity on ${typeVariableIdToString(type1.id)}`);
          else
            return singleMap(type1.id, type2);
        }
        case "product": {
          if (occursIn(type1.id, type2))
            throw new Error(`cannot unify ${typeToString(type1)} with ${typeToString(type2)} because of circularity on ${typeVariableIdToString(type1.id)}`);
          else
            return singleMap(type1.id, type2);
        }
      }
      break;
    }
    case "arrow": {
      switch (type2.case) {
        case "unit": throw new Error(`cannot unify ${typeToString(type1)} with ${typeToString(type2)}`)
        case "variable": {
          if (occursIn(type2.id, type1))
            throw new Error(`cannot unify ${typeToString(type1)} with ${typeToString(type2)} because of circularity on ${typeVariableIdToString(type2.id)}`);
          else
            return singleMap(type2.id, type1);
        }
        case "arrow": {
          return concatMaps(
            unify(type1.domain, type2.domain),
            unify(type2.codomain, type1.codomain));
        }
        case "product": throw new Error(`cannot unify ${typeToString(type1)} with ${typeToString(type2)}`);
      }
      break;
    }
    case "product": {
      switch (type2.case) {
        case "unit": throw new Error(`cannot unify ${typeToString(type1)} with ${typeToString(type2)}`)
        case "variable": {
          if (occursIn(type2.id, type1))
            throw new Error(`cannot unify ${typeToString(type1)} with ${typeToString(type2)} because of circularity on ${typeVariableIdToString(type2.id)}`);
          else
            return singleMap(type2.id, type1);
        }
        case "arrow": throw new Error(`cannot unify ${typeToString(type1)} with ${typeToString(type2)}`)
        case "product": {
          return concatMaps(
            unify(type1.part1, type2.part1),
            unify(type1.part2, type2.part2));
        }
      }
    }
  }
  throw new Error(`impossible: ${typeToString(type1)} ~ ${typeToString(type2)}`);
}

// Checks if `id` occurs in `type`
export function occursIn(id: TypeVariableId, type: Type): boolean {
  switch (type.case) {
    case "unit": return false;
    case "variable": return id === type.id;
    case "arrow": return occursIn(id, type.domain) || occursIn(id, type.codomain);
    case "product": return occursIn(id, type.part1) || occursIn(id, type.part2);
  }
}

export function extractType(term: TermAnn): Type {
  switch (term.case) {
    case "unit": return {case: "unit"};
    case "variable": return term.type;
    case "abstraction": return term.type;
    case "application": return term.type;
    case "pair": return term.type;
    case "proj1": return term.type;
    case "proj2": return term.type;
    case "hole": return term.type;
  }
}

export function extractHoleType(termAnn: TermAnn, holeId: HoleId): Type {
  let type: Type | undefined = undefined;
  function go(termAnn: TermAnn): void {
    switch (termAnn.case) {
      case "unit": return;
      case "variable": return;
      case "abstraction": go(termAnn.body); return;
      case "application": go(termAnn.applicant); go(termAnn.argument); return;
      case "pair": go(termAnn.part1); go(termAnn.part2); return;
      case "proj1": go(termAnn.argument); return;
      case "proj2": go(termAnn.argument); return;
      case "hole": {
        if (termAnn.id === holeId)
          type = termAnn.type;
      }
    }
  }
  go(termAnn);
  if (type !== undefined)
    return type;
  else
    throw new Error(`hole id ${holeId} not found`);
}

export function makeFreshTypeVariableId(termAnn: TermAnn): TypeVariableId {
  let freshTypeVariableId = 0;
  function go(type: Type): void {
    switch (type.case) {
      case "unit": return;
      case "variable": freshTypeVariableId = Math.max(freshTypeVariableId, type.id); return;
      case "arrow": go(type.domain); go(type.codomain); return;
      case "product": go(type.part1); go(type.part2); return;
    }
  }
  extractTypes(termAnn).forEach(type => go(type));
  return freshTypeVariableId+1;
}

export function makeFreshTypeVariable(termAnn: TermAnn): Type {
  return {case: "variable", id: makeFreshTypeVariableId(termAnn)};
}

export function normalizeTypeVariableIds(termAnn: TermAnn): TermAnn {
  let substitutions: Map<TypeVariableId, TypeVariableId> = new Map();
  let freshTypeVariableId = 0;

  function goTypeVariableId(id: TypeVariableId): TypeVariableId {
    let idNew = substitutions.get(id);
    if (idNew !== undefined)
      return idNew;
    else {
      substitutions.set(id, freshTypeVariableId);
      idNew = freshTypeVariableId;
      freshTypeVariableId++;
      return idNew;
    }
  }
  
  function goType(type: Type): Type {
    switch (type.case) {
      case "unit": return {case: "unit"};
      case "variable": return {case: "variable", id: goTypeVariableId(type.id)};
      case "arrow": return {case: "arrow", domain: goType(type.domain), codomain: goType(type.codomain)};
      case "product": return {case: "product", part1: goType(type.part1), part2: goType(type.part2)};
    }
  }

  function goTermAnn(termAnn: TermAnn): TermAnn {
    switch (termAnn.case) {
      case "unit": return {case: "unit"};
      case "variable": return {case: "variable", id: termAnn.id, type: goType(termAnn.type)};
      case "abstraction": return {case: "abstraction", body: goTermAnn(termAnn.body), type: goType(termAnn.type)};
      case "application": return {case: "application", applicant: goTermAnn(termAnn.applicant), argument: goTermAnn(termAnn.argument), type: goType(termAnn.type)};
      case "pair": return {case: "pair", part1: goTermAnn(termAnn.part1), part2: goTermAnn(termAnn.part2), type: goType(termAnn.type)};
      case "proj1": return {case: "proj1", argument: goTermAnn(termAnn.argument), type: goType(termAnn.type)};
      case "proj2": return {case: "proj2", argument: goTermAnn(termAnn.argument), type: goType(termAnn.type)};
      case "hole": return {case: "hole", id: termAnn.id, type: goType(termAnn.type)};
    }
  }

  goType(extractType(termAnn));

  return goTermAnn(termAnn);
}
