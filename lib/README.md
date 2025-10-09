# tpl-dot-ts

[![npm version](https://badge.fury.io/js/tpl-dot-ts.svg)](https://badge.fury.io/js/tpl-dot-ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful and flexible scaffolding library for generating entire projects from TypeScript templates.

## Core Concepts

`tpl-dot-ts` helps you generate files from templates. It's designed to be flexible and easy to understand, even for developers new to TypeScript. It's built on three main ideas.

### 1. Templates: The Blueprint

A "template" isn't just a single file; it can be an entire directory. When you point `tpl-dot-ts` to a directory, it will:

-   **Execute** all files ending in `.tpl.ts`.
-   **Copy** all other files and directories as-is.

The transformation rule for filenames is simple: the `.tpl.ts` extension is always removed.
> `[filename].tpl.ts` becomes `[filename]`

This allows you to scaffold complex projects with a mix of static files (like images or `.css` files) and dynamic, context-aware files.

Inside a `.tpl.ts` file, you define the output structure:

-   You use functions like `defineDir` and `defineFile` to declare directories and files.
-   The `export default` of a template determines the output.
-   Because templates are just TypeScript, you can use variables, functions, and `import`/`export` to organize your code and make it reusable.

```typescript
// a-simple-template.tpl.ts
import { defineFile, defineDir } from 'tpl-dot-ts'

export default defineDir({
  'README.md': defineFile('This is a README file.'),
  'src/': defineDir({
    'index.js': defineFile('console.log("hello world")')
  })
})
```

### 2. Context: The Data

A Context provides data to your templates. This is the key to making your templates reusable for different environments (e.g., `development` vs. `production`) or purposes, in a typesafe manner.

-   You create a context with `createContext`. This gives you a `Context` class.
-   Inside a template, you access the data with `MyContext.getContextValue()`.
-   You attach a context to a template using `.withContext(new MyContext(data))`.

This system allows you to keep your template structure clean and separate from the specific data it will use.

### 3. Inflation & Printers: The Output

`tpl-dot-ts` doesn't immediately write files. Instead, it builds a description of what *should* be written. The final step is the "inflation", where this description is turned into actual files and content on your disk.

A powerful feature here is the use of **Printers**. A "printer" is a function that knows how to convert a JavaScript object or value into a string for a specific file type.

-   For a `.json` file, the printer is `JSON.stringify`.
-   For a `.yaml` file, a printer would use a YAML library to serialize the object.
-   For a `.env` file, a printer would format the data as `KEY=VALUE` pairs.

This is often handled by utility functions you can write or share. For example, `defineFile({ hello: 'world' })` can produce a JSON file if the final file path ends with `.json`.

## Installation

```sh
npm install --save-dev tpl-dot-ts
```

```sh
yarn add --dev tpl-dot-ts
```

## Quick Start Guide

> **Note:** You can find a complete, runnable version of this guide in the [`examples/01-quick-start`](./examples/01-quick-start) directory.

Let's create a project that generates personalized greetings, including a static file.

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

First, the static file that will be copied as-is:

```
// templates/static.txt
This file is static and will be copied directly.
```

Next, the dynamic template that uses the context:

```typescript
// templates/greeting.tpl.ts
import { defineFile } from 'tpl-dot-ts'
import { Config } from '../config.ts'

// The default export defines the output. Here, it's a single file.
export default defineFile(() => {
  const config = Config.getContextValue()
  return `Hello, ${config.name}!`
})
```

### 3. Define the Context

Now, create the context file to provide data.

```typescript
// config.ts
import { createContext } from 'tpl-dot-ts'

type ConfigShape = { name: string }

export class Config extends createContext<ConfigShape>('config', () => ({ name: 'World' })) {
  // Add an initializer for convenience
  static init(data: ConfigShape) {
    return new Config(data)
  }
}
```

### 4. Create the Runner Script

Finally, the script that brings it all together.

```typescript
#!/usr/bin/env -S npx tsx
// The line above is a shebang. It tells the system to execute this
// file using 'tsx', a tool that can run TypeScript files directly.
// run.ts
import { Tpl, defineDir } from 'tpl-dot-ts'
import { Config } from './config.ts'

async function main() {
  // 1. Load the entire 'templates' directory.
  const template = await Tpl.from(import.meta, './templates')

  // 2. Define the output structure, applying a different context for each language.
  const output = defineDir({
    english: template.withContext(Config.init({ name: 'World' })),
    french: template.withContext(Config.init({ name: 'Monde' })),
  })

  // 3. Write the result to the 'generated' directory.
  await output.write('./generated')

  console.log('Done! Check the "generated" directory.')
}

main()
```

### 5. Run it!

Execute the script from your terminal:

```sh
# on first run, you need to make it executable
chmod +x ./run.ts
./run.ts
```

You will see a new `generated` directory containing both the dynamically generated and the static files:

```
generated/
├── english/
│   ├── greeting  (contains "Hello, World!")
│   └── static.txt    (copied)
└── french/
    ├── greeting  (contains "Hello, Monde!")
    └── static.txt    (copied)
```

## API Reference

### `Tpl.from(importMeta, path)`

Loads a template from the file system.

-   `importMeta`: Pass `import.meta` here. It's used to resolve the path relative to the current file.
-   `path`: A relative path to the template file or directory.

If `path` points to a directory, all `.tpl.ts` files are executed and other files are copied. If it points to a single file, only that file is loaded.

Returns an `Inflatable` object that can be customized with a context.

### `defineDir(entries)`

Defines a directory structure.

-   `entries`: An object where keys are file/directory names (e.g., `'src'` or `'README.md'`) and values are other `Inflatable` objects (from `defineDir`, `defineFile`, or `Tpl.from`).

Returns an `InflatableDir`.

### `defineFile(content)`

Defines a file.

-   `content`: The content of the file. This can be a `string`, any value that can be serialized to JSON or YAML (if the output file has that extension), or a function `() => content` that returns the content. Using a function allows you to access context.

Returns an `InflatableFile`.

### `createContext<T>(name, ?defaultValue)`

Creates a new Context class for providing type-safe data to templates.

-   `<T>`: The TypeScript type for the data this context will hold.
-   `name`: A string name for the context, used for debugging.
-   `defaultValue`: An optional function `() => T` that returns a default value if no context is provided.

Returns a `Context` class with static methods `getContextValue()` and an instance constructor.

### `inflatable.withContext(context)`

Attaches a context instance to an `Inflatable` (a template, dir, or file).

-   `context`: An *instance* of a `Context` class (e.g., `new MyContext({ ... })`).

Returns a new `Inflatable` with the context applied. All children of that inflatable will have access to the context.

### `inflatable.write(path)`

The final step. This "inflates" the template and writes the entire directory structure to the disk.

-   `path`: The root directory where the output will be written.

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

// You can import another template and place it in the desired location.
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

While `tpl-dot-ts` handles JSON and YAML serialization automatically based on file extensions, you might need a custom format. You can achieve this by having your `defineFile` function return a pre-formatted string.

> **Note:** This is the current recommended approach for custom formats. A more integrated, configurable printer system is planned for a future release.

Here is an example of a simple `.ini` file printer.

**`printers.ts`**
```typescript
export function toIni(data: Record<string, string>): string {
  return Object.entries(data)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
}
```

**`template.tpl.ts`**
```typescript
import { defineFile } from 'tpl-dot-ts'
import { toIni } from './printers.ts'

export default defineFile(() => {
  const dbConfig = {
    host: 'localhost',
    port: '5432',
  }
  return toIni(dbConfig)
})
// If this file is named 'config.ini', the output will be:
// host=localhost
// port=5432
```

## License

MIT
