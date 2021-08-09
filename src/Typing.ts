import { HoleId, Term, Type, VariableId, TypeVariableId, typeToString, termToString, variableIdToString } from "./language/Syntax";

export type Context = Map<VariableId, Type>;

export function contextToString(context: Context): string {
  let s = "";
  context.forEach((type, id) => s += `(${variableIdToString(id)}: ${typeToString(type)})`);
  return s;
}

// Inference

export type Inference = {
  type: Type;

  holeTypes: Map<HoleId, Type>;
  holeContexts: Map<HoleId, Context>;

  maxVariableId: VariableId;
  maxTypeVariableId: TypeVariableId;
  maxHoleId: HoleId;
}

export function infer(term: Term): Inference {
  let holeScopes: Map<HoleId, VariableId[]> = new Map();
  let holeTypes: Map<HoleId, Type> = new Map();
  let variables: Map<VariableId, Type> = new Map();
  let typeVariables: Map<TypeVariableId, Type | undefined> = new Map(); // `unidentified` indicates free type variable
  let visibleVariableIds: VariableId[] = [];

  // Term Variables

  function inferVariable(id: VariableId): Type {
    let type = variables.get(id);
    if (type !== undefined) 
      return type;
    else
      throw new Error(`undefined variable: ${id}`);
  }

  // Type Variables

  function normalizeType(type: Type): Type {
    switch (type.case) {
      case "unit": {
        return type;
      }
      case "variable": {
        if (type.id !== undefined) {
          let typeNext = typeVariables.get(type.id);
          if (typeNext !== undefined)
            return normalizeType(typeNext); // is dependent
          else
            return type; // is free
        } else
          throw new Error(`unidentified variable`);
      }
      case "arrow": {
        return {case: "arrow", domain: normalizeType(type.domain), codomain: normalizeType(type.codomain)};
      }
    }
  }

  function freshTypeVariable(): Type {
    let maxId = 0;
    typeVariables.forEach((_, id) => maxId = Math.max(maxId, id))
    let id = maxId + 1;
    typeVariables.set(id, undefined);
    return {case: "variable", id: id};
  }

  // Term Inference

  function inferTerm(term: Term): Type {
    switch (term.case) {
      case "unit": {
        return {case: "unit"};
      }
      case "variable": {
        return inferVariable(term.id);
      }
      case "abstraction": {
        variables.set(term.id, term.domain);
        visibleVariableIds.push(term.id);
        let codomain = inferTerm(term.body);
        visibleVariableIds.pop();
        return {case: "arrow", domain: term.domain, codomain};
      }
      case "application": {
        let applicantType = inferTerm(term.applicant);
        let domain: Type = freshTypeVariable();
        let codomain: Type = freshTypeVariable();
        unify(applicantType, {case: "arrow", domain, codomain});
        let argumentType = inferTerm(term.argument);
        unify(argumentType, domain);
        return codomain;
      }
      case "hole": {
        let type = freshTypeVariable();
        holeTypes.set(term.id, type);
        holeScopes.set(term.id, visibleVariableIds.map(id => id));
        return type;
      }
    }
  }

  // Type Unification

  function unify(type1: Type, type2: Type): Type {
    switch (type1.case) {
      case "unit": {
        switch (type2.case) {
          case "unit": {
            return {case: "unit"};
          }
          case "variable": {
            typeVariables.set(type2.id, type1);
            return type1;
          }
          case "arrow": {
            throw new Error(`cannot unify ${typeToString(type1)} with ${typeToString(type2)}`);
          }
        }
        break;
      }
      case "variable": {
        switch (type2.case) {
          case "unit": {
            typeVariables.set(type1.id, type2);
            return type2;
          }
          case "variable": {
            typeVariables.set(type1.id, type2);
            return type2;
          }
          case "arrow": {
            typeVariables.set(type1.id, type2);
            return type2;
          }
        }
        break;
      }
      case "arrow": {
        switch (type2.case) {
          case "unit": {
            throw new Error(`cannot unify ${typeToString(type1)} with ${typeToString(type2)}`);
          }
          case "variable": {
            typeVariables.set(type2.id, type1);
            return type1;
          } 
          case "arrow": {
            unify(type1.domain, type2.domain);
            unify(type1.codomain, type2.codomain);
            return type1;
          }
        }
        break;
      }
    }
  }

  // Normalizing Types in Term

  function normalizeTypesInTerm(term: Term): void {
    switch (term.case) {
      case "unit": break;
      case "variable": break;
      case "abstraction": {
        term.domain = normalizeType(term.domain);
        break;
      }
      case "application": {
        normalizeTypesInTerm(term.applicant);
        normalizeTypesInTerm(term.argument);
        break;
      }
      case "hole": break;
    }
  }
  normalizeTypesInTerm(term);

  let type = normalizeType(inferTerm(term));
  let holeContexts: Map<HoleId, Context> = new Map();
  holeScopes.forEach((variableIds, holeId) => {
    let context: Context = new Map();
    variableIds.forEach(variableId => context.set(variableId, normalizeType(inferVariable(variableId))));
    holeContexts.set(holeId, context);
  })
  holeTypes.forEach(type => normalizeType(type));

  let maxTypeVariableId = 0;
  typeVariables.forEach((_, id) => maxTypeVariableId = Math.max(id, maxTypeVariableId));

  let maxVariableId = 0;
  variables.forEach((_, id) => maxTypeVariableId = Math.max(id, maxVariableId));

  let maxHoleId = 0;
  holeTypes.forEach((_, id) => maxHoleId = Math.max(id, maxHoleId));

  return {
    type,

    holeTypes,
    holeContexts,

    maxVariableId,
    maxTypeVariableId,
    maxHoleId
  };
}

export function isSubtype(term: Term, type1: Type, type2: Type): boolean {
  let variables: Map<VariableId, Type> = new Map();
  let typeVariables: Map<TypeVariableId, Type | undefined> = new Map(); // `unidentified` indicates free type variable

  // Term Variables

  function inferVariable(id: VariableId): Type {
    let type = variables.get(id);
    if (type !== undefined) 
      return type;
    else
      throw new Error(`undefined variable: ${id}`);
  }

  // Type Variables

  function normalizeType(type: Type): Type {
    switch (type.case) {
      case "unit": {
        return type;
      }
      case "variable": {
        if (type.id !== undefined) {
          let typeNext = typeVariables.get(type.id);
          if (typeNext !== undefined)
            return normalizeType(typeNext); // is dependent
          else
            return type; // is free
        } else
          throw new Error(`unidentified variable`);
      }
      case "arrow": {
        return {case: "arrow", domain: normalizeType(type.domain), codomain: normalizeType(type.codomain)};
      }
    }
  }

  function freshTypeVariable(): Type {
    let maxId = 0;
    typeVariables.forEach((_, id) => maxId = Math.max(maxId, id))
    let id = maxId + 1;
    typeVariables.set(id, undefined);
    return {case: "variable", id: id};
  }

  // Term Inference

  function inferTerm(term: Term): Type {
    switch (term.case) {
      case "unit": {
        return {case: "unit"};
      }
      case "variable": {
        return inferVariable(term.id);
      }
      case "abstraction": {
        let codomain = inferTerm(term.body);
        return {case: "arrow", domain: term.domain, codomain};
      }
      case "application": {
        let applicantType = inferTerm(term.applicant);
        let domain: Type = freshTypeVariable();
        let codomain: Type = freshTypeVariable();
        unify(applicantType, {case: "arrow", domain, codomain});
        let argumentType = inferTerm(term.argument);
        unify(argumentType, domain);
        return codomain;
      }
      case "hole": {
        let type = freshTypeVariable();
        return type;
      }
    }
  }

  inferTerm(term);

  // Type Unification

  function unify(type1: Type, type2: Type): Type {
    switch (type1.case) {
      case "unit": {
        switch (type2.case) {
          case "unit": {
            return {case: "unit"};
          }
          case "variable": {
            typeVariables.set(type2.id, type1);
            return type1;
          }
          case "arrow": {
            throw new Error(`cannot unify ${typeToString(type1)} with ${typeToString(type2)}`);
          }
        }
        break;
      }
      case "variable": {
        switch (type2.case) {
          case "unit": {
            typeVariables.set(type1.id, type2);
            return type2;
          }
          case "variable": {
            typeVariables.set(type1.id, type2);
            return type2;
          }
          case "arrow": {
            typeVariables.set(type1.id, type2);
            return type2;
          }
        }
        break;
      }
      case "arrow": {
        switch (type2.case) {
          case "unit": {
            throw new Error(`cannot unify ${typeToString(type1)} with ${typeToString(type2)}`);
          }
          case "variable": {
            typeVariables.set(type2.id, type1);
            return type1;
          } 
          case "arrow": {
            unify(type1.domain, type2.domain);
            unify(type1.codomain, type2.codomain);
            return type1;
          }
        }
        break;
      }
    }
  }

  type1 = normalizeType(type1);
  type2 = normalizeType(type2);
  try {
    unify(type1, type2);
    return true;
  } catch (e) {
    return false;
  }
}
