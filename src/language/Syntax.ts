import { alphabet } from "../data/Alphabet";

// Types

export type HoleName = {id: HoleId};
export type HoleId = number;

export type VariableName = {label: VariableLabel};
export type VariableLabel = string;

export type TypeVariableName = {id: TypeVariableId};
export type TypeVariableId = number;

// Type

export type Type
  = { case: "unit"; }
  | { case: "variable", name: TypeVariableName }
  | { case: "arrow"; domain: Type; codomain: Type; }
  | { case: "product", part1: Type; part2: Type; }
;

export function typeToString(type: Type): string {
  switch (type.case) {
    case "unit": return "Unit";
    case "variable": return typeVariableNameToString(type.name);
    case "arrow": return `(${typeToString(type.domain)} → ${typeToString(type.codomain)})`;
    case "product": return `(${typeToString(type.part1)} * ${typeToString(type.part2)})`;
  }
}

export function typeVariableNameToString(name: TypeVariableName): string {
  let letter = alphabet[name.id % alphabet.length];
  let suffix = name.id > alphabet.length ? Math.floor(name.id / alphabet.length).toString() : "";
  return `${letter}${suffix}`;
}

// Term

export type Term
  = { case: "unit"; }
  | { case: "variable"; name: VariableName; }
  | { case: "abstraction"; name: VariableName; body: Term; }
  | { case: "application"; applicant: Term; argument: Term; }
  | { case: "pair"; proj1: Term; proj2: Term; }
  | { case: "proj1"; argument: Term; }
  | { case: "proj2"; argument: Term; }
  | { case: "hole"; name: HoleName }
;

export function termToString(term: Term): string {
  switch (term.case) {
    case "unit": return "unit";
    case "variable": return variableNameToString(term.name);
    case "abstraction": return `(λ ${variableNameToString(term.name)} . ${termToString(term.body)})`;
    case "application": return `(${termToString(term.applicant)} ${termToString(term.argument)})`;
    case "pair": return `(${termToString(term.proj1)}, ${termToString(term.proj2)})`;
    case "proj1": return `(π₁ ${termToString(term.argument)})`;
    case "proj2": return `(π₂ ${termToString(term.argument)})`;
    case "hole": return holeNameToString(term.name);
  }
}

export function variableNameToString(name: VariableName): string {
  return `${name.label}`;
}

export function holeNameToString(name: HoleName): string {
  return `?${name.id}`;
}

// Term with type-annotations
export type TermAnn
  = { case: "unit"; }
  | { case: "variable"; name: VariableName; type: Type; }
  | { case: "abstraction"; name: VariableName; body: TermAnn; type: Type; }
  | { case: "application"; applicant: TermAnn; argument: TermAnn; type: Type; }
  | { case: "proj1"; argument: TermAnn; type: Type; part2: Type; }
  | { case: "proj2"; argument: TermAnn; type: Type; part1: Type; }
  | { case: "pair"; proj1: TermAnn; proj2: TermAnn; type: Type }
  | { case: "hole"; name: HoleName; type: Type; }
;

export function termAnnToString(termAnn: TermAnn): string {
  switch (termAnn.case) {
    case "unit": return "unit";
    case "variable": return `(${variableNameToString(termAnn.name)}: ${typeToString(termAnn.type)})`;
    case "abstraction": return `(λ ${variableNameToString(termAnn.name)} . ${termAnnToString(termAnn.body)}): ${typeToString(termAnn.type)}`;
    case "application": return `(${termAnnToString(termAnn.applicant)} ${termAnnToString(termAnn.argument)}): ${typeToString(termAnn.type)}`;
    case "pair": return `(${termAnnToString(termAnn.proj1)}, ${termAnnToString(termAnn.proj2)}): ${typeToString(termAnn.type)}`;
    case "proj1": return `(π₁ ${termAnnToString(termAnn.argument)}): ${typeToString(termAnn.type)} (* ${typeToString(termAnn.part2)})`;
    case "proj2": return `(π₂ ${termAnnToString(termAnn.argument)}): ${typeToString(termAnn.type)} (${typeToString(termAnn.part1)} *)`;
    case "hole": return `(${holeNameToString(termAnn.name)}: ${typeToString(termAnn.type)})`;
  }
}

// Extractions

export function extractType(termAnn: TermAnn): Type {
  switch (termAnn.case) {
    case "unit": return {case: "unit"};
    case "variable": return termAnn.type;
    case "abstraction": return termAnn.type;
    case "application": return termAnn.type;
    case "pair": return termAnn.type;
    case "proj1": return termAnn.type;
    case "proj2": return termAnn.type;
    case "hole": return termAnn.type;
  }
}

// Collections

export function collectTypeVariableNames(termAnn: TermAnn): TypeVariableName[] {
  let names: TypeVariableName[] = []
  function go(type: Type): void {
    switch (type.case) {
      case "unit": return;
      case "variable": names.push(type.name); return;
      case "arrow": go(type.domain); go(type.domain); return;
      case "product": go(type.part1); go(type.part2); return;
    }
  }
  collectTypes(termAnn).forEach(type => go(type));
  return names;
}

export function collectTypes(termAnn: TermAnn): Type[] {
  let types: Type[] = [];
  function go(termAnn: TermAnn) {
    switch (termAnn.case) {
      case "unit": return;
      case "variable": types.push(termAnn.type); return;
      case "abstraction": types.push(termAnn.type); go(termAnn.body); return;
      case "application": types.push(termAnn.type); go(termAnn.applicant); go(termAnn.argument); return;
      case "pair": types.push(termAnn.type); go(termAnn.proj1); go(termAnn.proj2); return;
      case "proj1": types.push(termAnn.type); types.push(termAnn.part2); go(termAnn.argument); return;
      case "proj2": types.push(termAnn.type); types.push(termAnn.part1); go(termAnn.argument); return;
      case "hole": types.push(termAnn.type); return;
    }
  }
  go(termAnn);
  return types;
}

export function collectHoleTypes(termAnn: TermAnn): Map<HoleName, Type> {
  let holeTypes: Map<HoleName, Type> = new Map();
  function go(termAnn: TermAnn): void {
    switch (termAnn.case) {
      case "unit": return;
      case "variable": return;
      case "abstraction": go(termAnn.body); return;
      case "application": go(termAnn.applicant); go(termAnn.argument); return;
      case "pair": go(termAnn.proj1); go(termAnn.proj2); return;
      case "proj1": go(termAnn.argument); return;
      case "proj2": go(termAnn.argument); return;
      case "hole": { holeTypes.set(termAnn.name, termAnn.type); return; }
    }
  }
  go(termAnn);
  return holeTypes;
}

export function collectHoleNames(term: Term): HoleName[] {
  let holeNames: HoleName[] = [];
  function go(term: Term): void {
    switch (term.case) {
      case "unit": return;
      case "variable": return;
      case "abstraction": go(term.body); return;
      case "application": go(term.applicant); go(term.argument); return;
      case "pair": go(term.proj1); go(term.proj2); return;
      case "proj1": go(term.argument); return;
      case "proj2": go(term.argument); return;
      case "hole": { holeNames.push(term.name); return; }
    }
  }
  go(term);
  return holeNames.reverse();
}

// Fresh names

export function nextTypeVariableId(id: TypeVariableId): TypeVariableId {
  return id + 1;
}

export function nextTypeVariableName(name: TypeVariableName): TypeVariableName {
  return {id: nextTypeVariableId(name.id)};
}

export function makeFreshTypeVariableName(termAnn: TermAnn): TypeVariableName {
  let freshTypeVariableId: TypeVariableId = 0;
  function go(type: Type): void {
    switch (type.case) {
      case "unit": return;
      case "variable": freshTypeVariableId = Math.max(freshTypeVariableId, type.name.id); return;
      case "arrow": go(type.domain); go(type.codomain); return;
      case "product": go(type.part1); go(type.part2); return;
    }
  }
  collectTypes(termAnn).forEach(type => go(type));
  return {id: freshTypeVariableId+1};
}

export function makeFreshTypeVariable(termAnn: TermAnn): Type {
  return {case: "variable", name: makeFreshTypeVariableName(termAnn)};
}

export function makePlaceholderTypeVariable(): Type {
  return {case: "variable", name: {id: -1}};
}

export function makePlaceholderHole(): Term {
  return {case: "hole", name: {id: -1}};
}

export function nextHoleId(id: HoleId): HoleId {
  return id + 1;
}

export function nextHoleName(name: HoleName): HoleName {
  return {id: nextHoleId(name.id)};
}

export function makePlaceholderVariableName(): VariableName {
  return {label: "x"};
}

export function enumerateTypeVariableNames(termAnn: TermAnn): void {
  let names: TypeVariableName[] = []

  function go(name: TypeVariableName): void {
    if (!names.includes(name)) {
      name.id = names.length;
      names.push(name);
    }
  }
  console.log(`before enumeration: ${termAnnToString(termAnn)}`);
  collectTypeVariableNames(termAnn).reverse().forEach(name => go(name));
  console.log(`after enumeration: ${termAnnToString(termAnn)}`);
}

export function enumerateHoles(term: Term): void {
  let freshHoleId = 0;
  function go(name: HoleName): void {
    name.id = freshHoleId;
    freshHoleId++;
  }
  collectHoleNames(term).forEach(name => go(name));
}

// Relabel

export function relabel(name: VariableName, label: VariableLabel, term: Term): void {
  function go(term: Term): void {
    switch (term.case) {
      case "unit": return;
      case "variable": if (name === term.name) {term.name.label = label;}; return;
      case "abstraction": if (name === term.name) {term.name.label = label;}; go(term.body); return;
      case "application": go(term.applicant); go(term.argument); return;
      case "pair": go(term.proj1); go(term.proj2); return;
      case "proj1": go(term.argument); return;
      case "proj2": go(term.argument); return;
      case "hole": return;
    }
  }
  go(term);
}
