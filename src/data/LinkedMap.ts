export type LinkedMap<K, V>
  = { case: "nil"; }
  | { case: "cons"; key: K; value: V; tail: LinkedMap<K, V> }

export function lookup<K, V>(m: LinkedMap<K, V>, k: K): V | undefined {
  switch (m.case) {
    case "nil":
      return undefined;
    case "cons":
      if (m.key === k)
        return m.value;
      else
        return lookup(m.tail, k);
  }
}

export function keys<K, V>(m: LinkedMap<K, V>): K[] {
  let ks: K[] = [];
  function go(m: LinkedMap<K, V>): void {
    switch (m.case) {
      case "nil":
        return;
      case "cons":
        ks.push(m.key);
        go(m.tail);
    }
  }
  go(m);
  return ks;
}

export function items<K, V>(m: LinkedMap<K, V>): [K, V][] {
  let items: [K, V][] = [];
  function go(m: LinkedMap<K, V>): void {
    switch (m.case) {
      case "nil":
        return;
      case "cons":
        items.push([m.key, m.value]);
        go(m.tail);
    }
  }
  go(m);
  return items;
}

export function filter<K, V>(m: LinkedMap<K, V>, f: (v: V) => boolean): LinkedMap<K, V> {
  switch (m.case) {
    case "nil":
      return { case: "nil" };
    case "cons": {
      if (f(m.value))
        return { 
          case: "cons",
          key: m.key,
          value: m.value,
          tail: filter(m.tail, f)
        };
      else 
        return filter(m.tail, f);
    }
  }
}