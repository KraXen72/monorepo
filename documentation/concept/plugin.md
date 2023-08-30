---
title: Plugin
href: /documentation/plugin
description: An inlang plugin defines and extend how an inlang app should behave.
---

# {% $frontmatter.title %}

{% $frontmatter.description %}

For example, plugin A defines that [messages](/documentation/message) should be stored in a database, while plugin B defines that messages should be stored in a file. An [inlang app](/documentation/inlang-app) that uses plugin A will store messages in a database, while an inlang app that uses plugin B will store messages in a file.


<!-- TODO #1301 visualization of app that behaves differently if plugin A or plugin B is used -->


## Develop your own plugin

Learn how to build your own plugin in the [develop an inlang plugin guide](/documentation/develop-plugin).