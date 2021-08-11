export type List<A>
  = { case: "nil" }
  | { case: "cons"; head: A, tail: List<A> }
;

export function single<A>(a: A): List<A> {
  return {case: "cons", head: a, tail: {case: "nil"}};
}

export function cloneList<A>(l: List<A>): List<A> {
  switch (l.case) {
    case "nil": return {case: "nil"};
    case "cons": return {case: "cons", head: l.head, tail: cloneList(l.tail)};
  }
}

export function mapList<A, B>(f:(a: A) => B, l: List<A>): List<B> {
  switch (l.case) {
    case "nil": return {case: "nil"};
    case "cons": return {case: "cons", head: f(l.head), tail: mapList(f, l.tail)}
  }
}

export function toArray<A>(l: List<A>): A[] {
  let arr: A[] = [];
  function go(l: List<A>): void {
    switch (l.case) {
      case "nil": return;
      case "cons": arr.push(l.head); go(l.tail); return;
    }
  }
  go(l);
  return arr.reverse();
}