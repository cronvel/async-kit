


# User rules

# The first rule is the default rule, when invoking "make" without argument...
# Let's do the same than "make doc" for instance.
all: doc

# This run the Mocha BDD test, display it to STDOUT & save it to log/mocha.log
test: log/mocha.log

# This build the doc and README.md
doc: README.md

# This publish to NPM and push to Github, if we are on master branch only
publish: log/npm-publish.log log/github-push.log

# Clean temporary things, or things that can be automatically regenerated
clean: clean-all



# Internal rules

# Mocha BDD STDOUT test
log/mocha.log: lib/async.js test/async-test.js
	mocha test/async-test.js | tee log/mocha.log

# Global doc
README.md: documentation.md bdd-spec.md
	cat documentation.md bdd-spec.md > README.md

# Mocha Markdown BDD spec
bdd-spec.md: lib/async.js test/async-test.js
	mocha test/async-test.js -R markdown > bdd-spec.md

# Upgrade version in package.json
package.json: lib/async.js test/async-test.js README.md
	npm version patch -m "Upgrade package.json version to %s"

# Publish to NPM
log/npm-publish.log: check-if-master-branch package.json
	npm publish | tee log/npm-publish.log

# Push to Github/master
log/github-push.log: lib/async.js test/async-test.js package.json
	git push | tee log/github-push.log



# PHONY rules

.PHONY: clean-all check-if-master-branch

# Delete files, mostly log and not versioned files
clean-all:
	rm -f log/*.log

# This will fail if we are not on master branch (grep exit 1 if nothing found)
check-if-master-branch:
	git branch | grep  "^* master$"

