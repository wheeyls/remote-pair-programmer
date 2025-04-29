Coding conventions:

JavaScript

* Use ES6+ syntax
* import/export syntax, no commonjs

AB Tests

* Avoid excessive mocking, in favor of dependency injection and real tests.
* Use Jest conventions for test files
* Prefer fewer tests, with less focus on implementation details
  * Don't mock out dependencies unless absolutely necessary
* Prefer hard-coding expectations to using code to generate the answer
* There are old tests that heavily favor mocks, they should be refactored out when possible
* We have process.env calls to check for variables
  * Those should be heavily discouraged in favor of option passing from index.js or worker.js
  * Once we leave the outermost edges of the app, we shouldn't know that ENV is a thing
