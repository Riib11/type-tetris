import { concatMaps, items, LinkedMap, mapMap, reverseMap, singleMap } from "../data/LinkedMap";
import { append, cloneList, List, toArray } from "../data/List";
import { HoleId, Term, TermAnn, termAnnToString, Type, typeToString, TypeVariableId, typeVariableIdToString, VariableId } from "./Syntax";

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

// TODO: During inferece, get the term variable context at hole (which needs to
//       have unification substitutions applied to it).
export function annotate(term: Term): TermAnn {
  let freshTypeVariableId = 0;
  function freshTypeVariable(): Type {
    let type: Type = {case: "variable", id: freshTypeVariableId};
    freshTypeVariableId++;
    return type;
  }

  function go(context: Context, term: Term): TermAnn {
    switch (term.case) {
      case "unit": {
        return {case: "unit"};
      }
      case "variable": {
        let type = inferVariable(context, term.id);
        return {case: "variable", id: term.id, type};
      }
      case "abstraction": {
        let domain: Type = freshTypeVariable();
        let body: TermAnn = go({case: "cons", head: domain, tail: context}, term.body);
        return {case: "abstraction", body, type: {case: "arrow", domain, codomain: extractType(body)}};
      }
      case "application": {
        return {case: "application", applicant: go(context, term.applicant), argument: go(context, term.argument), type: freshTypeVariable()};
      }
      case "hole": {
        let type = freshTypeVariable();
        return {case: "hole", id: term.id, type};
      }
    };
    throw new Error("impossible")
  }
  return go({case: "nil"}, term);
}

export function collectConstraints(termAnn: TermAnn): Constraints {
  let termAnns: List<TermAnn> = {case: "cons", head: termAnn, tail: {case: "nil"}};
  let constraints: List<[Type, Type]> = {case: "nil"};
  function go(): void {
    switch (termAnns.case) {
      case "nil": return;
      case "cons": {
        let termAnn: TermAnn = termAnns.head;
        switch (termAnn.case) {
          case "unit": return;
          case "variable": return;
          case "abstraction": {
            termAnns = append(termAnn.body, termAnns);
            return;
          }
          case "application": {
            let [f, a] = [extractType(termAnn.applicant), extractType(termAnn.argument)];
            termAnns = append(termAnn.argument, termAnns);
            termAnns = append(termAnn.applicant, termAnns);
            constraints = append([f, {case: "arrow", domain: a, codomain: termAnn.type}], constraints);
          }
        }
      }
    }
  }
  go();
  return toArray(constraints);
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
      case "hole": {
        holeContexts.set(termAnn.id, cloneList(context));
        break;
      }
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
  }
}

export function applySubstitution(substitution: Substitution, type: Type): Type {
  function go(substitution: Substitution, type: Type): Type {
    switch (substitution.case) {
      case "nil": return type;
      case "cons": {
        type = applySubstitution(substitution.tail, type);
        type = substitute(substitution.key, substitution.value, type);
        return type;
      }
    }
  }
  return go(substitution, type);;
}

export function unifyConstraints(constraints: Constraints): Substitution {
  let substitution: Substitution = {case: "nil"};
  // NOTE: seems like right direction for fold
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
        case "arrow": throw new Error(`cannot unify ${typeToString(type1)} with ${typeToString(type2)}`)
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
      }
      break;
    }
    case "arrow": {
      switch (type2.case) {
        case "unit": throw new Error(`cannot unify ${typeToString(type1)} with ${typeToString(type2)}`)
        case "variable": {
          if (occursIn(type2.id, type2))
            throw new Error(`cannot unify ${typeToString(type1)} with ${typeToString(type2)} because of circularity on ${typeVariableIdToString(type2.id)}`);
          else
            return singleMap(type2.id, type1);
        }
        case "arrow": {
          return concatMaps(
            unify(type1.domain, type2.domain),
            unify(type2.codomain, type1.codomain));
        }
      }
      break;
    }
  }
  throw new Error("impossible");
}

// Checks if `id` occurs in `type`
export function occursIn(id: TypeVariableId, type: Type): boolean {
  switch (type.case) {
    case "unit": return false;
    case "variable": return id === type.id;
    case "arrow": return occursIn(id, type.domain) || occursIn(id, type.codomain);
  }
}

export function extractType(term: TermAnn): Type {
  switch (term.case) {
    case "unit": return {case: "unit"};
    case "variable": return term.type;
    case "abstraction": return term.type;
    case "application": return term.type;
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
    }
  }

  function goTermAnn(termAnn: TermAnn): TermAnn {
    switch (termAnn.case) {
      case "unit": return {case: "unit"};
      case "variable": return {case: "variable", id: termAnn.id, type: goType(termAnn.type)};
      case "abstraction": return {case: "abstraction", body: goTermAnn(termAnn.body), type: goType(termAnn.type)};
      case "application": return {case: "application", applicant: goTermAnn(termAnn.applicant), argument: goTermAnn(termAnn.argument), type: goType(termAnn.type)};
      case "hole": return {case: "hole", id: termAnn.id, type: goType(termAnn.type)};
    }
  }

  return goTermAnn(termAnn);
}

// TODO: pretty sure I don't need this anymore
// export function collectTypeVariableIds(termAnn: TermAnn): TypeVariableId[] {
//   let ids: TypeVariableId[] = [];

//   function goType(type: Type): void {
//     switch (type.case) {
//       case "unit": return;
//       case "variable": {
//         ids.push(type.id);
//         return;
//       }
//       case "arrow": {
//         goType(type.domain);
//         goType(type.codomain);
//         return;
//       }
//     }
//   }

//   function goTermAnn(termAnn: TermAnn): void {
//     switch (termAnn.case) {
//       case "unit": return;
//       case "variable": {
//         goType(termAnn.type);
//         return;
//       }
//       case "abstraction": {
//         goType(termAnn.type);
//         goTermAnn(termAnn.body);
//         return;
//       }
//       case "application": {
//         goType(termAnn.type);
//         goTermAnn(termAnn.applicant);
//         goTermAnn(termAnn.argument);
//         return;
//       }
//       case "hole": {
//         goType(termAnn.type);
//         return;
//       }
//     }
//   }

//   goTermAnn(termAnn);
//   return ids;
// }