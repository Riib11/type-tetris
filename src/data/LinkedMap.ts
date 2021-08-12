export type LinkedMap<K, V>
  = { case: "nil"; }
  | { case: "cons"; key: K; value: V; tail: LinkedMap<K, V> }

export function nilMap<K, V>(): LinkedMap<K, V> {
  return {case: "nil"};
}

export function lookup<K, V>(m: LinkedMap<K, V>, k: K, eq?: (k1: K, k2: K) => boolean): V | undefined {
  if (eq === undefined)
    eq = (k1, k2) => (k1 === k2);
  switch (m.case) {
    case "nil":
      return undefined;
    case "cons":
      if (m.key === k)
        return m.value;
      else
        return lookup(m.tail, k, eq);
  }
}

export function appendMap<K, V>(k: K, v: V, m: LinkedMap<K, V>): LinkedMap<K, V> {
  return {case: "cons", key: k, value: v, tail: m};
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

export function filterMap<K, V>(m: LinkedMap<K, V>, f: (v: V) => boolean): LinkedMap<K, V> {
  switch (m.case) {
    case "nil":
      return { case: "nil" };
    case "cons": {
      if (f(m.value))
        return { 
          case: "cons",
          key: m.key,
          value: m.value,
          tail: filterMap(m.tail, f)
        };
      else 
        return filterMap(m.tail, f);
    }
  }
}

export function concatMaps<K, V>(m1: LinkedMap<K, V>, m2: LinkedMap<K, V>): LinkedMap<K, V> {
  switch (m1.case) {
    case "nil": return m2;
    case "cons": {
      return concatMaps(m1.tail, {case: "cons", key: m1.key, value: m1.value, tail: m2});
    }
  }
}

export function singleMap<K, V>(key: K, value: V): LinkedMap<K, V> {
  return {case: "cons", key, value, tail: {case: "nil"}};
}

export function cloneMap<K, V>(m: LinkedMap<K, V>): LinkedMap<K, V> {
  switch (m.case) {
    case "nil": return {case: "nil"};
    case "cons": {
      return {case: "cons", key: m.key, value: m.value, tail: cloneMap(m.tail)};
    }
  }
}

export function reverseMap<K, V>(m: LinkedMap<K, V>): LinkedMap<K, V> {
  switch (m.case) {
    case "nil": return {case: "nil"};
    case "cons": return concatMaps(reverseMap(m.tail), singleMap(m.key, m.value));
  }
}

export function mapMap<K, V>(f: (k: K, v: V) => V, m: LinkedMap<K, V>): LinkedMap<K, V> {
  switch (m.case) {
    case "nil": return {case: "nil"};
    case "cons": return {case: "cons", key: m.key, value: f(m.key, m.value), tail: mapMap(f, m.tail)};
  }
}