.PHONY: install dev build test lint lint-fix commit serve-tts e2e e2e-headed

install:
	npm install
	npx husky

dev:
	npm run dev

build:
	npm run build

test:
	npm run test

test:watch:
	npm run test:watch

test:coverage:
	npm run test:coverage

lint:
	npm run lint

lint-fix:
	npm run lint:fix

serve-tts:
	pocket-tts serve --host 0.0.0.0 --port 8000

e2e:
	npm run e2e

e2e-headed:
	npm run e2e:headed

commit:
	@read -p "Commit message: " msg; \
	git add . && git commit -m "$$msg"
