// Program

export type Program = Term;

// Type

export type Type
  = { case: "unit"; }
  | { case: "variable", id: TypeVariableId }
  | { case: "arrow"; domain: Type; codomain: Type; }
;

export function typeToString(type: Type): string { throw new Error("unimplemented"); }
export function typeVariableIdToString(id: TypeVariableId): string { throw new Error("unimplemented"); }

// Term

export type Term
  = { case: "unit"; }
  | { case: "variable"; id: VariableId; }
  | { case: "abstraction"; body: Term; }
  | { case: "application"; applicant: Term; argument: Term; }
  | { case: "hole"; id: HoleId }
;

export function termToString(term: Term): string { throw new Error("unimplemented"); }

export type TermAnn
  = { case: "unit"; }
  | { case: "variable"; id: VariableId; type: Type; }
  | { case: "abstraction"; body: TermAnn; type: Type; }
  | { case: "application"; applicant: TermAnn; argument: TermAnn; type: Type; }
  | { case: "hole"; id: HoleId; type: Type; }
;

export function termAnnToString(termAnn: TermAnn): string { throw new Error("unimplemented"); }

export type HoleId = number;
export type VariableId = number;
export type TypeVariableId = number;

