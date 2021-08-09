// Program

export type Program = Term;

// Type

export type Type
  = { case: "unit"; }
  | { case: "variable", id: TypeVariableId }
  | { case: "arrow"; domain: Type; codomain: Type; }
;

// Term

export type Term
  = { case: "unit"; }
  | { case: "variable"; id: VariableId; }
  | { case: "abstraction"; id: VariableId; domain: Type; body: Term; }
  | { case: "application"; applicant: Term; argument: Term; }
  | { case: "hole"; id: HoleId }
;

export type HoleId = number;
export type VariableId = number;
export type TypeVariableId = number;

// ToString

export function typeToString(type: Type): string {
  switch (type.case) {
    case "unit": return "Unit";
    case "arrow": return `(${typeToString(type.domain)} -> ${typeToString(type.codomain)})`;
    case "variable": return typeVariableIdToString(type.id);
  }
}

export function termToString(term: Term): string {
  switch (term.case) {
    case "unit": return "unit";
    case "variable": return variableIdToString(term.id);
    case "abstraction": return `(${variableIdToString(term.id)} : ${typeToString(term.domain)}) ⇒ ${termToString(term.body)}`;
    case "application": return `(${termToString(term.applicant)} ${termToString(term.argument)})`;
    case "hole": return `#${term.id}`;
  }
}

export function typeVariableIdToString(id: TypeVariableId): string {
  if (id < alphabet.length)
    return `${alphabet[id % alphabet.length].toUpperCase()}`;
  else
    return `${alphabet[id % alphabet.length].toUpperCase()}${Math.floor(id / alphabet.length)}`;
}

export function variableIdToString(id: VariableId): string {
  if (id < alphabet.length)
    return `${alphabet[id % alphabet.length]}`;
  else
    return `${alphabet[id % alphabet.length]}${Math.floor(id / alphabet.length)}`;
}

export function holeIdToString(id: HoleId): string {
  return `#${id}`;
}

const alphabet = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"];

// // Fresh [Type]VariableId

// function freshVariableId(term: Term): VariableId {
//   let id: TypeVariableId = 0;
//   function go(term: Term): void {
//     switch (term.case) {
//       case "unit": break;
//       case "variable": id = Math.max(term.id, id); break;
//       case "abstraction": id = Math.max(term.id, id); break;
//       case "application": go(term.applicant); go(term.argument); break;
//       case "hole": break;
//     }
//   }
//   go(term);
//   return id;
// }

// function freshTypeVariableId(term: Term): TypeVariableId {
//   let id: TypeVariableId = 0;
//   function go(term: Term): void {
//     switch (term.case) {
//       case "unit": break;
//       case "variable": break;
//       case "abstraction": id = Math.max(term., id); break;
//       case "application": go(term.applicant); go(term.argument); break;
//       case "hole": break;
//     }
//   }
// }