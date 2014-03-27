
test: lib/async.js test/async-test.js
	mocha test/async-test.js

doc: README.md

publish: checkout-master package.json
	npm publish
	git push



checkout-master:
	git checkout master

README.md: documentation.md bdd-spec.md
	cat documentation.md bdd-spec.md > README.md

bdd-spec.md: lib/async.js test/async-test.js
	mocha test/async-test.js -R markdown > bdd-spec.md

package.json: lib/async.js test/async-test.js README.md
	npm version patch -m "Upgrade package.json version to %s"

.PHONY: test publish master
