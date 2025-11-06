github:
	xdg-open https://github.com/fuunnx/tpl-dot-ts

version:
	(cd lib && pnpm bumpp)
  xdg-open https://github.com/fuunnx/tpl-dot-ts/releases

typecheck:
	pnpm tsc --noEmit

smoketest:
	(cd lib && pnpm build)
	./examples/01-quick-start/run.ts
	./examples/02-docker-compose/run.ts
	./examples/03-printer-with-metadata/run.ts
