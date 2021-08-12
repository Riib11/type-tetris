// Program

export type Program = Term;

// Type

export type Type
  = { case: "unit"; }
  | { case: "variable", id: TypeVariableId }
  | { case: "arrow"; domain: Type; codomain: Type; }
  | { case: "product", part1: Type; part2: Type; }
;

export function typeToString(type: Type): string {
  switch (type.case) {
    case "unit": return "Unit";
    case "variable": return typeVariableIdToString(type.id);
    case "arrow": return `(${typeToString(type.domain)} → ${typeToString(type.codomain)})`;
    case "product": return `(${typeToString(type.part1)} * ${typeToString(type.part2)})`;
  }
}

export function typeVariableIdToString(id: TypeVariableId): string {
  let letter = alphabet[id % alphabet.length];
  let suffix = id > alphabet.length ? Math.floor(id / alphabet.length).toString() : "";
  return `${letter}${suffix}`;
}

// Term

export type Term
  = { case: "unit"; }
  | { case: "variable"; id: VariableId; }
  | { case: "abstraction"; body: Term; }
  | { case: "application"; applicant: Term; argument: Term; }
  | { case: "pair"; part1: Term; part2: Term; }
  | { case: "proj1"; argument: Term; }
  | { case: "proj2"; argument: Term; }
  | { case: "hole"; id: HoleId }
;

export function termToString(term: Term): string {
  switch (term.case) {
    case "unit": return "unit";
    case "variable": return variableIdToString(term.id);
    case "abstraction": return `(λ ${termToString(term.body)})`;
    case "application": return `(${termToString(term.applicant)} ${termToString(term.argument)})`;
    case "pair": return `(${termToString(term.part1)}, ${termToString(term.part2)})`;
    case "proj1": return `(π₁ ${termToString(term.argument)})`;
    case "proj2": return `(π₂ ${termToString(term.argument)})`;
    case "hole": return holeIdToString(term.id);
  }
}

export function variableIdToString(id: VariableId): string {
  return `#${id.toString()}`;
}

export function holeIdToString(id: HoleId): string {
  return `?${id}`;
}

export type TermAnn
  = { case: "unit"; }
  | { case: "variable"; id: VariableId; type: Type; }
  | { case: "abstraction"; body: TermAnn; type: Type; }
  | { case: "application"; applicant: TermAnn; argument: TermAnn; type: Type; }
  | { case: "proj1"; argument: TermAnn; type: Type; }
  | { case: "proj2"; argument: TermAnn;  type: Type; }
  | { case: "pair"; part1: TermAnn; part2: TermAnn; type: Type; }
  | { case: "hole"; id: HoleId; type: Type; }
;

export function termAnnToString(termAnn: TermAnn): string {
  switch (termAnn.case) {
    case "unit": return "unit";
    case "variable": return `(${variableIdToString(termAnn.id)}: ${typeToString(termAnn.type)})`;
    case "abstraction": return `(λ ${termAnnToString(termAnn.body)}): ${typeToString(termAnn.type)}`;
    case "application": return `(${termAnnToString(termAnn.applicant)} ${termAnnToString(termAnn.argument)}): ${typeToString(termAnn.type)}`;
    case "pair": return `(${termAnnToString(termAnn.part1)}, ${termAnnToString(termAnn.part2)}): ${typeToString(termAnn.type)}`;
    case "proj1": return `(π₁ ${termAnnToString(termAnn.argument)}): ${typeToString(termAnn.type)}`;
    case "proj2": return `(π₂ ${termAnnToString(termAnn.argument)}): ${typeToString(termAnn.type)}`;
    case "hole": return `(${holeIdToString(termAnn.id)}: ${typeToString(termAnn.type)})`;
  }
}

export function extractTypes(termAnn: TermAnn): Type[] {
  let types: Type[] = [];
  function go(termAnn: TermAnn) {
    switch (termAnn.case) {
      case "unit": return;
      case "variable": types.push(termAnn.type); return;
      case "abstraction": types.push(termAnn.type); go(termAnn.body); return;
      case "application": types.push(termAnn.type); go(termAnn.applicant); go(termAnn.argument); return;
      case "pair": types.push(termAnn.type); go(termAnn.part1); go(termAnn.part2); return;
      case "proj1": types.push(termAnn.type); go(termAnn.argument); return;
      case "proj2": types.push(termAnn.type); go(termAnn.argument); return;
      case "hole": types.push(termAnn.type); return;
    }
  }
  go(termAnn);
  return types;
}

export type HoleId = number;
export type VariableId = number;
export type TypeVariableId = number;

const alphabet = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"];