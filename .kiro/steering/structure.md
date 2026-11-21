# Project Structure

```
src/
  router.tsx          Router creation
  routeTree.gen.ts    Generated, do not edit
  styles.css          Tailwind entry and global styles
  routes/
    __root.tsx        Root document shell, head metadata, devtools
    index.tsx         Home route (/)
```

## Conventions
- Routes live in `src/routes/` and follow TanStack Router file naming (`foods.tsx`, `foods.$id.tsx`, `foods/index.tsx`). Each route file exports `Route`.
- Put reusable UI in `src/components/`, server functions in `src/server/`, and the Drizzle schema and client in `src/db/` once they are added.
- Files and folders use kebab-case or lowercase names. React components use PascalCase exports.
- Build output (`.output/`) and `.tanstack/` are generated. Don't edit or commit changes to them.
