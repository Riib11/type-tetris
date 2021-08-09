export type List<A>
  = { case: "nil" }
  | { case: "cons"; head: A, tail: List<A> }
;