github:
	xdg-open https://github.com/fuunnx/tpl-dot-ts

version:
	(cd lib && pnpm bumpp)
  xdg-open https://github.com/fuunnx/tpl-dot-ts/releases

typecheck:
	pnpm tsc --noEmit

smoketest:
	(cd lib && pnpm build)
	pnpm dlx tsx ./examples/01-quick-start/run.ts
	pnpm dlx tsx ./examples/02-docker-compose/run.ts
	pnpm dlx tsx ./examples/03-printer-with-metadata/run.ts
