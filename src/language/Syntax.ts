// Program

export type Program = Term;

// Type

export type Type
  = { case: "unit"; }
  | { case: "variable", id: TypeVariableId }
  | { case: "arrow"; domain: Type; codomain: Type; }
;

export function typeToString(type: Type): string {
  switch (type.case) {
    case "unit": return "Unit";
    case "variable": return typeVariableIdToString(type.id);
    case "arrow": return `(${typeToString(type.domain)} -> ${typeToString(type.codomain)})`;
  }
}

export function typeVariableIdToString(id: TypeVariableId): string {
  let letter = alphabet[id % alphabet.length];
  let suffix = id > alphabet.length ? Math.floor(id / alphabet.length).toString() : "";
  return letter + suffix;
}

// Term

export type Term
  = { case: "unit"; }
  | { case: "variable"; id: VariableId; }
  | { case: "abstraction"; body: Term; }
  | { case: "application"; applicant: Term; argument: Term; }
  | { case: "hole"; id: HoleId }
;

export function termToString(term: Term): string {
  switch (term.case) {
    case "unit": return "unit";
    case "variable": return variableIdToString(term.id);
    case "abstraction": return `(λ ${termToString(term.body)})`;
    case "application": return `(${termToString(term.applicant)} ${termToString(term.argument)})`;
    case "hole": return holeIdToString(term.id);
  }
}

export function variableIdToString(id: VariableId): string {
  return id.toString();
  // let letter = alphabet[id % alphabet.length];
  // let suffix = id > alphabet.length ? Math.floor(id / alphabet.length).toString() : "";
  // return letter + suffix;
}

export function holeIdToString(id: HoleId): string {
  return `?${id}`;
}

export type TermAnn
  = { case: "unit"; }
  | { case: "variable"; id: VariableId; type: Type; }
  | { case: "abstraction"; body: TermAnn; type: Type; }
  | { case: "application"; applicant: TermAnn; argument: TermAnn; type: Type; }
  | { case: "hole"; id: HoleId; type: Type; }
;

export function termAnnToString(termAnn: TermAnn): string {
  switch (termAnn.case) {
    case "unit": return "unit";
    case "variable": return `(${variableIdToString(termAnn.id)}: ${typeToString(termAnn.type)})`;
    case "abstraction": return `(λ ${termAnnToString(termAnn.body)}): ${typeToString(termAnn.type)}`;
    case "application": return `(${termAnnToString(termAnn.applicant)} ${termAnnToString(termAnn.argument)}): ${typeToString(termAnn.type)}`;
    case "hole": return `(${holeIdToString(termAnn.id)}: ${typeToString(termAnn.type)})`;
  }
}

export type HoleId = number;
export type VariableId = number;
export type TypeVariableId = number;

const alphabet = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"];