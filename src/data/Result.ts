export type Result<E, A> = { case: "error"; error: E } | { case: "ok"; value: A };

export const error = <E, A>(error: E): Result<E, A> => ({ case: "error", error: error });

export const ok = <E, A>(value: A): Result<E, A> => ({ case: "ok", value: value });

export function map<E, A, B>(result: Result<E, A>, continuation: (value: A) => Result<E, B>): Result<E, B> {
  switch (result.case) {
    case "ok": return continuation(result.value);
    case "error": return result;
  }
}

export function match<E, A, B>(result: Result<E, A>, handler: (error: E) => B, continuation: (value: A) => B): B {
  switch (result.case) {
    case "error":
      return handler(result.error);
    case "ok":
      return continuation(result.value);
  }
}
