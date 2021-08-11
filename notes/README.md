# README

Type inference with term holes.

## Syntax

```
<type> ::= *
         | <var>
         | <type> -> <type>

<term> ::= <const>
         | <var>
         | <hole>
         | <var> : <type> => <term> // abstraction
         | <term> <term>            // application
```

## Typing

```
infer(ctx, a): [context, type] :=
  match (a) {
    c (<const>) => [ctx, inferConst(c)]
    x (<var>)   => [ctx, inferVar(ctx, x)]
    h (<hole>)  => freshTypeVar(ctx)
    x:X => a    => [ctx, infer(ctx[x => X], a)]
    f a         => let (A -> B) = infer(ctx, f) in
                   let ctx' = unify(ctx, A, infer(ctx, A)) in
                   [ctx', B]
  }
```

## Workflow

- select a hole
  - updates context view
  - updates palette view
- put a palette option (only well-typed options are presented)
  - deselects hole
  - fills in previously-selected hole
    - this may generate new holes
