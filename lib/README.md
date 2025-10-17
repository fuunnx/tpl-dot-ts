# tpl-dot-ts

> [!Warning] This project is a work in progress. The API is mostly stable but expect some minor breaking changes until v1.

[![npm version](https://badge.fury.io/js/tpl-dot-ts.svg)](https://badge.fury.io/js/tpl-dot-ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`tpl-dot-ts` is a TypeScript scaffolding library that simplifies the generation of complex projects from templates. It offers a flexible and type-safe approach to creating dynamic file structures, using contexts to manage data and printers to format the output.

It is ideal for use cases such as:

*   Generating boilerplate code for new projects
*   Creating API clients from OpenAPI specifications
*   Building custom project structures with dynamic configurations

By offering a flexible and type-safe approach to creating dynamic file structures, using contexts to manage data, and printers to format the output, `tpl-dot-ts` helps developers save time and ensure consistency across their projects.

## Core Concepts

`tpl-dot-ts` generates projects from templates using three core concepts:

*   **Templates:** Directories or `.tpl.ts` files that define the project structure. `.tpl.ts` files are executed to generate dynamic content.
*   **Contexts:** Provide type-safe data to templates, enabling reusability across different environments.
*   **Materialization & Printers:** Transforms the template description into actual files and content, using printers to format the output for different file types (e.g., JSON, YAML). You can customize the printers used by providing a `PrinterContext` to a Subtree.

## Installation

```sh
npm install --save-dev tpl-dot-ts
```

```sh
yarn add --dev tpl-dot-ts
```

## Quick Start Guide

> **Note:** A complete, runnable version is in [`examples/01-quick-start`](./examples/01-quick-start).

This guide generates personalized greetings with a static file.

### 1. Set up the Project Structure

Create the following directory structure:

```
.
├── templates/
│   ├── greeting.tpl.ts
│   └── static.txt
├── config.ts
└── run.ts
```

### 2. Create the Template Files

`templates/static.txt`:

```
This file is static and will be copied directly.
```

`templates/greeting.tpl.ts`:

```typescript
import { defineFile } from 'tpl-dot-ts'
import { Config } from '../config.ts'

export default defineFile(() => {
  const config = Config.getContextValue()
  return `Hello, ${config.name}!`
})
```

### 3. Define the Context

`config.ts`:

```typescript
import { createContext } from 'tpl-dot-ts'

type ConfigShape = { name: string }

export class Config extends createContext<ConfigShape>('config', () => ({ name: 'World' })) {
  static init(data: ConfigShape) {
    return new Config(data)
  }
}
```

### 4. Create the Runner Script

`run.ts`:

```typescript
#!/usr/bin/env -S npx tsx
import { Tpl, defineDir } from 'tpl-dot-ts'
import { Config } from './config.ts'

async function main() {
  const template = await Tpl.fromPath(import.meta, './templates')

  const output = defineDir({
    english: template.withContext(Config.init({ name: 'World' })),
    french: template.withContext(Config.init({ name: 'Monde' })),
  })

  await output.write('./generated')
  console.log('Done! Check the "generated" directory.')
}

main()
```

### 5. Run it!

```sh
chmod +x ./run.ts
./run.ts
```

Output:

```
generated/
├── english/
│   ├── greeting  (Hello, World!)
│   └── static.txt    (copied)
└── french/
    ├── greeting  (Hello, Monde!)
    └── static.txt    (copied)
```

## API Reference

### `Tpl.fromPath(importMeta, path)`

Loads a template from the file system.

-   `importMeta`: `import.meta` for relative path resolution.
-   `path`: Template file or directory path.

Returns a `Template`.

### `defineDir(entries)`

Defines a directory.

-   `entries`: File/directory names and their `Template` objects.

Returns a `TemplateDir`.

### `defineFile(content)`

Defines a file.

-   `content`: File content (string, JSON/YAML serializable, or a function returning the content).

Returns a `TemplateFile`.

### `createContext<T>(name, ?defaultValue)`

Creates a Context class.

-   `<T>`: Data type for the context.
-   `name`: Context name (for debugging).
-   `defaultValue`: An optional function `() => T` that returns a default value if no context is provided.

Returns a `Context` class with static methods `getContextValue()` and an instance constructor.

### `template.withContext(context)`

Attaches a context to a `Template`.

-   `context`: A `Context` instance.

Returns a new `Template`.

### `template.write(path)`

Writes the materialized template to disk.

-   `path`: Output directory.

## Recipes

### Composing Templates with `import`

Because templates are just ES modules, you can compose them using standard `import`/`export`.

**`user-profile.tpl.ts`**
```typescript
import { defineFile } from 'tpl-dot-ts'
import { UserContext } from './user-context.ts'

export default defineFile(() => {
  const { name, email } = UserContext.getContextValue()
  return `Name: ${name}\nEmail: ${email}`
})
```

**`main-template.tpl.ts`**
```typescript
import { defineDir } from 'tpl-dot-ts'
import userProfile from './user-profile.tpl.ts'

export default defineDir({
  'user/': defineDir({
    'profile.txt': userProfile,
  })
})
```

### Using Multiple Contexts

You can easily combine multiple contexts. The `.withContext()` method can be chained, and the contexts will be available to all children.

```typescript
// run.ts
import { Tpl, defineDir } from 'tpl-dot-ts'
import { ThemeContext } from './theme-context.ts'
import { UserContext } from './user-context.ts'
import myTemplate from './my-template.tpl.ts'

const templateWithContexts = myTemplate
  .withContext(new ThemeContext({ color: 'blue' }))
  .withContext(new UserContext({ name: 'Jane' }))

// Inside my-template.tpl.ts and its children, you can now access
// both ThemeContext.getContextValue() and UserContext.getContextValue().
```

### Creating a Custom Printer

While `tpl-dot-ts` handles JSON and YAML serialization automatically based on file extensions, you can customize the printers used by a subtree by providing a `PrinterContext`.

To use a custom printer, create a `PrinterContext` and add it to the template:

```typescript
import { defineFile, PrinterContext } from 'tpl-dot-ts'

export function toIni(data: Record<string, string>): string {
  return Object.entries(data)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
}

const printerContext = PrinterContext.appendedBy(
  {
    name: 'ini',
    print: (fileName: string, data: unknown, next: (data: unknown) => Promise<unknown>) => {
      if (fileName.endsWith('.ini') && typeof data === 'object') {
        return next(toIni(data))
      }
      return next(data)
    }
  }
)

export default defineFile(() => {
  const dbConfig = {
    host: 'localhost',
    port: '5432',
  }
  return dbConfig
}).withContext(printerContext)
// If this file is named 'config.ini', the output will be:
// host=localhost
// port=5432
```

Off course, if only one file is concerned, you can just return a string directly from your file template.

## License

MIT
