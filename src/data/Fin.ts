export type Fin
  = { case: "zero" }
  | { case: "suc"; pred: Fin }
;