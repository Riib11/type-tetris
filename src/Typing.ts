import { concatMaps, LinkedMap, singleMap } from "./data/LinkedMap";
import { List } from "./data/List";
import { Term, TermAnn, Type, typeToString, TypeVariableId, typeVariableIdToString, VariableId } from "./language/Syntax";

export type Context = List<Type>;
export type Constraints = [Type, Type][];
export type Substitution = LinkedMap<TypeVariableId, Type>;


// TODO: During inferece, get the term variable context at hole (which needs to
//       have unification substititions applied to it).


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
      case "hole": {
        let type = freshTypeVariable();
        return {case: "hole", id: term.id, type};
      }
    };
    throw new Error("impossible")
  }
  return go({case: "nil"}, term);
}

export function collectConstraints(term: TermAnn): Constraints {
  let constraints: Constraints = [];
  function go(term: TermAnn): void {
    switch (term.case) {
      case "unit": return;
      case "variable": return;
      case "abstraction": go(term.body); return;
      case "application": {
        let [f, a] = [extractType(term.applicant), extractType(term.argument)];
        constraints.push([f, {case: "arrow", domain: a, codomain: term.type}]);
        go(term.applicant);
        go(term.argument);
        return;
      }
      case "hole": return;
    }
  }
  go(term);
  return constraints;
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

export function infer(term: Term): Type {
  let termAnn: TermAnn = annotate(term);
  let constraints: Constraints = collectConstraints(termAnn);
  let substitution: Substitution = unifyConstraints(constraints);
  let type = applySubstitution(substitution, extractType(termAnn));
  return type;
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

// TODO: this is a fold-right, perhaps it should be a fold-left? Im not sure
//       which things I got backwards
export function applySubstitution(substitution: Substitution, type: Type): Type {
  switch (substitution.case) {
    case "nil": return type;
    case "cons": {
      return substitute(
        substitution.key, 
        substitution.value, 
        applySubstitution(substitution.tail, type));
    }
  }
}

export function unifyConstraints(constraints: Constraints): Substitution {
  let substitution: Substitution = {case: "nil"};
  // TODO: this might be applying or concating backwards?
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
        case "unit": return {case: "nil"};
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
          concatMaps(
            unify(type1.domain, type2.domain),
            unify(type1.codomain, type2.codomain));
        }
      }
      break;
    }
  }
  throw new Error("unimplemented");
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