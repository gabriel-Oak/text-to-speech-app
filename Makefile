.PHONY: install dev build test lint lint-fix commit serve-tts

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

commit:
	@read -p "Commit message: " msg; \
	git add . && git commit -m "$$msg"
