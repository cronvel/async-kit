
# CSK Async

A simple and powerful async abstraction layer lib to easily write Node.js code.

* License: BSD
* Current status: beta
* Platform: Node.js only

While inspired in some way by [caolan/async](https://github.com/caolan/async), CSK Async uses a completely different approach.

Rather than having a whole bunch of specific functions, this lib provides a generic way to solve async code flow.
So anything that can be done by caolan/async lib can be converted to CSK Async, but the reverse is not always true.

Using natural syntax really easy to become familiar with, you will be able to code great things effortlessly, 
without cumbersome callback hell, and without coding again and again the same async pattern and logic.



# Quick example

```js
async.series( [
	function( callback ) {
		letsConnectToDatabase( callback ) ;
	} ,
	function( callback ) {
		letsQueryTheDatabase( callback ) ;
	} ,
	function( callback ) {
		doMoreQueries( callback ) ;
	}
] )
.exec( function( error , results ) {
	if ( error ) { console.log( 'Doh!' ) ; }
	else { console.log( 'Yay! Done!' ) ; }
} ) ;
```

This small example prepares an async job's list and executes it. 

All jobs are executed in series, one after one.

Each callback works the Node.js way, the first argument is always the *error* argument.

If one job fails (ie it triggers its callback with an error or any *truthy* value), all remaining jobs are skipped 
and the `exec()`'s callback is instantly called with that error.

When every jobs are finished, the `exec()`'s callback is called, the *results* argument contains an array of the *arguments* passed by each job to its callback.



# Features

### Code flow

* Series
* Parallel
* Race (parallel, stop when the first job finish without error)
* Waterfall (series, each job transmits its results to the next)
* While loop, do while loop
* Foreach
* Map
* Reduce
* Async if/and
* Async if/or
* Nested async if



### Modifier

* Set the parallel limit
* While conditions
* Repeat jobs a fixed amount of time
* Iterator
* Timeout for jobs (avoid pending jobs troubles)
* Retry jobs on error (useful for managing outgoing connection for example)
* Async/sync job's scheduling controle (turn sync jobs into async, change the *nice* value of the job's scheduler)
* Continue on error or not
* Transmission of all jobs' results or only results of the last job
* Then callback, if successful
* Else callback, for *async if*
* Catch callback, if an error occurs
* Finally callback, always executed
* Define input arguments to invoke `.exec()` with, that are transmitted to jobs
* Export a plan as a simple function



# Install

Use Node Package Manager:

    npm install csk-async



# Plan stage & exec stage concept

This is an important concept to understand when using this lib: there are two stages to perform an async flow.

In the first stage, you define the plan.
All plan definition returns an `async.Plan` object.

Then you can `.exec()` your plan as many time as you want. All the *exec* method family returns an *execContext* object.
The first time an `async.Plan` is `.exec()`, it becomes locked forever: you cannot modify it anymore.

The example above becomes:

```js
// Plan stage, jobs' definition
var plan = async.series( [
	function( callback ) {
		letsConnectToDatabase( callback ) ;
	} ,
	function( callback ) {
		letsQueryTheDatabase( callback ) ;
	} ,
	function( callback ) {
		doMoreQueries( callback ) ;
	}
] ) ;

// Change the plan, each job should terminate within 200ms
plan.timeout( 200 ) ;

// Exec stage
plan.exec( function( error , results ) {
	if ( error ) { console.log( 'Doh!' ) ; }
	else { console.log( 'Yay! Done!' ) ; }
} ) ;

plan.exec( function( error , results ) {
	if ( error ) { console.log( 'Doh x2!' ) ; }
	else { console.log( 'Yay! Again!' ) ; }
} ) ;

// No effect! Plan cannot be modified anymore!
plan.timeout( 200 ) ;
```



# Callbacks & the error argument

In most case, callbacks work in the Node.js fashion, except explicitly expressed otherwise.
The callback should always be called with arguments in this order:

```js
callback( [error] , [argument1] , [argument2] , ... ) ;
```

That's it: the first argument, if present, is always assumed to be the error argument.

CSK Async will assume that something is wrong with a job if it get **ANY** truthy value as the error argument,
weither it is an instanceof of *Error*, *true*, *'my error message'*, or any expression evaluated to true.
If you are unsure what are *truthy* and *falsy* values, 
[check this out](http://docs.nodejitsu.com/articles/javascript-conventions/what-are-truthy-and-falsy-values).



# Common use cases

### Perform asynchronous database queries

**Use case**: this is probably the most common use case for any website, we have to perform
a series of async query, each query should be sent after the previous one succeed.

```js
async.waterfall( [
	function getUserByLoginAndPassword( login , password , callback ) {
		dbUserCollection.findOne( { login: login, password: password } , callback ) ;
	} ,
	
	function getUserPhoto( userDocument , callback ) {
		dbPhotoCollection.findOne( { _id: userDocument.photoID } , callback ) ;
	}
] )
.timeout( 200 )
.then( function( photoDocument ) {
	httpResponse.writeHead( 200 , { 'Content-Type' : 'image/png' } ) ;
	httpResponse.write( photoDocument.rawData ) ;
	httpResponse.end() ;
} )
.catch( function( error ) {
	httpResponse.writeHead( 404 , { 'Content-Type' : 'text/plain' } ) ;
	httpResponse.write( '404 - Not found.' ) ;
	httpResponse.end() ;
} )
.execArgs( 'john@example.com' , 'god' ) ;
```

**Explanation**: 
- *async.waterfall()* declare a job list in *waterfall* mode, when one job finish, it pass arguments to the next job
- *dbUserCollection.findOne()* & *dbPhotoCollection.findOne* are some kind of MongoDB pseudo-code,
  they return a document from the collection
- *getUserPhoto()* receive a document of the authenticated user
- *timeout( 200 )* assume each job should perform within 200ms, if a job hit the time limit, it works as if
  the job itself passed an error to its callback, here *.catch()* is immediately triggered if it happens
- *.then()* declare a *then callback* in the *Plan* itself, it will be triggered if we manage to authenticate the user
  and get its photo
- *.catch()* declare a *catch callback* in the *Plan* itself, it will be triggered if a job fails
- *.execArgs()* is used when you do not want to pass callback to `.exec()`-like function, since by default
  `.exec()` assume than its last argument is the *finally callback*, so since we are in *waterfall* mode, every
  arguments passed to *execArgs()* are passed only to the first job

You can chain as many queries as you want, without burying them deeper and deeper in nested callback hell.



### Get informations on various mirror URL as fast as possible

**Use case**: we want to get some contents (JSON, HTML, RSS, etc), many mirrors are available 
but we don't want to try them one at a time, we want to try them all at once and finish 
as soon as possible, when the first non-error response is received.

```js
async.race( [ url1 , url2 , url3 , url4 ] )
.using( function( url , callback ) {
	getContentFromUrl( url , callback ) ;
} )
.then( function( contents ) {
	doSomethingWithContent( contents ) ;
} )
.catch( function( error ) {
	console.log( "Cannot get contents from any mirror" ) ;
} )
.exec() ;
```

**Explanation**: 
- *async.race()* declare a job list of four racing elements to process, in parallel mode, 
  triggering callback when the first non-error job finished
- *.using()* declare the function used to process them (iterator-like, if it means anything in a parallel context)
- *getContentFromUrl()* is a user-defined function that take an URL and a callback, try to get contents from
  that URL and call its callback the Node.js way: `callback( error , contents )`
- *.then()* declare a *then callback* in the *Plan* itself, it will be triggered if we get what we want
- *doSomethingWithContent()* is a user-defined function, that process the contents
- *.catch()* declare a *catch callback* in the *Plan* itself, it will be triggered if **ALL** jobs have failed
- here *.exec()* is called without argument, so it executes the *Plan* with no callback of its own: 
  if we do not want to re-use the *Plan* it improves readability to use *.then()* and *.catch()* directly
  in the *Plan* definition part.



### Async foreach

**Use case**: we have an array, we want to iterate it but there are some async code in the iterator, 
and we really want that each element to be processed one at a time. The native javascript *myArray.forEach()*
would parallelize the async part even if we don't want.

```js
async.foreach( myArray , function( element , callback ) {
	doSomethingAsyncWithElement( element , callback ) ;
} )
.exec( function( error ) {
	console.log( "Finished!" ) ;
} ) ;
```

**Explanation**: 
- *async.foreach( myArray , function )* define a job list with myArray, and specify an iterator function
- *doSomethingAsyncWithElement()* should trigger its callback when the job is finished
- When all element have been processed, the `.exec()`'s callback is triggered, as usual

You can as well add a ```.parallel()``` before `.exec()`, you still have the advantage versus native forEach()
of having a general callback triggered when everything is asynchronously done.

	

# Make

To make it work: `make install`

To build any buildable things: `make`

To run tests: `make test`

To rebuild documentation: `make doc`

To clean everything that can be automatically regenerated: `make clean`



# Reference

**/!\ Work in progress /!\\**

* [*Do* family factories](#ref.do.factories)
	* [async.do()](#ref.async.do)
	* [async.series()](#ref.async.series)
	* [async.parallel()](#ref.async.parallel)
	* [async.race()](#ref.async.race)
	* [async.waterfall()](#ref.async.waterfall)
	* [async.foreach()](#ref.async.foreach)
	* [async.map()](#ref.async.map)
	* [async.reduce()](#ref.async.reduce)
	* [async.while().do()](#ref.async.while.do)
	* [async.do().while()](#ref.async.do.while)
* [*Conditionnal* family factories](#ref.conditionnal.factories)
	* [async.and()](#ref.async.and)
	* [async.or()](#ref.async.or)
	* [async.if.and()](#ref.async.if.and)
	* [async.if.or()](#ref.async.if.or)
	* [Nested condition()](#ref.nested)
* [Class async.Plan](#ref.async.Plan)
	* [.do()](#ref..do)
	* [.parallel()](#ref..parallel)
	* [.race()](#ref..race)
	* [.waterfall()](#ref..waterfall)
	* [.while()](#ref..while)
	* [.repeat()](#ref..repeat)
	* [.fatal()](#ref..fatal)
	* [.boolean()](#ref..boolean)
	* [.transmitError()](#ref..transmitError)
	* [.timeout()](#ref..timeout)
	* [.retry()](#ref..retry)
	* [Mixing .timeout() & .retry()](#ref.mixing.timeout.retry)
	* [.lastJobOnly()](#ref..lastJobOnly)
	* [.mapping1to1()](#ref..mapping1to1)
	* [.using()](#ref..using)
	* [.iterator()](#ref..iterator)
	* [.aggregator()](#ref..aggregator)
	* [.nice()](#ref..nice)
	* [.then()](#ref..then)
	* [.else()](#ref..else)
	* [.catch()](#ref..catch)
	* [.finally()](#ref..finally)
	* [.clone()](#ref..clone)
	* [.export()](#ref..export)
	* [.exec()](#ref..exec)
	* [.execFinally()](#ref..execFinally)
	* [.execThenCatch()](#ref..execThenCatch)
	* [.execThenElse()](#ref..execThenElse)
	* [.execThenElseCatch()](#ref..execThenElseCatch)
	* [.execArgs()](#ref..execArgs)
* [Callback types](#ref.callback)
	* [thenCallback](#ref.callback.thenCallback)
	* [elseCallback()](#ref.callback.elseCallback)
	* [catchCallback()](#ref.callback.catchCallback)
	* [finallyCallback()](#ref.callback.finallyCallback)
	* [whileCallback()](#ref.callback.whileCallback)




<a name="ref.do.factories"></a>
## *Do* family factories

They create `async.Plan` object and set up the job's list.

Note that an `async.Plan` do not perform anything until its `.exec()` method is called (see Class async.Plan for details).
The following informations describe what happend when the plan is executed.

By default, jobs are processed one at a time.

If an error occurs, no new jobs will be processed.

Jobs should trigger their callback the Node.js way: `callback( error , [arg1] , [arg2] , ... )`.

The `finally` callbacks (see below) are triggered when the first error occurs or when all jobs are done.

Note: **all factories below are described relative to this point of reference.**
Only differences will be reported.



<a name="ref.async.do"></a>
### async.do( jobsList )

* jobsList `Array` or `Object`

This is the most generic factory, with default behaviour, with no further limitation.

See *Do* family factories above.



<a name="ref.async.series"></a>
### async.series( jobsList )

* jobsList `Array` or `Object`

Set up a job's list to be processed in series.

**Calling `.parallel()` on it has no effect, it will process jobs one at a time anyway.**



<a name="ref.async.parallel"></a>
### async.parallel( jobsList )

* jobsList `Array` or `Object`

Set up a job's list to be processed in parallel.
The parallel limit is set to `Infinity` by default.



<a name="ref.async.race"></a>
### async.race( jobsList )

* jobsList `Array` or `Object`

Set up a job's list to be processed in parallel.
The parallel limit is set to `Infinity` by default.

The whole jobs processing aborts when the first job finish without error.

Jobs processing continues on error.

Note that `async.race( jobsList )` is the same than `async.parallel( jobsList ).fatal( false ).race()`.



<a name="ref.async.waterfall"></a>
### async.waterfall( jobsList )

* jobsList `Array` or `Object`

Set up a job's list to be processed in series, in waterfall mode.

Each job is called with the previous job output as arguments.

By default, the `.exec()` method accept arguments to pass to the first job.

By default, the *error* argument is not transmitted, see [.transmitError()](#ref..transmitError) for details.

Only the last job pass its result to [*finallyCallback*](#ref.callback.finallyCallback), [*thenCallback*](#ref.callback.thenCallback) etc...
See [.lastJobOnly()](#ref..lastJobOnly) for details.

**Calling `.parallel()` on it has no effect, it will process jobs one at a time anyway.**

Example:
```js
async.waterfall( [
	function( str , callback ) {
		// str equals 'oh', passed by .exec()'s first argument
		callback( undefined , str + ' my' ) ;
		// undefined is the error argument, it is not transmitted to the next job by default
	} ,
	function( str , callback ) {
		// str equals 'oh my', passed by the previous job
		callback( undefined , str + ' wonderful' ) ;
		// undefined is the error argument, it is not transmitted to the next job by default
	} ,
	function( str , callback ) {
		// str equals 'oh my wonderful', passed by the previous job
		callback( undefined , str + ' result' ) ;
	}
] )
.exec( 'oh' , function( error , results ) {
	// output 'oh my wonderful result'
	console.log( results ) ;
} ) ;
```

Any number of arguments can be used.
The previous example can become something like this:

```js
async.waterfall( [
	function( str1 , str2 , str3 , callback ) {
		// str1 equals 'Hello', passed by .exec()'s first argument
		// str2 equals 'world', passed by .exec()'s second argument
		// str3 equals 'this', passed by .exec()'s third argument
		callback( undefined , str1 + ' ' + str2 + ' ' + str3 + ' is' ) ;
	} ,
	function( str , callback ) {
		// str equals 'Hello world, this is', passed by the previous job
		callback( undefined , str + ' my' , 'wonderful' ) ;
	} ,
	function( str1 , str2 , callback ) {
		// str1 equals 'Hello world, this is my', passed by the previous job
		// str2 equals 'wonderful', passed by the previous job
		callback( undefined , str1 + ' ' + str2 + ' result' ) ;
	}
] )
.exec( 'Hello' , 'world,' , 'this' , function( error , results ) {
	// output 'Hello world, this is my wonderful result'
	console.log( results ) ;
} ) ;
```



<a name="ref.async.foreach"></a>
### async.foreach( container , iterator )

* container `Array` or `Object` to iterate
* iterator `Function( element , [key] , [container] , callback )` where:
	* element `mixed` the current array element or object's property value
	* key `Number` or `String` the current key (index for array, property name for object)
	* container `Array` or `Object`, this is the original container
	* callback `Function( error , [arg1] , [arg2] , ... )` a node-style callback to trigger on completion

It performs an async foreach, iterating *container*, using *iterator*. 

Depending on `iterator.length` (the number of arguments the user-provided function accept), the arguments passed to *iterator*
will be `( element , callback )`, `( element , key , callback )`, or `( element , key , container , callback )`
where *element* is the current element, *key* is the current key (the current index if *container* is an Array,
or the current property's name if *container* is an object), *container* is the original container,
and *callback* is the completion's callback.

By default, *element*s are performed one at a time, in series.

If the *iterator* fails for one element, it will continue processing others elements anyway.

Note that `async.foreach( container , iterator )` is equal to `async.do( container ).iterator( iterator )`.

Example:
```js
var myArray = [ 'one' , 'two' , 'three' ] ;

async.foreach( myArray , function( key , element , callback ) {
	// Called three time, with element's value: 'one', then 'two', then 'three'
	doSomethingAsyncWithElement( element , callback ) ;
} )
.exec( function( error , results ) {
	thingsToDoWhenFinished() ;
} ) ;
```



<a name="ref.async.map"></a>
### async.map( container , iterator )

* container `Array` or `Object` to iterate
* iterator `Function( element , [key] , [container] , callback )` where:
	* element `mixed` the current array element or object's property value
	* key `Number` or `String` the current key (index for array, property name for object)
	* container `Array` or `Object`, this is the original container
	* callback `Function( error , [arg1] , [arg2] , ... )` a node-style callback to trigger on completion

It performs an async map, iterating *container*, using *iterator*.
An async map takes an array and produces a new array, each value in the input array is mapped into the output array, preserving indexes.
If an object is provided instead of an array, it produces a new object, preserving keys.

Depending on `iterator.length` (the number of arguments the user-provided function accept), the arguments passed to *iterator*
will be `( element , callback )`, `( element , key , callback )`, or `( element , key , container , callback )`
where *element* is the current element, *key* is the current key (the current index if *container* is an Array,
or the current property's name if *container* is an object), *container* is the original container,
and *callback* is the completion's callback.

By default, *element*s are performed in parallel mode.

If the *iterator* fails for one element, it will continue processing others elements anyway.

The *results* (see example below) directly map the *container*, like [`.mapping1to1()`](#ref...mapping1to1) do.

Note that `async.map( container , iterator )` is equal to `async.do( container ).iterator( iterator ).mapping1to1()`.

Example:
```js
var myArray = [ 'my' , 'wonderful' , 'result' ] ;

async.map( myArray , function( element , callback ) {
	
	setTimeout( function() {
		callback( undefined , element.length ) ;
	} , 0 ) ;
} )
.exec( function( error , results ) {
	// we expect results to be equal to [ 2, 9, 6 ]
	expect( results ).to.be.eql( [ 2, 9, 6 ] ) ;
} ) ;
```



<a name="ref.async.reduce"></a>
### async.reduce( container , [aggregatedValue] , iterator )

* container `Array` or `Object` to iterate
* aggregatedValue `mixed` the initial default reduced (aggregated) value
* iterator `Function( aggregatedValue , element , [key] , [container] , callback )` where:
	* aggregatedValue `mixed` the current reduced value
	* element `mixed` the current array element or object's property value
	* key `Number` or `String` the current key (index for array, property name for object)
	* container `Array` or `Object`, this is the original container
	* callback `Function( error , newAggregatedValue , [arg1] , [arg2] , ... )` a node-style callback to trigger on completion, where:
		* newAggregatedValue `mixed` is the new reduced value that will be passed to the next iteration

It performs an async reduce, iterating *container*, using *iterator*.
An async reduce takes an array (or an object), and iterate it to produce a single reduced value (though actually this single *value*
can be anything we like, even an array or object).

Depending on `iterator.length` (the number of arguments the user-provided function accept), the arguments passed to *iterator*
will be `( aggregatedValue , element , callback )`, `( aggregatedValue , element , key , callback )`,
or `( aggregatedValue , element , key , container , callback )`, where *aggregatedValue* is the current reduced value,
*element* is the current element, *key* is the current key (the current index if *container* is an Array,
or the current property's name if *container* is an object), *container* is the original container,
and *callback* is the completion's callback.

Each *element* is processed one at a time, in series.
**Calling `.parallel()` on this `async.Plan` has no effect, it will process jobs one at a time anyway.**

If the *iterator* fails for one element, the whole process *aborts and fails*.

**If you do \*NOT\* provide a default aggregatedValue in the `async.Plan`, then the `.exec()` method require an initial *aggregatedValue* as its first argument.**

Note that `async.reduce( initialAggregatedValue , container , iterator )` is equal to
`async.do( container ).iterator( iterator ).aggregator( true , true , initialAggregatedValue )`.

Example:
```js
var myArray = [ 'my' , 'wonderful' , 'result' ] ;

var plan = async.reduce( myArray , function( aggregate , element , callback ) {
	
	setTimeout( function() {
		// Asyncly calculate the sum of the length
		callback( undefined , aggregate + element.length ) ;
	} , 0 ) ;
} )
// No aggregatedValue is provided in the async.Plan creation,
// so the first argument of exec() must be the initial aggregatedValue.
.exec( 0 , function( error , results ) {
	// we expect results to be equal to 17
	expect( results ).to.be.eql( 17 ) ;
} ) ;
```



<a name="ref.async.while.do"></a>
### async.while( whileCallback ).do( jobsList )

* [whileCallback](#ref.callback.whileCallback) `Function( error , results , logicCallback )` triggered for checking if we have to continue or not, where:
	* error `mixed` any truthy means error
	* results `Array` or `Object` that maps the *jobsList*
	* logicCallback `Function( [error] , loopAgain )` where:
		* error `mixed` any truthy means error
		* loopAgain `Boolean` anything else is considered either *truthy* or *falsy*
* jobsList `Array` or `Object`

It performs an async while loop.
This is equivalent to javascript code:
```js
while ( expression ) {
	// do something
}
```

Unlike others factories, in order to mimic native language syntax, this factory accepts a [*whileCallback*](#ref.callback.whileCallback) 
rather than a job's list. 
So you have to use the `async.Plan`'s `.do()` method to pass the job's list.

Async while loops behave diffently than other `async.Plan` in various way:
* it first performs an async conditionnal check, if the outcome is falsy, then the execution is immediately aborted
* it performs jobs, just the way other `async.Plan` do, but:
* when everything is done, it performs again a conditionnal check, and if its outcome is truthy, it loops again (and again, etc...)
* when the outcome of the conditionnal check is falsy, callbacks (*finally, then, catch, else*) are triggered 
with the results of the last iteration only (if any), so older iteration's results are lost unless checked and used
in the [*whileCallback*](#ref.callback.whileCallback).

Example:
```js
async.while( function( error , results , logicCallback ) {
	// If doMoreWorksFunction() triggers its callback demanding another loop...
	logicCallback( results.moreWorks[ 1 ] === 'loop' ) ;
} )
.do( {
	preliminaries: doPreliminariesFunction ,
	works: doWorksFunction ,
	moreWorks: doMoreWorksFunction
} ) 
.exec( function( error , results ) {
	// 'results' contains only the results of the last loop
	thingsToDoWhenFinished() ;
} ) ;
```



<a name="ref.async.do.while"></a>
### async.do( jobsList ).while( whileCallback )

* jobsList `Array` or `Object`
* [whileCallback](#ref.callback.whileCallback) `Function( error , results , logicCallback )` triggered for checking if we have to continue or not, where:
	* error `mixed` any truthy means error
	* results `Array` or `Object` that maps the *jobsList*
	* logicCallback `Function( [error] , loopAgain )` where:
		* error `mixed` any truthy means error
		* loopAgain `Boolean` anything else is considered either *truthy* or *falsy*

It performs an async do-while loop.

It works exactly the same as [async.while().do()](#ref.async.while.do), except that, by default, the [*whileCallback*](#ref.callback.whileCallback)
is triggered at the end of the process rather than at the beginning.
This is equivalent to javascript code:
```js
do {
	// do something
} while ( expression )
```



<a name="ref.factories.conditionnal"></a>
## *Conditionnal* family factories

The following factories instanciate `async.Plan` of the *conditionnal* family.
There are few differencies with `async.Plan` of the *do* family.

Jobs have three type of outcome: true, false and error.

Jobs should trigger their callback this way: `callback( [error] , result )`.
In this case, you are not forced to pass the error argument first.
However, if you pass only one argument, it will be assumed to be an error only if it is an instance of `Error`.

If an error occurs, it will stop processing any new jobs by default.
If *true* or *false* is the outcome, then it all depends on the type of conditionnal.

There are two mode: boolean or not.
When boolean mode is used, any non-error outcome are cast to a boolean value.
In non-boolean mode, the final outcome is simply the outcome of the last processed job.
The non-boolean mode is in line with the way javascript handle expression like `myVar1 && myVar2`
(it will produce *myVar1* if *myVar1* is falsy, else *myVar2*).

By default, jobs are performed in series, one at a time.
It is possible to parallelize jobs processing, but it can change the final outcome in non-boolean mode,
though the truthness of that outcome remains unchanged.



<a name="ref.async.and"></a>
### async.and( jobsList )

* jobsList `Array` or `Object`

It performs an async conditionnal *AND*, so it keeps processing jobs as long as the outcome is truthy.

By default, it uses the non-boolean mode, so the final outcome is the outcome of the last job.



<a name="ref.async.or"></a>
### async.or( jobsList )

* jobsList `Array` or `Object`

It performs an async conditionnal *OR*, so it keeps processing jobs as long as the outcome is falsy.

By default, it uses the non-boolean mode, so the final outcome is the outcome of the last job.



<a name="ref.async.if.and"></a>
### async.if.and( jobsList )

* jobsList `Array` or `Object`

It performs an async conditionnal *AND*, so it keeps processing jobs as long as the outcome is truthy.

By default, it uses the boolean mode, so the final outcome is a boolean.



<a name="ref.async.if.or"></a>
### async.if.or( jobsList )

* jobsList `Array` or `Object`

It performs an async conditionnal *OR*, so it keeps processing jobs as long as the outcome is falsy.

By default, it uses the boolean mode, so the final outcome is a boolean.



<a name="ref.nested"></a>
### Nested condition

We can create nested conditionnal statement just like in native language. See the following example:

```js
async.if.and( [
	ifSomeConditionsAreMetAnd
	async.or( [
		ifSomeMoreConditionsAreMet
		orIfSomeAlternativeConditionsAreMet
	] )
] )
.then( function() {
	// Do something if the async conditionnal statement is true
} )
.else( function() {
	// Do something if the async conditionnal statement is false
} )
.exec() ;
```
`ifSomeConditionsAreMetAnd`, `ifSomeMoreConditionsAreMet` and `orIfSomeAlternativeConditionsAreMet` 
are user functions asyncly checking if some conditions are met or not.

This works because if a job is an instance of `async.Plan`, the `.exec()` method will be used as a callback.

We can use as many nested async conditionnal as we want.



<a name="ref.async.Plan"></a>
## Class async.Plan

Each factory come with a default set of behaviour. 
Almost all behaviours can be modified by methods.

However, modifier methods have no effect as soon as an `.exec()` family method is used on the current `async.Plan`.



<a name="ref..do"></a>
### .do( jobsList )

* jobsList `Array` or `Object`

It set the job's list.
Most of time, the job's list is already passed as the first argument of a factory, so we don't have to use this method.

However, it is used in the [`async.while().do()`](#ref.async.while) scheme, to mimic common programming language syntax.



<a name="ref..parallel"></a>
### .parallel( [parallelLimit] )

* parallelLimit `Number`, if omited: `Infinity`

It set the parallel limit or concurrency limit.
This is the number of async jobs that can be running/pending at a time.

Using a parallel limit value of 1, jobs are processed one at a time, like `async.series()` factory does.

Using a parallel limit value of Infinity, jobs are processed all at once (if they are async),
like `async.parallel()` factory does.

Using a parellel limit value of 3, for example, the first three jobs will start at once, when one jobs
triggers its callback the fourth job starts, when another job triggers its callback then the fifth job starts,
and so on...



<a name="ref..race"></a>
### .race( raceMode )

* raceMode `Boolean`, if omited: `true`

Set the *race* mode.

In *race* mode, the whole jobs processing aborts when the first job finish without error.

See [`async.race()`](#ref.async.race) factory.



<a name="ref..waterfall"></a>
### .waterfall( waterfallMode )

* waterfallMode `Boolean`, if omited: `true`

Set the *waterfall* mode.

In *waterfall* mode, each job is called with the previous job output as arguments,
and the first job receives arguments directly from `.exec()`.

See [`async.waterfall()`](#ref.async.waterfall) factory.



<a name="ref..while"></a>
### .while( whileCallback , whileActionBefore )

* [whileCallback](#ref.callback.whileCallback) `Function( error , results , logicCallback )` triggered for checking if we have to continue or not, where:
	* error `mixed` any truthy means error
	* results `Array` or `Object` that maps the *jobsList*
	* logicCallback `Function( [error] , loopAgain )` where:
		* error `mixed` any truthy means error
		* loopAgain `Boolean` anything else is considered either *truthy* or *falsy*
* whileActionBefore `Boolean`, if omited: `false`

Set a *while* loop mode.

The argument *whileActionBefore* is used to define if the condition should be evaluated at the begining of the loop
or at the end of the loop.

See [async.while().do()](#ref.async.while.do) (if *whileActionBefore* is true) or
[async.do().while()](#ref.async.do.while) (if *whileActionBefore* is false) for details.



<a name="ref..repeat"></a>
### .repeat( n )

* n `Number`

Set loop mode, the job's list will run *n* times.

Actually this is a shortcut, it simply set up a *while* loop with a trivial callback.
Avoid to reinvent the wheel again and again.

See [.while()](#ref..while) for details.



<a name="ref..fatal"></a>
### .fatal( [errorsAreFatal] )

* errorsAreFatal `Boolean`, if omitted: true

If errors are fatal (the default in most factories), then whenever a job fails the whole process is aborted immediately.

If error are not fatal, others jobs will be processed even if some errors occurs.



<a name="ref..boolean"></a>
### .boolean( [castToBoolean] )

* castToBoolean `Boolean`, if omitted: true

This only have effects in *Conditionnal* family `async.Plan`.

If *castToBoolean* is true, the outcome of jobs and the final outcome is always `true` or `false`:
this is what happens with `async.if.and()` and `async.if.or()` factories by default.

If *castToBoolean* is false, the outcome of each job remains unchanged, and the final outcome is 
the outcome of the last job: this is what happens with `async.and()` and `async.or()` factories by default.



<a name="ref..transmitError"></a>
### .transmitError( [transmit] )

* transmit `Boolean`, if omitted: true

This only have effects in waterfall mode, using `async.waterfall()` factory.

If *transmit* is true, each job received the *error* argument of the previous job.

If *transmit* is false, the *error* argument pass by the previous job is not transmitted.

Example with `.transmitError`:
```js
async.waterfall( [
	function( str , callback ) {
		// str equals 'oh', passed by .exec()'s first argument
		callback( undefined , str + ' my' ) ;
	} ,
	function( lastError , str , callback ) {
		// lastError equals undefined
		// str equals 'oh my', passed by the previous job
		callback( new Error() , str + ' wonderful' ) ;
	} ,
	function( lastError , str , callback ) {
		// lastError is now an instance of Error
		// str equals 'oh my wonderful', passed by the previous job
		callback( undefined , str + ' result' ) ;
	}
] )
.transmitError( true )
.fatal( false )
.exec( 'oh' , function( error , results ) {
	// output 'oh my wonderful result'
	console.log( results ) ;
} ) ;
```



<a name="ref..timeout"></a>
### .timeout( [jobsTimeout] )

* jobsTimeout `undefined` or `Number` (in ms), if omited: `undefined`

Set up a time limit for each job.
If a job doesn't trigger its callback within this time, its callback is triggered anyway automatically with an error:
`new Error( 'Timeout' )`.

If the job triggers its callback later, it will be ignored.

It comes in handy in any network or service dependant async jobs, like database queries, HTTP request, and so on.

Also this is **IMPORTANT** to understand that this is the csk-async lib who is responsible for the timeout to kick in:
the user code is still in execution, it may be pending, waiting for I/O to perform some other tasks.
The timeout feature give us the chance to be sure that our callback get triggered within some time limit, **it doesn't
interupt the job in any way**.



<a name="ref..retry"></a>
### .retry( [maxRetry] , [baseTimeout] , [multiply] , [maxTimeout] )

* maxRetry `Number`, it doesn't update if omited
* baseTimeout `Number` in **ms**, it doesn't update if omited
* multiply `Number`, it doesn't update if omited
* maxTimeout `Number`, in **ms**, it doesn't update if omited

This modifier allows jobs in error to be retried.

This is a very nice feature when dealing with other servers or external services, because they could be unavailable at any time,
but we don't want important tasks to fail.

It allows fine tuning:
* maxRetry: the maximum number of times a job should be retried, before giving up with the last error
* baseTimeout: the base timeout in **ms** before retrying, this is the timeout before the first retry
* multiply: the timeout before retrying is multiplied by this value for each new retry
* maxTimeout: the maximum timeout in **ms**, it will never be more despite the increasing retries with a multiply value > 1.

For example, assuming `maxRetry: 6, baseTimeout: 100, multiply: 1.5, maxTimeout: 500`, we will get for each retry 
the timeout value:
* 1st - 100ms
* 2nd - 150ms (=100*1.5)
* 3rd - 225ms (=150*1.5)
* 4th - 338ms (=225*1.5)
* 5th - 500ms (capped by maxTimeout)
* 6th - 500ms (capped by maxTimeout)

A good practice is to specify a low *baseTimeout*, around 10ms, and a high *multiply* value, at least 2.
This way, things keep reactive when a sporadic error occurs, but if something is really wrong with some of our servers,
we didn't flood them to death, we give them a chance to recover.

If *maxRetry* is high, we may consider using a *maxTimeout* value, between 10 seconds and 2 minutes.
This could be really bad if some actions are retried few hours or few days later, totally out of context.

By the way, those are general guidance, it all depends on the criticy of the tasks, wheither it involves local, lan, vlan
or internet networks, and more importantly: if those actions take place behind the scene or if some end-user are currently
expecting results quickly.

Example, with some *behind the scene* *cron*-like tasks, involving third-party services:
```js
async.parallel( [
	retrieveSomeRSS ,
	querySomeThirdPartyAPI ,
	queryMoreThirdPartyAPI
] )
// At most 100 retries, starting with a 100 ms timeout before retrying,
// multiplying timeout by 2 at each new try but capped at 10 minutes timeout
.retry( 100 , 100 , 2 , 60000 )
.exec( function( error , results ) {
	// update your local database or cache
} ) ;
```



<a name="ref.mixing.timeout.retry"></a>
### Mixing .timeout() & .retry()

Mixing `.timeout()` and `.retry()` can be extremely powerful.

Sometime a task can end up pending a long time, because some bugs occurs, but a retry can eventually succeed immediately: 
probably we sent a request on some third-party, we get load-balanced to a server that do not respond anymore, but issuing
a new request may end up to a server that still works well.

This is exactly what can achieve a mix of `.timeout()` and `.retry()`: when the *timeout* is reached for a job,
it triggers its callback with a failed status (`new Error( 'Timeout' )`), then *retry* kick in and the job start over,
it may hit the time limit again and be restarted again, until it succeeds or the retry countdown abort the whole process.

Also there are **IMPORTANT** drawback we need to be aware of:
* when a timeout occurs, the job is **\*NOT\*** interupted in any way (see [`.timeout()`](#ref..timeout) for details)
* so when successive retries kick in, the same job can run multiple times: our job's code should support that without
  messing our database for example
* also if a job timeout and is retried, the first try *may* finally succeed before the second try complete: our job's
  code should support that case too

As a rule of thumb, if we plan to mix `.timeout()` and `.retry()`, we must isolate as much as possible critical code,
creating more jobs that perform small task is better.

For example, this is a **\*VERY\* bad** practice:
```js
async.do( [
	queryMultipleExternalServicesAndThenUpdateOurLocalDatabaseAccordingly
] )
.timeout( 100 )
.retry( 100 , 100 , 2 , 60000 )
.exec( function( error , results ) {
	console.log( 'Done!' ) ;
} ) ;
```

We have to consider rewriting it this way:
```js
async.parallel( [
	queryExternalService1 ,
	queryExternalService2 ,
	queryExternalService3
] )
.timeout( 100 )
.retry( 100 , 100 , 2 , 60000 )
.exec( function( error , results ) {
	if ( ! error ) {
		updateOurLocalDatabaseAccordingly( results ) ;
	}
} ) ;
```

In the last snippet, we have isolated jobs that can timeout due to things that are out of our control.
If one query failed, we don't have to restart from scratch, re-doing queries that have already succeeded.
Finally, moving `updateOurLocalDatabaseAccordingly()` into the [*finallyCallback*](#ref.callback.finallyCallback)
of `.exec()` allows us to use the parallel mode, so the whole process perform faster.
If we had chosen to put this function into a job, we would have been constrained to use an `async.series()` factory.
More important: we are sure that the code that update our database will run once.



<a name="ref..lastJobOnly"></a>
### .lastJobOnly( [returnLastJobOnly] )

* returnLastJobOnly `boolean`, if omited: `true`

If set to `true`, only the last job pass its result to [*finallyCallback*](#ref.callback.finallyCallback),
[*thenCallback*](#ref.callback.thenCallback) etc...

Without `.lastJobOnly()` (the default in most factories):
```js
async.series( [
	function( callback ) { callback( 'undefined' , 'my' ) ; } ,
	function( callback ) { callback( 'undefined' , 'wonderful' ) ; } ,
	function( callback ) { callback( 'undefined' , 'result' ) ; }
] )
.exec( function( error , result ) {
	// result equals `[ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ]`
} ) ;
```

With `.lastJobOnly()` (default in `async.waterfall()` and `async.race()` factories):
```js
async.series( [
	function( callback ) { callback( 'undefined' , 'my' ) ; } ,
	function( callback ) { callback( 'undefined' , 'wonderful' ) ; } ,
	function( callback ) { callback( 'undefined' , 'result' ) ; }
] )
.lastJobOnly()
.exec( function( error , result ) {
	// result equals `'result'`
} ) ;
```

**BE CAREFUL:** when using `.lastJobOnly()` in parallel mode, this is the job that finish last which transmits its results.
This is **\*NOT\* necessarly** the last job in the job's list.
Note that `.lastJobOnly()` is used in `async.race()` factory, but here the whole process abort when the first job finish
without error, so the first job and the last job are the same.



<a name="ref..mapping1to1"></a>
### .mapping1to1( [returnMapping1to1] )

* returnMapping1to1 `Boolean`, if omited: `true`

If set to `true`, the *results* directly map the *jobsList*.
It is used (and locked) in `async.map()` factory.

If set to `false`, the *results* contains for each entry, the whole argument's list
passed by the job's callback.

Without `.mapping1to1()` (the default in most factories):
```js
async.parallel( [
	function( callback ) { callback( 'undefined' , 'my' ) ; } ,
	function( callback ) { callback( 'undefined' , 'wonderful' ) ; } ,
	function( callback ) { callback( 'undefined' , 'result' ) ; }
] )
.exec( function( error , results ) {
	// results equals `[ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ]`
} ) ;
```

With `.mapping1to1()` (the default in `async.map()` factory):
```js
async.parallel( [
	function( callback ) { callback( 'undefined' , 'my' ) ; } ,
	function( callback ) { callback( 'undefined' , 'wonderful' ) ; } ,
	function( callback ) { callback( 'undefined' , 'result' , 'extra argument that will be dropped' ) ; }
] )
.exec( function( error , results ) {
	// results equals `[ 'my' , 'wonderful' , 'result' ]`
} ) ;
```

**Note:** when using `.mapping1to1()`, any extra arguments passed to the job's callback are ignored.



<a name="ref..using"></a>
### .using( various )

* various `Function`, `Array` or `Object`

Argument passed to `.using()` is used in combination with the job's list.
Behaviours all depend on the type of the arguments.

In the following `.using()` variation, `async.do()` can be replaced by any `async.Plan`'s factory.

#### async.do( jobsData ).using( workerFunction )

* jobsData `Array` (or `Object`) of `Array`
* workerFunction `Function`

When combining `.do()` and `.using()` this way, each job contains an array of arguments to pass to *workerFunction*.

Example:

```js
async.do( [
	[ 'http://example.com/' , 500 ] ,
	[ 'http://example.com/forum/' , 800 ] ,
	[ 'http://example.com/blog/' , 200 ]
] )
.using( function( url , timeout ) {
	// Async check of url, with some timeout
} )
.exec( function( error , results ) {
	if ( ! error )  { console.log( "Success!" ) ; }
} ) ;
```

Also, if your *workerFunction* only accepts one argument, you can avoid *Array of Array* construct:

```js
async.do( [
	'http://example.com/' ,
	'http://example.com/forum/' ,
	'http://example.com/blog/'
] )
.using( function( url ) {
	// Async check of url
} )
.exec( function( error , results ) {
	if ( ! error )  { console.log( "Success!" ) ; }
} ) ;
```

#### async.do( jobsList ).using( args )

* jobsList `Array` (or `Object`) of `Function`
* args `Array`

This is the opposite.
Here we have a list of different function, but they take the same arguments.


Example:
```js
async.do( [
	dnsResolve ,
	ping ,
	httpGet
] )
.using( 'http://example.com/' )
.exec( function( error , results ) {
	if ( ! error )  { console.log( "Success!" ) ; }
} ) ;
```

In the previous snippet, `.using()` provide the data, and `.do()` provide the actions, where *dnsResolve*, *ping*
and *httpGet* are three functions that take an URL as their first arguments. The *dnsResolve* function will convert
the URL into an IP addresse, then *ping* will er... ping this IP, and finally *httpGet* will forge an HTTP request
and get the page content.



<a name="ref..iterator"></a>
### .iterator( iteratorFunction )

* iteratorFunction `Function( element , [key] , [container] , callback )` where:
	* element `mixed` the current array element or object's property value
	* key `Number` or `String` the current key (index for array, property name for object)
	* container `Array` or `Object`, this is the original container
	* callback `Function( error , [arg1] , [arg2] , ... )` a node-style callback to trigger on completion

With `.iterator( iteratorFunction )` our jobs become data for *iteratorFunction*. 
This is close to the behaviour of `.using( workerFunction )`, except that an iterator function is not called the same way.

Rather than processing each element of the `Array` as an array of arguments, here the whole element is passed as the
first argument of the iterator.

In fact, `async.do( container ).iterator( iteratorFunction )` is equal to `async.foreach( container , iteratorFunction )`.

See [async.foreach()](#ref.async.foreach) for details.



<a name="ref..aggregator"></a>
### .aggregator( transmitAggregate , returnAggregate , defaultAggregate )

* transmitAggregate `Boolean`, if omited: `true`
* returnAggregate `Boolean`, if omited: `true`
* defaultAggregate `mixed`, this is the default value

This set or unset the current `async.Plan` as an aggregator.

Note that `async.do( container ).iterator( iterator ).aggregator( true , true , initialAggregatedValue )`
is equal to `async.reduce( initialAggregatedValue , container , iterator )`.
For more details, see [async.reduce()](#ref.async.reduce).

If *transmitAggregate* is set, then the *iterator* (or job's function) receive the current *aggregatedValue*
as its first argument, all other arguments being shifted to the right.

If *returnAggregate* is set, then the *results* passed to callback (*then*, *catch* and *finally* callback)
only contains the *aggregatedValue*.

If *defaultAggregate* is set, this is what will be used as the starting value for *aggregatedValue*.



<a name="ref..nice"></a>
### .nice( niceness )

* niceness `Number` between *-3* and `Infinity`

This try to mimic the unix command `nice` and `renice`.
This set up how the job's scheduler behaves.

It depends on the *niceness* value:
* *-3* is for synchonous scheduling: the scheduler process as fast as possible, if jobs provided by user are synchronous,
  everything will be synchronous and will be executed in one code flow, in that particular case, there will be no difference
  between `async.series()` or `async.parallel()`. 
* *-2* is for asynchronous scheduling, it uses `process.nextTick()` internally. Basicly, it will run almost as fast as
  synchronous mode, but each time the scheduler kick in, it will run new jobs in another code execution flow.
  This still let us time to define things after `.exec()` that will be run before any synchronous or asynchronous jobs.
  Also it will schedule before I/O most of times
  (see [process.nextTick()](http://nodejs.org/api/process.html#process_process_nexttick_callback) for details).
* *-1* is for asynchronous scheduling, it uses `setImmediate()` internally. This scheduling allows I/O to be performed
  (see [setImmediate()](http://nodejs.org/api/timers.html#timers_setimmediate_callback_arg) for details).
* *>=0* is for asynchronous scheduling, it uses `setTimeout()` internally. This scheduling allows I/O to be performed
  and much more. The *niceness* value multiplied by 10 is used as the delay for `setTimeout()`, so using `.nice(10)`
  means that the scheduler will delay further action for 100ms
  (see [setTimeout()](http://nodejs.org/api/timers.html#timers_settimeout_callback_delay_arg) for details).

By default, if `.nice()` is not called, the scheduler is synchronous.

Synchronous scheduling is just fine in usual case.
However, we may have **stack overflow** issues if loop, `.retry()` or just an huge job's list is involved, because everything
use nested callback the way we would have done it, those nested callback are just abstracted away by the lib,
but still remains behind the scene.

Asynchronous scheduling uses the javascript's *event loop*, so there is no more infinite nested callback possible.
It can scale better for big job's list, loop and `.retry()`...

If we have a big synchronous task to do, we can divide it into many jobs, then use for example:
```js
async.series( jobsList ).nice( 0 ).exec() ;
```
... to *asyncify* it a bit. This can be very important for services: our application must keep accepting
new request during the big task processing. Also if the task is really that big, it is usually a good practice 
to spawn a process or create a new specific service for this particular task anyway.



<a name="ref..then"></a>
### .then( thenCallback )

* [thenCallback](#ref.callback.thenCallback) `Function( results )`
	* results `mixed`, depends on options

This set up a *then* callback part of the `async.Plan` itself.
See [thenCallback](#ref.callback.thenCallback) for details.



<a name="ref..else"></a>
### .else( elseCallback )

* [elseCallback](#ref.callback.elseCallback) `Function( results )`
	* results `mixed`, depends on options

This set up an *else* callback part of the `async.Plan` itself.
See [elseCallback](#ref.callback.elseCallback) for details.

This has no effect for *Do* family `async.Plan`.



<a name="ref..catch"></a>
### .catch( catchCallback )

* [catchCallback](#ref.callback.catchCallback) `Function( error , results )`
	* error `mixed`, depends on jobs' code
	* results `mixed`, depends on options

This set up a *catch* callback part of the `async.Plan` itself.
See [catchCallback](#ref.callback.catchCallback) for details.



<a name="ref..finally"></a>
### .finally( finallyCallback )

* [finallyCallback](#ref.callback.finallyCallback) `Function( error , results )`
	* error `mixed`, depends on jobs' code
	* results `mixed`, depends on options

This set up a *finally* callback part of the `async.Plan` itself.
See [finallyCallback](#ref.callback.finallyCallback) for details.



<a name="ref..clone"></a>
### .clone()

This method is used to clone an `async.Plan` and return it.

The cloned `async.Plan` is **unlocked**: we can use its modifier methods even if the original `async.Plan` is locked
or is currently under execution.



<a name="ref..export"></a>
### .export()

This export and return an `async.Plan` as a function.
The exported function behaves exactly like the `.exec()` method of the `async.Plan`.

Since the `async.Plan` is internally cloned, changes made on the original `async.Plan` do **not** change how the exported function behaves.



<a name="ref..exec"></a>
### .exec( ... )

This method execute the `async.Plan`.

Until an exec-like method is called, nothing happens at all, previous methods mostly configure the `async.Plan`.

Arguments passed to `.exec()` depend on factories by default, and can be modified by [`.execMapping()`](#ref..execMapping).

However, most factories use this scheme:

`.exec( [arg1] , [arg2] , ... , [finallyCallback](#ref.callback.finallyCallback) )`.

* arg1, arg2, ... `mixed` : arguments to pass to all the jobs (or to the first job only in *waterfall* mode)
* [finallyCallback](#ref.callback.finallyCallback) `Function( error , results )`
	* error `mixed`, depends on jobs' code
	* results `mixed`, depends on options

Following `.exec()`-like methods have a static scheme, and are not modified by [`.execMapping()`](#ref..execMapping).



<a name="ref..execFinally"></a>
### .execFinally( finallyCallback )

* [finallyCallback](#ref.callback.finallyCallback) `Function( error , results )`
	* error `mixed`, depends on jobs' code
	* results `mixed`, depends on options

This method execute the `async.Plan`, just like [`.exec()`](#ref..exec).
It only accepts one argument: the [finallyCallback](#ref.callback.finallyCallback).



<a name="ref..execThenCatch"></a>
### .execThenCatch( thenCallback , catchCallback , [finallyCallback] )

* [thenCallback](#ref.callback.thenCallback) `Function( results )`
	* results `mixed`, depends on options
* [catchCallback](#ref.callback.catchCallback) `Function( error , results )`
	* error `mixed`, depends on jobs' code
	* results `mixed`, depends on options
* [finallyCallback](#ref.callback.finallyCallback) `Function( error , results )`
	* error `mixed`, depends on jobs' code
	* results `mixed`, depends on options

This method execute the `async.Plan`, just like [`.exec()`](#ref..exec).
Like the name suggests, the first argument should be the [thenCallback](#ref.callback.thenCallback), and
[catchCallback](#ref.callback.catchCallback) as the second.

However, the [finallyCallback](#ref.callback.finallyCallback) can still be passed as the third argument.



<a name="ref..execThenElse"></a>
### .execThenElse( thenCallback , elseCallback , [finallyCallback] )

* [thenCallback](#ref.callback.thenCallback) `Function( results )`
	* results `mixed`, depends on options
* [elseCallback](#ref.callback.elseCallback) `Function( results )`
	* results `mixed`, depends on options
* [finallyCallback](#ref.callback.finallyCallback) `Function( error , results )`
	* error `mixed`, depends on jobs' code
	* results `mixed`, depends on options

This method execute the `async.Plan`, just like [`.exec()`](#ref..exec).
Like the name suggests, the first argument should be the [thenCallback](#ref.callback.thenCallback), and
[elseCallback](#ref.callback.elseCallback) as the second.

However, the [finallyCallback](#ref.callback.finallyCallback) can still be passed as the third argument.



<a name="ref..execThenElseCatch"></a>
### .execThenCatch( thenCallback , elseCallback , catchCallback , [finallyCallback] )

* [thenCallback](#ref.callback.thenCallback) `Function( results )`
	* results `mixed`, depends on options
* [elseCallback](#ref.callback.elseCallback) `Function( results )`
	* results `mixed`, depends on options
* [catchCallback](#ref.callback.catchCallback) `Function( error , results )`
	* error `mixed`, depends on jobs' code
	* results `mixed`, depends on options
* [finallyCallback](#ref.callback.finallyCallback) `Function( error , results )`
	* error `mixed`, depends on jobs' code
	* results `mixed`, depends on options

This method execute the `async.Plan`, just like [`.exec()`](#ref..exec).
Like the name suggests, the first argument should be the [thenCallback](#ref.callback.thenCallback),
[elseCallback](#ref.callback.elseCallback) as the second, and [catchCallback](#ref.callback.catchCallback) as the third.

However, the [finallyCallback](#ref.callback.finallyCallback) can still be passed as the fourth argument.



<a name="ref..execArgs"></a>
### .execArgs( [arg1] , [arg2] , ... )

* arg1, arg2, ... `mixed`

This method execute the `async.Plan`, just like [`.exec()`](#ref..exec).
All arguments passed to this method are passed to all the jobs (except in *waterfall* mode, where they are passed only to the first job).



<a name="ref.callbacks"></a>
## Callbacks

Those callbacks are triggered (if conditions are met) when the `async.Plan` is resolved.
Note that if we don't use [`.timeout()`](#ref..timeout) and a job is pending forever, the `async.Plan` will never being resolved,
thus no callback will be ever triggered.

There are two stages of callback.

* The first stage are callbacks defined in the `async.Plan` itself. Those callback are **\*ALWAYS\*** triggered before the second stage.

* The second stage are callbacks of the `.exec()`-like methods.



<a name="ref.callback.thenCallback"></a>
### thenCallback

* thenCallback `Function( results )`
	* results `mixed`, depends on options

For *Do* family, this callback is triggered if the `async.Plan`'s execution succeed. The *success* depends on factory and options used.
Usually, an `async.Plan` succeed if no error happened. But jobs on error can be retried if [`.retry()`](#ref..retry) is used, and finally succeed,
[`async.race`](#ref.async.race) succeed as long as one job succeed, and so on.

Furthermore, for *Conditionnal* family, the final result should be `true` or *truthy* for this callback to be triggered.

The *results* argument's format passed to this callback depends on many factor.
See related factories and modifier.



<a name="ref.callback.elseCallback"></a>
### elseCallback

* elseCallback `Function( results )`
	* results `mixed`, depends on options

It never triggers for *Do* family `async.Plan`.

For *Conditionnal* family, it will trigger if the final result is `false` or *falsy*.
However, if **no** [*catchCallback*](#ref.callback.catchCallback) exists for this stage (see [callbacks introduction](#ref.callbacks) for what a callback stage is),
**it will trigger if the final outcome is an error too**.



<a name="ref.callback.catchCallback"></a>
### catchCallback

* catchCallback `Function( error , results )`
	* error `mixed`, depends on jobs' code
	* results `mixed`, depends on options

This callback is triggered when the final outcome is an error.



<a name="ref.callback.finallyCallback"></a>
### finallyCallback

* finallyCallback `Function( error , results )`
	* error `mixed`, depends on jobs' code
	* results `mixed`, depends on options

This callback is **\*ALWAYS\*** triggered.
This is the **last** callback of a stage to be triggered.



<a name="ref.callback.whileCallback"></a>
### whileCallback

* whileCallback `Function( error , results , logicCallback )`, where:
	* error `mixed` any truthy means error
	* results `Array` or `Object` that maps the *jobsList*
	* logicCallback `Function( [error] , loopAgain )` where:
		* error `mixed` any truthy means error
		* loopAgain `Boolean` anything else is considered either *truthy* or *falsy*

This callback is used for while loop.

The last iteration's *error* and *results* are passed to this function. 

Then the internal *logicCallback* function can be triggered, if a *truthy* value is passed as the *loopAgain* argument,
a new loop iteration will be performed, if a *falsy* value is passed, no new loop iteration will take place:
completion callback (*thenCallback*, *elseCallback*, *catchCallback*, *finallyCallback*) will be triggered
depending on the current (last) iteration's outcome.



**/!\ Work in progress /!\\**



# BDD Spec

The Mocha framework is used for BDD-style tests.

To help understand the following tests, here are the three helper functions used:

```js
function createStats( n )
{
	var i ;
	var stats = {
		startCounter: [] ,
		endCounter: [] ,
		order: [] ,
		plan: {
			then: 0 ,
			'else': 0 ,
			'catch': 0 ,
			'finally': 0
		} ,
		exec: {
			then: 0 ,
			'else': 0 ,
			'catch': 0 ,
			'finally': 0
		}
	} ;
	
	for ( i = 0 ; i < n ; i ++ ) { stats.startCounter[ i ] = stats.endCounter[ i ] = 0 ; }
	
	return stats ;
}



function asyncJob( stats , id , delay , options , result , callback )
{
	var realResult = result.slice() ;
	
	stats.startCounter[ id ] ++ ;
	
	setTimeout( function() {
		stats.endCounter[ id ] ++ ;
		stats.order.push( id ) ;
		
		if ( typeof options.failCount === 'number' && options.failCount >= stats.endCounter[ id ] && ! ( result[ 0 ] instanceof Error ) )
		{
			realResult[ 0 ] = new Error( "Planned failure" ) ;
		}
		
		callback.apply( undefined , realResult ) ;
		
	} , delay ) ;
}



function syncJob( stats , id , options , result , callback )
{
	var realResult = result.slice() ;
	
	stats.startCounter[ id ] ++ ;
	stats.endCounter[ id ] ++ ;
	stats.order.push( id ) ;
	
	if ( typeof options.failCount === 'number' && options.failCount >= stats.endCounter[ id ] && ! ( result[ 0 ] instanceof Error ) )
	{
		realResult[ 0 ] = new Error( "Planned failure" ) ;
	}
	
	callback.apply( undefined , realResult ) ;
}
```


Full BDD spec generated by Mocha:


