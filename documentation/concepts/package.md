---
title: Package
href: /documentation/concepts/package
description: An inlang package contains plugins and/or lint rules that are imported by inlang apps.
---

# {% $frontmatter.title %}

{% $frontmatter.description %}. 

An app imports and uses the items of the packages that are defined in the [inlang project configuration file](/documentation/concepts/project#project-configuration-file-schema). A package can contain the following items:

- [Plugins](/documentation/concepts/plugin)
- [Lint rules](/documentation/concepts/lint-rule)

<!-- TODO visualization of a package that contains N items -->

## Package schema

A package is an ES module that default exports an object with the following schema: 

```ts
// example/package.js

export default {
  plugins: Array<InlangPlugin>,
  lintRules: Array<InlangLintRule>,
}
```
