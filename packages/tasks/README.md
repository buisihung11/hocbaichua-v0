# @repo/tasks

Trigger.dev tasks package for hocbaichua-v0.

## Development

Run the development server:

```bash
bun run dev
```

## Deploy

Deploy to production:

```bash
bun run deploy
```

## Usage

Import tasks in your apps:

```typescript
import { tasks } from "@repo/tasks/trigger";
import type { helloWorld } from "@repo/tasks";

const handle = await tasks.trigger<typeof helloWorld>("hello-world", {
  name: "World",
});
```
