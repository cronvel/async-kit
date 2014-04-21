
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
* Define input arguments to invoke *exec()* with, that are transmitted to jobs
* Export a plan as a simple function



# Install

Use Node Package Manager:

    npm install csk-async



# Plan stage & exec stage concept

This is an important concept to understand when using this lib: there are two stages to perform an async flow.

In the first stage, you define the plan.
All plan definition returns an *async.Plan* object.

Then you can *exec()* your plan as many time as you want. All the *exec* method family returns an *execContext* object.
The first time an *async.Plan* is *exec()*, it becomes locked forever: you cannot modify it anymore.

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
- *.execArgs()* is used when you do not want to pass callback to *exec()*-like function, since by default
  *exec()* assume than its last argument is the *finally callback*, so since we are in *waterfall* mode, every
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
- When all element have been processed, the *exec()*'s callback is triggered, as usual

You can as well add a ```.parallel()``` before *exec()*, you still have the advantage versus native forEach()
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

Only the last job pass its result to *finallyCallback*, *thenCallback* etc...
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
### async.while( conditionCallback ).do( jobsList )

* conditionCallback `Function( error , results , logicCallback )` triggered for checking if we have to continue or not, where:
	* error `mixed` any truthy means error
	* results `Array` or `Object` that maps the *jobsList*
	* logicCallback `Function( [error] , result )` where:
		* error `mixed` any truthy means error
		* result `mixed`
* jobsList `Array` or `Object`

It performs an async while loop.
This is equivalent to javascript code:
```js
while ( expression ) {
	// do something
}
```

Unlike others factories, in order to mimic native language syntax, this factory accepts a *conditionCallback* 
rather than a job's list. 
So you have to use the `async.Plan`'s `.do()` method to pass the job's list.

Async while loops behave diffently than other `async.Plan` in various way:
* it first performs an async conditionnal check, if the outcome is falsy, then the execution is immediately aborted
* it performs jobs, just the way other `async.Plan` do, but:
* when everything is done, it performs again a conditionnal check, and if its outcome is truthy, it loops again (and again, etc...)
* when the outcome of the conditionnal check is falsy, callbacks (*finally, then, catch, else*) are triggered 
with the results of the last iteration only (if any), so older iteration's results are lost unless checked and used
in the *conditionCallback*.

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
### async.do( jobsList ).while( conditionCallback )

* jobsList `Array` or `Object`
* conditionCallback `Function( error , results , logicCallback )` triggered for checking if we have to continue or not, where:
	* error `mixed` any truthy means error
	* results `Array` or `Object` that maps the *jobsList*
	* logicCallback `Function( [error] , result )` where:
		* error `mixed` any truthy means error
		* result `mixed`

It performs an async do-while loop.

It works exactly the same as [async.while().do()](#ref.async.while.do), except that, by default, the *conditionCallback*
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
### .while( conditionCallback , whileActionBefore )

* conditionCallback `Function( error , results , logicCallback )` triggered for checking if we have to continue or not, where:
	* error `mixed` any truthy means error
	* results `Array` or `Object` that maps the *jobsList*
	* logicCallback `Function( [error] , result )` where:
		* error `mixed` any truthy means error
		* result `mixed`
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
Finally, moving `updateOurLocalDatabaseAccordingly()` into the *finallyCallback* of `.exec()` allows
us to use the parallel mode, so the whole process perform faster. If we had chosen to put this function
into a job, we would have been constrained to use an `async.series()` factory.
More important: we are sure that the code that update our database will run once.



<a name="ref..lastJobOnly"></a>
### .lastJobOnly( [returnLastJobOnly] )

* returnLastJobOnly `boolean`, if omited: `true`

If set to `true`, only the last job pass its result to *finallyCallback*, *thenCallback* etc...

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
async.series( jobsList ).nice( 0 )
```
... to *asyncify* it a bit. This can be very important for services: our application must keep accepting
new request during the big task processing. Also if the task is really that big, it is usually a good practice 
to spawn a process or create a new specific service for this particular task anyway.



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


# TOC
   - [async.series()](#asyncseries)
   - [async.parallel()](#asyncparallel)
   - [Jobs](#jobs)
   - [Jobs & async.Plan.prototype.using()](#jobs--asyncplanprototypeusing)
     - [passing a function to .using()](#jobs--asyncplanprototypeusing-passing-a-function-to-using)
     - [passing an array to .using()](#jobs--asyncplanprototypeusing-passing-an-array-to-using)
   - [Jobs scheduling with async.prototype.nice()](#jobs-scheduling-with-asyncprototypenice)
   - [Jobs & async.Plan.prototype.execMapping(), adding input arguments to .exec()](#jobs--asyncplanprototypeexecmapping-adding-input-arguments-to-exec)
   - [*this*](#this)
   - [async.foreach()](#asyncforeach)
   - [async.map()](#asyncmap)
   - [async.reduce()](#asyncreduce)
   - [async.waterfall()](#asyncwaterfall)
   - [async.race()](#asyncrace)
   - [async.while()](#asyncwhile)
   - [async.do().while()](#asyncdowhile)
   - [async.do().repeat()](#asyncdorepeat)
   - [Async conditionnal](#async-conditionnal)
     - [async.if.and()](#async-conditionnal-asyncifand)
     - [async.if.or()](#async-conditionnal-asyncifor)
     - [async.and()](#async-conditionnal-asyncand)
     - [async.or()](#async-conditionnal-asyncor)
     - [nested async.or() and async.and() in async.if()](#async-conditionnal-nested-asyncor-and-asyncand-in-asyncif)
     - [async.Plan.prototype.boolean()](#async-conditionnal-asyncplanprototypeboolean)
   - [async.Plan.prototype.then(), .else(), .catch(), .finally(), .execThenCatch(), .execThenElse() and .execThenElseCatch()](#asyncplanprototypethen-else-catch-finally-execthencatch-execthenelse-and-execthenelsecatch)
   - [async.Plan.prototype.timeout()](#asyncplanprototypetimeout)
   - [async.Plan.prototype.retry()](#asyncplanprototyperetry)
   - [Mixing async.Plan.prototype.retry() & async.Plan.prototype.timeout()](#mixing-asyncplanprototyperetry--asyncplanprototypetimeout)
   - [async.Plan.prototype.parallel()](#asyncplanprototypeparallel)
   - [async.Plan.prototype.fatal()](#asyncplanprototypefatal)
   - [async.Plan.prototype.lastJobOnly()](#asyncplanprototypelastjobonly)
   - [async.Plan.prototype.mapping1to1()](#asyncplanprototypemapping1to1)
   - [async.Plan.prototype.execKV()](#asyncplanprototypeexeckv)
<a name=""></a>
 
<a name="asyncseries"></a>
# async.series()
should run the series of job which do not have errors, in the good order, and trigger the callback with the correct result.

```js
var stats = createStats( 3 ) ;

async.series( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

when a job has error, it should start running a series of job, be interrupted by that error and return it.

```js
var stats = createStats( 3 ) ;

async.series( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ new Error() , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.exec( function( error , results ) {
	expect( error ).to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ new Error() , 'wonderful' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1 ] ) ;
	done() ;
} ) ;
```

when a function is given instead of an array of job, it should format the result using the returnLastResultOnly mode.

```js
var stats = createStats( 1 ) ;

async.series( function ( callback ) {
	asyncJob( stats , 0 , 50 , {} , [ undefined , 'my wonderful result' ] , callback ) ;
} )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.equal( 'my wonderful result' ) ;
	expect( stats.endCounter ).to.be.eql( [ 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0 ] ) ;
	done() ;
} ) ;
```

when a function is given instead of an array of job that transmit error, it should be directly transmited as the global error.

```js
var stats = createStats( 1 ) ;

async.do( function ( callback ) {
	asyncJob( stats , 0 , 50 , {} , [ new Error() , 'my wonderful result' ] , callback ) ;
} )
.exec( function( error , results ) {
	expect( error ).to.be.an( Error ) ;
	expect( results ).to.be.equal( 'my wonderful result' ) ;
	expect( stats.endCounter ).to.be.eql( [ 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0 ] ) ;
	done() ;
} ) ;
```

<a name="asyncparallel"></a>
# async.parallel()
should run jobs which do not have errors in parallel, and trigger the callback with the correct result.

```js
var stats = createStats( 3 ) ;

async.parallel( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 2, 0, 1 ] ) ;
	done() ;
} ) ;
```

when a job has error, it should start running jobs in parallel, be interrupted by that error and trigger callback with it before other pending jobs can complete.

```js
var stats = createStats( 3 ) ;

async.parallel( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ new Error() , 'result' ] ]
] )
.exec( function( error , results ) {
	expect( error ).to.be.an( Error ) ;
	expect( results ).to.be.eql( [ undefined , undefined , [ new Error() , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 0, 0, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 2 ] ) ;
	done() ;
} ) ;
```

when the slower job has error, it should start running jobs in parallel, all other job complete and it trigger callback with the error.

```js
var stats = createStats( 3 ) ;

async.parallel( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ new Error() , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.exec( function( error , results ) {
	expect( error ).to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ new Error() , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 2, 0, 1 ] ) ;
	done() ;
} ) ;
```

<a name="jobs"></a>
# Jobs
can be an array of async function accepting a completion callback.

```js
var stats = createStats( 3 ) ;

async.series( [
	function( callback ) {
		var id = 0 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , 'my' ) ;
		} , 0 ) ;
	} ,
	function( callback ) {
		var id = 1 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , 'wonderful' ) ;
		} , 0 ) ;
	} ,
	function( callback ) {
		var id = 2 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , 'result' ) ;
		} , 0 ) ;
	}
] )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

can be an array of synchronous function, if it still accept and use the completion callback.

```js
var stats = createStats( 3 ) ;

async.series( [
	function( callback ) {
		var id = 0 ;
		stats.startCounter[ id ] ++ ;
		stats.endCounter[ id ] ++ ;
		stats.order.push( id ) ;
		callback( undefined , 'my' ) ;
	} ,
	function( callback ) {
		var id = 1 ;
		stats.startCounter[ id ] ++ ;
		stats.endCounter[ id ] ++ ;
		stats.order.push( id ) ;
		callback( undefined , 'wonderful' ) ;
	} ,
	function( callback ) {
		var id = 2 ;
		stats.startCounter[ id ] ++ ;
		stats.endCounter[ id ] ++ ;
		stats.order.push( id ) ;
		callback( undefined , 'result' ) ;
	}
] )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

can be an array of array, each of them having a async function as the first element and then a list of argument to pass to this function, it should accept one more argument: the callback for completion being added by the async lib.

```js
var stats = createStats( 3 ) ;

async.do( [
	[ asyncJob , stats , 0 , 0 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

can be an array of array, each of them having a synchronous function as the first element and then a list of argument to pass to this function, if those functions still accept and use the completion callback.

```js
var stats = createStats( 3 ) ;

async.do( [
	[ syncJob , stats , 0 , {} , [ undefined , 'my' ] ] ,
	[ syncJob , stats , 1 , {} , [ undefined , 'wonderful' ] ] ,
	[ syncJob , stats , 2 , {} , [ undefined , 'result' ] ]
] )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

can be an array of async.Plan, each of them will be used by calling their .exec() method.

```js
var stats = createStats( 6 ) ;

async.parallel( [
	async.series( [
		[ asyncJob , stats , 0 , 10 , {} , [ undefined , 'a' ] ] ,
		[ asyncJob , stats , 1 , 10 , {} , [ undefined , 'nice' ] ] ,
		[ asyncJob , stats , 2 , 10 , {} , [ undefined , 'output' ] ]
	] ) ,
	async.series( [
		[ asyncJob , stats , 3 , 10 , {} , [ undefined , 'my' ] ] ,
		[ asyncJob , stats , 4 , 10 , {} , [ undefined , 'wonderful' ] ] ,
		[ asyncJob , stats , 5 , 10 , {} , [ undefined , 'result' ] ]
	] )
] )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results[ 0 ][ 0 ] ).not.to.be.an( Error ) ;
	expect( results[ 1 ][ 0 ] ).not.to.be.an( Error ) ;
	expect( results[ 0 ][ 1 ] ).to.be.eql( [ [ undefined , 'a' ], [ undefined , 'nice' ], [ undefined , 'output' ] ] ) ;
	expect( results[ 1 ][ 1 ] ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1, 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 3, 1, 4, 2, 5 ] ) ;
	done() ;
} ) ;
```

can be an array that mix all those type of jobs.

```js
var stats = createStats( 7 ) ;

async.parallel( [
	function( callback ) {
		var id = 0 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "I'm an async anonymous function" ) ;
		} , 0 ) ;
	} ,
	function( callback ) {
		var id = 1 ;
		stats.startCounter[ id ] ++ ;
		stats.endCounter[ id ] ++ ;
		stats.order.push( id ) ;
		callback( undefined , "I'm a synchronous anonymous function" ) ;
	} ,
	async.series( [
		[ asyncJob , stats , 2 , 20 , {} , [ undefined , 'nested' ] ] ,
		[ asyncJob , stats , 3 , 20 , {} , [ undefined , 'async.Plan' ] ] ,
		[ asyncJob , stats , 4 , 20 , {} , [ undefined , 'results' ] ]
	] ) ,
	[ syncJob , stats , 5 , {} , [ undefined , "I'm a synchronous array of function and arguments" ] ] ,
	[ asyncJob , stats , 6 , 10 , {} , [ undefined , "I'm an async array of function and arguments" ] ] ,
] )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [
		[ undefined , "I'm an async anonymous function" ] ,
		[ undefined , "I'm a synchronous anonymous function" ] ,
		[ undefined , [ [ undefined , "nested" ] , [ undefined , "async.Plan" ] , [ undefined , "results" ] ] ] ,
		[ undefined , "I'm a synchronous array of function and arguments" ] ,
		[ undefined , "I'm an async array of function and arguments" ]
	] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1, 1, 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 1, 5, 0, 6, 2, 3, 4 ] ) ;
	done() ;
} ) ;
```

objects can be used instead of array as the top container, the results should be an objects with the same properties mapping, properties' order should be preserved (*IF* they do not start with a digit - because of V8 behaviours with objects).

```js
var stats = createStats( 3 ) ;

async.parallel( {
	one: [ asyncJob , stats , 0 , 40 , {} , [ undefined , 'my' ] ] ,
	two: [ asyncJob , stats , 1 , 20 , {} , [ undefined , 'wonderful' ] ] ,
	three: [ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
} )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( { one: [ undefined , 'my' ], two: [ undefined , 'wonderful' ], three: [ undefined , 'result' ] } ) ;
	expect( Object.keys( results ) ).to.be.eql( [ 'one' , 'two' , 'three' ] ) ;	// Check the keys order
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 2, 1, 0 ] ) ;
	done() ;
} ) ;
```

<a name="jobs--asyncplanprototypeusing"></a>
# Jobs & async.Plan.prototype.using()
<a name="jobs--asyncplanprototypeusing-passing-a-function-to-using"></a>
## passing a function to .using()
should take each job as an array of arguments to pass to the .using()'s function.

```js
var stats = createStats( 3 ) ;

async.do( [
	[ stats , 0 , 0 , {} , [ undefined , 'my' ] ] ,
	[ stats , 1 , 0 , {} , [ undefined , 'wonderful' ] ] ,
	[ stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.using( asyncJob )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

when the job is not an array, it should take each job as the first argument to pass to the .using()'s function.

```js
var id = 0 , stats = createStats( 3 ) ;

async.do( [ 'my' , 'wonderful' , 'result' ] )
.using( function( data , callback ) {
	stats.startCounter[ id ] ++ ;
	setTimeout( function() {
		stats.endCounter[ id ] ++ ;
		stats.order.push( id ) ;
		id ++ ;
		callback( undefined , data ) ;
 	} , 0 ) ;
} )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

<a name="jobs--asyncplanprototypeusing-passing-an-array-to-using"></a>
## passing an array to .using()
when a job is a function, it should take the .using()'s array as argument.

```js
var stats = createStats( 3 ) ;

async.parallel( [
	function( data , callback ) {
		var id = 0 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "DESCRIPTION: " + data.describe ) ;
		} , 20 ) ;
	} ,
	function( data , callback ) {
		var id = 1 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "LENGTH: " + data.body.length ) ;
		} , 10 ) ;
	} ,
	function( data , callback ) {
		var id = 2 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "BODY: " + data.body ) ;
		} , 0 ) ;
	}
] )
.using( [ { describe: 'some data' , body: 'blahblihblah' } ] )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [
		[ undefined , 'DESCRIPTION: some data' ] ,
		[ undefined , 'LENGTH: 12' ] ,
		[ undefined , 'BODY: blahblihblah' ]
	] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 2, 1, 0 ] ) ;
	done() ;
} ) ;
```

<a name="jobs-scheduling-with-asyncprototypenice"></a>
# Jobs scheduling with async.prototype.nice()
using .nice( -3 ), it should run the series of job with synchonous scheduling.

```js
var stats = createStats( 3 ) ;

async.series( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.nice( -3 )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

using .nice( -2 ), it should run the series of job with an async scheduling (nextTick).

```js
var stats = createStats( 3 ) ;

async.series( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.nice( -2 )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

using .nice( -1 ), it should run the series of job with an async scheduling (setImmediate).

```js
var stats = createStats( 3 ) ;

async.series( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.nice( -1 )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

using .nice( 10 ), it should run the series of job with an async scheduling (setTimeout 100ms).

```js
var stats = createStats( 3 ) ;

async.series( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.nice( 10 )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

using .nice( -3 ), it should run the jobs in parallel with synchonous scheduling.

```js
var stats = createStats( 3 ) ;

async.parallel( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.nice( -3 )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 2, 0, 1 ] ) ;
	done() ;
} ) ;
```

using .nice( -2 ), it should run the jobs in parallel with an async scheduling (nextTick).

```js
var stats = createStats( 3 ) ;

async.parallel( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.nice( -2 )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 2, 0, 1 ] ) ;
	done() ;
} ) ;
```

using .nice( -1 ), it should run the jobs in parallel with an async scheduling (setImmediate).

```js
var stats = createStats( 3 ) ;

async.parallel( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.nice( -1 )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 2, 0, 1 ] ) ;
	done() ;
} ) ;
```

using .nice( 10 ), it should run the jobs in parallel with an async scheduling (setTimeout 100ms).

```js
var stats = createStats( 3 ) ;

async.parallel( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.nice( 10 )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 2, 0, 1 ] ) ;
	done() ;
} ) ;
```

<a name="jobs--asyncplanprototypeexecmapping-adding-input-arguments-to-exec"></a>
# Jobs & async.Plan.prototype.execMapping(), adding input arguments to .exec()
using default exec()'s arguments mapping, called with no argument, it should not throw error.

```js
var stats = createStats( 3 ) ;

async.series( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	function( callback ) {
		var id = 2 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "result" ) ;
			expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
			done() ;
		} , 0 ) ;
	}
] )
.exec() ;
```

using default exec()'s arguments mapping, when a job is a function, it should take the input arguments passed to .exec().

```js
var stats = createStats( 3 ) ;

async.parallel( [
	function( describe , body , callback ) {
		var id = 0 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "DESCRIPTION: " + describe ) ;
		} , 20 ) ;
	} ,
	function( describe , body , callback ) {
		var id = 1 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "LENGTH: " + body.length ) ;
		} , 10 ) ;
	} ,
	function( describe , body , callback ) {
		var id = 2 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "BODY: " + body ) ;
		} , 0 ) ;
	}
] )
.exec( 'some data' , 'blahblihblah' , function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [
		[ undefined , 'DESCRIPTION: some data' ] ,
		[ undefined , 'LENGTH: 12' ] ,
		[ undefined , 'BODY: blahblihblah' ]
	] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 2, 1, 0 ] ) ;
	done() ;
} ) ;
```

when a job is a function, it should take the input arguments passed to .exec().

```js
var stats = createStats( 3 ) ;

async.parallel( [
	function( describe , body , callback ) {
		var id = 0 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "DESCRIPTION: " + describe ) ;
		} , 20 ) ;
	} ,
	function( describe , body , callback ) {
		var id = 1 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "LENGTH: " + body.length ) ;
		} , 10 ) ;
	} ,
	function( describe , body , callback ) {
		var id = 2 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "BODY: " + body ) ;
		} , 0 ) ;
	}
] )
.execMapping( { callbacks: [ 'finally' ] , minInputs: 2 , maxInputs: 2 , inputsName: [ 'describe' , 'body' ] } )
.exec( 'some data' , 'blahblihblah' , function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [
		[ undefined , 'DESCRIPTION: some data' ] ,
		[ undefined , 'LENGTH: 12' ] ,
		[ undefined , 'BODY: blahblihblah' ]
	] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 2, 1, 0 ] ) ;
	done() ;
} ) ;
```

when mixing arguments passed to .exec() and .using(), .exec()'s arguments overlapping .using()'s arguments should overwrite.

```js
var stats ;

var asyncPlan = async.parallel( [
	function( describe , body , callback ) {
		var id = 0 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "DESCRIPTION: " + describe ) ;
		} , 20 ) ;
	} ,
	function( describe , body , callback ) {
		var id = 1 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "LENGTH: " + body.length ) ;
		} , 10 ) ;
	} ,
	function( describe , body , callback ) {
		var id = 2 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "BODY: " + body ) ;
		} , 0 ) ;
	}
] )
.using( [ "<insert .using()'s description here>" , "<insert .using()'s body here>" ] )
.execMapping( { callbacks: [ 'finally' ] , minInputs: 0 , maxInputs: 2 , inputsName: [ 'describe' , 'body' ] } ) ;

stats = createStats( 3 ) ;

asyncPlan.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [
		[ undefined , "DESCRIPTION: <insert .using()'s description here>" ] ,
		[ undefined , 'LENGTH: 29' ] ,
		[ undefined , "BODY: <insert .using()'s body here>" ]
	] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 2, 1, 0 ] ) ;
	
	stats = createStats( 3 ) ;
	
	asyncPlan.exec( "<insert .exec()'s description here>" , function( error , results ) {
		expect( error ).not.to.be.an( Error ) ;
		expect( results ).to.be.eql( [
			[ undefined , "DESCRIPTION: <insert .exec()'s description here>" ] ,
			[ undefined , 'LENGTH: 29' ] ,
			[ undefined , "BODY: <insert .using()'s body here>" ]
		] ) ;
		expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
		expect( stats.order ).to.be.eql( [ 2, 1, 0 ] ) ;
		
		stats = createStats( 3 ) ;
		
		asyncPlan.exec( "<insert .exec()'s description here>" , "<insert .exec()'s body here>" , function( error , results ) {
			expect( error ).not.to.be.an( Error ) ;
			expect( results ).to.be.eql( [
				[ undefined , "DESCRIPTION: <insert .exec()'s description here>" ] ,
				[ undefined , 'LENGTH: 28' ] ,
				[ undefined , "BODY: <insert .exec()'s body here>" ]
			] ) ;
			expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
			expect( stats.order ).to.be.eql( [ 2, 1, 0 ] ) ;
			done() ;
		} ) ;
	} ) ;
} ) ;
```

<a name="this"></a>
# *this*
each job function should have *this* set to the current execContext.

```js
var stats = createStats( 3 ) ;

async.series( [
	function( callback ) {
		var id = 0 ;
		expect( this ).to.be.an( async.ExecContext ) ;
		expect( this.results ).to.be.eql( [ undefined ] ) ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , 'my' ) ;
		} , 0 ) ;
	} ,
	function( callback ) {
		var id = 1 ;
		expect( this ).to.be.an( async.ExecContext ) ;
		expect( this.results ).to.be.eql( [ [ undefined , 'my' ] , undefined ] ) ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , 'wonderful' ) ;
		} , 0 ) ;
	} ,
	function( callback ) {
		var id = 2 ;
		expect( this ).to.be.an( async.ExecContext ) ;
		expect( this.results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], undefined ] ) ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , 'result' ) ;
		} , 0 ) ;
	}
] )
.exec( done ) ;
```

using()'s function should have *this* set to the current execContext.

```js
var stats = createStats( 3 ) ;

async.series( [
	[ 0 , 'my' , [ undefined ] ] ,
	[ 1 , 'wonderful' , [ [ undefined , 'my' ] , undefined ] ] ,
	[ 2 , 'result' , [ [ undefined , 'my' ], [ undefined , 'wonderful' ], undefined ] ]
] )
.using( function( id , result , expectedThisResults , callback ) {
	expect( this ).to.be.an( async.ExecContext ) ;
	expect( this.results ).to.be.eql( expectedThisResults ) ;
	stats.startCounter[ id ] ++ ;
	setTimeout( function() {
		stats.endCounter[ id ] ++ ;
		stats.order.push( id ) ;
		callback( undefined , result ) ;
	} , 0 ) ;
} )
.exec( done ) ;
```

every user provided callback should have *this* set to the current execContext.

```js
var stats = createStats( 3 ) ;

async.series( [
	[ asyncJob , stats , 0 , 0 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.then( function( results ) {
	expect( this ).to.be.an( async.ExecContext ) ;
	expect( this.results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
} )
.finally( function( error , results ) {
	expect( this ).to.be.an( async.ExecContext ) ;
	expect( this.results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
} )
.execThenCatch(
	function( results ) {
		expect( this ).to.be.an( async.ExecContext ) ;
		expect( this.results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	} ,
	function( error ) {} ,
	function( error , results ) {
		expect( this ).to.be.an( async.ExecContext ) ;
		expect( this.results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
		done() ;
	}
) ;
```

<a name="asyncforeach"></a>
# async.foreach()
should take each job as an element to pass to the iterator function.

```js
var stats = createStats( 3 ) ;

var myArray = [
	{ id: 0 , timeout: 10 , result: [ undefined , 'my' ] } ,
	{ id: 1 , timeout: 0 , result: [ undefined , 'wonderful' ] } ,
	{ id: 2 , timeout: 0 , result: [ undefined , 'result' ] }
] ;

async.foreach( myArray , function( element , callback ) {
	
	stats.startCounter[ element.id ] ++ ;
	
	setTimeout( function() {
		stats.endCounter[ element.id ] ++ ;
		stats.order.push( element.id ) ;
		callback.apply( undefined , element.result ) ;
	} , element.delay ) ;
} )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

when the *iterator* accepts three arguments, the current key (array's index) is passed to it as the second argument.

```js
var stats = createStats( 3 ) ;

var myArray = [
	{ id: 0 , timeout: 10 , result: [ undefined , 'my' ] } ,
	{ id: 1 , timeout: 0 , result: [ undefined , 'wonderful' ] } ,
	{ id: 2 , timeout: 0 , result: [ undefined , 'result' ] }
] ;

async.foreach( myArray , function( element , key , callback ) {
	
	stats.startCounter[ element.id ] ++ ;
	expect( key ).to.be.equal( element.id ) ;
	
	setTimeout( function() {
		stats.endCounter[ element.id ] ++ ;
		stats.order.push( element.id ) ;
		callback.apply( undefined , element.result ) ;
	} , element.delay ) ;
} )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

if the container to iterate is an object, the current key (property name) is passed to it as the second argument.

```js
var stats = createStats( 3 ) ;

var myObject = {
	one: { id: 0 , name: 'one' , timeout: 10 , result: [ undefined , 'my' ] } ,
	two: { id: 1 , name: 'two' , timeout: 0 , result: [ undefined , 'wonderful' ] } ,
	three: { id: 2 , name: 'three' , timeout: 0 , result: [ undefined , 'result' ] }
} ;

async.foreach( myObject , function( element , key , callback ) {
	
	stats.startCounter[ element.id ] ++ ;
	expect( key ).to.be.equal( element.name ) ;
	
	setTimeout( function() {
		stats.endCounter[ element.id ] ++ ;
		stats.order.push( element.id ) ;
		callback.apply( undefined , element.result ) ;
	} , element.delay ) ;
} )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( { one: [ undefined , 'my' ], two: [ undefined , 'wonderful' ], three: [ undefined , 'result' ] } ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

when the *iterator* accepts (at least) four arguments, the whole job's array or object is passed to it as the third argument.

```js
var stats = createStats( 3 ) ;

var myArray = [
	{ id: 0 , timeout: 10 , result: [ undefined , 'my' ] } ,
	{ id: 1 , timeout: 0 , result: [ undefined , 'wonderful' ] } ,
	{ id: 2 , timeout: 0 , result: [ undefined , 'result' ] }
] ;

async.foreach( myArray , function( element , key , array , callback ) {
	
	stats.startCounter[ element.id ] ++ ;
	expect( key ).to.be.equal( element.id ) ;
	expect( array ).to.be.equal( myArray ) ;
	
	setTimeout( function() {
		stats.endCounter[ element.id ] ++ ;
		stats.order.push( element.id ) ;
		callback.apply( undefined , element.result ) ;
	} , element.delay ) ;
} )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

if a job fails, it should continue anyway processing others.

```js
var stats = createStats( 3 ) ;

var myArray = [
	{ id: 0 , timeout: 10 , result: [ undefined , 'my' ] } ,
	{ id: 1 , timeout: 0 , result: [ new Error() , 'wonderful' ] } ,
	{ id: 2 , timeout: 0 , result: [ undefined , 'result' ] }
] ;

async.foreach( myArray , function( element , callback ) {
	
	stats.startCounter[ element.id ] ++ ;
	
	setTimeout( function() {
		stats.endCounter[ element.id ] ++ ;
		stats.order.push( element.id ) ;
		callback.apply( undefined , element.result ) ;
	} , element.delay ) ;
} )
.exec( function( error , results ) {
	expect( error ).not.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ new Error() , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

<a name="asyncmap"></a>
# async.map()
should take each job as an element to pass to the iterator function, and create a new array with computed values and 1:1 mapping.

```js
var myArray = [ 'my' , 'wonderful' , 'result' ] ;

async.map( myArray , function( element , callback ) {
	
	setTimeout( function() {
		callback( undefined , element.length ) ;
	} , 0 ) ;
} )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ 2, 9, 6 ] ) ;
	done() ;
} ) ;
```

should take each job of an object as an element to pass to the iterator function, and create a new object with computed values and 1:1 mapping.

```js
var myObject = { one: 'my' , two: 'wonderful' , three: 'result' } ;

async.map( myObject , function( element , callback ) {
	
	setTimeout( function() {
		callback( undefined , element.length ) ;
	} , 0 ) ;
} )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( { one: 2, two: 9, three: 6 } ) ;
	done() ;
} ) ;
```

when the *iterator* accepts (at least) three arguments, the current key (array's index) is passed to it as the second argument.

```js
var myArray = [ 'my' , 'wonderful' , 'result' ] ;
var count = 0 ;

async.map( myArray , function( element , key , callback ) {
	
	expect( key ).to.be.equal( count ) ;
	count ++ ;
	
	setTimeout( function() {
		callback( undefined , element.length ) ;
	} , 0 ) ;
} )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ 2, 9, 6 ] ) ;
	done() ;
} ) ;
```

if the container to iterate is an object, the current key (property name) is passed to it as the second argument.

```js
var myObject = { my: 'my' , wonderful: 'wonderful' , result: 'result' } ;

async.map( myObject , function( element , key , callback ) {
	
	expect( key ).to.be.equal( element ) ;
	
	setTimeout( function() {
		callback( undefined , element.length ) ;
	} , 0 ) ;
} )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( { my: 2, wonderful: 9, result: 6 } ) ;
	done() ;
} ) ;
```

<a name="asyncreduce"></a>
# async.reduce()
should take each job as an element to pass to the iterator function, and trigger callback with an aggregated value.

```js
var myArray = [ 'my' , 'wonderful' , 'result' ] ;

async.reduce( myArray , 5 , function( aggregate , element , callback ) {
	
	setTimeout( function() {
		callback( undefined , aggregate + element.length ) ;
	} , 0 ) ;
} )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( 22 ) ;
	done() ;
} ) ;
```

if a default initial aggregate value is not supplied to async.reduce(), this initial value should be supplied as exec()'s first argument by default.

```js
var myArray = [ 'my' , 'wonderful' , 'result' ] ;

var plan = async.reduce( myArray , function( aggregate , element , callback ) {
	
	setTimeout( function() {
		callback( undefined , aggregate + element.length ) ;
	} , 0 ) ;
} )
.exec( 7 , function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( 24 ) ;
	done() ;
} ) ;
```

<a name="asyncwaterfall"></a>
# async.waterfall()
should run the series of job in waterfall mode: each job received the result of the previous, the final result is the result of the last job, the first job receive arguments from exec(), if any.

```js
var stats = createStats( 3 ) ;

async.waterfall( [
	function( str , callback ) {
		setTimeout( function() {
			callback( undefined , str + ' my' ) ;
		} , 10 ) ;
	} ,
	function( str , callback ) {
		setTimeout( function() {
			callback( undefined , str + ' wonderful' ) ;
		} , 20 ) ;
	} ,
	function( str , callback ) {
		setTimeout( function() {
			callback( undefined , str + ' result' ) ;
		} , 0 ) ;
	}
] )
.exec( 'oh' , function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.equal( 'oh my wonderful result' ) ;
	done() ;
} ) ;
```

using async.Plan.prototype.transmitError(), each job received the full list of arguments transmited by the previous job, including the error argument taht is truncated by default.

```js
var stats = createStats( 3 ) ;

async.waterfall( [
	function( str , callback ) {
		setTimeout( function() {
			callback( undefined , str + ' my' ) ;
		} , 10 ) ;
	} ,
	function( error , str , callback ) {
		setTimeout( function() {
			callback( undefined , str + ' wonderful' ) ;
		} , 20 ) ;
	} ,
	function( error , str , callback ) {
		setTimeout( function() {
			callback( undefined , str + ' result' ) ;
		} , 0 ) ;
	}
] )
.transmitError()
.exec( 'oh' , function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.equal( 'oh my wonderful result' ) ;
	done() ;
} ) ;
```

<a name="asyncrace"></a>
# async.race()
should run parallel racing jobs, and should trigger the callback after the fastest job complete, with the winning job's results only.

```js
var stats = createStats( 3 ) ;

async.race( [
	[ asyncJob , stats , 0 , 150 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 10 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 50 , {} , [ undefined , 'result' ] ]
] )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.equal( 'wonderful' ) ;
	expect( stats.endCounter ).to.be.eql( [ 0, 1, 0 ] ) ;
	done() ;
} ) ;
```

when some jobs have errors, it should return after the fastest successful job, other failed results are discarded.

```js
var stats = createStats( 3 ) ;

async.race( [
	[ asyncJob , stats , 0 , 150 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 10 , {} , [ new Error() , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 50 , {} , [ undefined , 'result' ] ]
] )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.equal( 'result' ) ;
	expect( stats.endCounter ).to.be.eql( [ 0, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 1, 2 ] ) ;
	done() ;
} ) ;
```

when all jobs have errors, it should return an error.

```js
var stats = createStats( 3 ) ;

async.race( [
	[ asyncJob , stats , 0 , 100 , {} , [ new Error() , 'my' ] ] ,
	[ asyncJob , stats , 1 , 10 , {} , [ new Error() , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 50 , {} , [ new Error() , 'result' ] ]
] )
.exec( function( error , results ) {
	expect( error ).to.be.an( Error ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 1, 2, 0 ] ) ;
	done() ;
} ) ;
```

when using a parallel limit, no new jobs should be processed after a job complete without error.

```js
var stats = createStats( 4 ) ;

async.race( [
	[ asyncJob , stats , 0 , 150 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 10 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 50 , {} , [ undefined , 'result' ] ] ,
	[ asyncJob , stats , 1 , 10 , {} , [ undefined , 'again' ] ]
] )
.parallel( 3 )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.equal( 'wonderful' ) ;
	expect( stats.startCounter ).to.be.eql( [ 1, 1, 1, 0 ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 0, 1, 0, 0 ] ) ;
	done() ;
} ) ;
```

<a name="asyncwhile"></a>
# async.while()
while the while()'s callback's result is true, it should run jobs in series (by default), and do it again and again, the final result contains only the last iteration.

```js
var stats = createStats( 3 ) ;
var whileCount = 0 ;

async.while( function( error , results , callback ) {
	whileCount ++ ;
	callback( whileCount <= 3 ) ;
} )
.do( [
	[ asyncJob , stats , 0 , 30 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 15 , {} , [ undefined , 'result' ] ]
] )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( whileCount ).to.be.equal( 4 ) ;
	expect( stats.endCounter ).to.be.eql( [ 3, 3, 3 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2, 0, 1, 2, 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

when the while()'s callback has an error, no more iteration are performed, the last iteration results are transmitted, but the error in the while is transmitted as well.

```js
var stats = createStats( 3 ) ;
var whileCount = 0 ;

async.while( function( error , results , callback ) {
	whileCount ++ ;
	callback( whileCount <= 3 ? true : new Error() ) ;
} )
.do( [
	[ asyncJob , stats , 0 , 30 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 15 , {} , [ undefined , 'result' ] ]
] )
.exec( function( error , results ) {
	expect( error ).to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( whileCount ).to.be.equal( 4 ) ;
	expect( stats.endCounter ).to.be.eql( [ 3, 3, 3 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2, 0, 1, 2, 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

when using async.Plan.prototype.parallel(), it should run jobs in parallel, and start a new iteration only when all jobs in the current iteration have been completed, other behaviour are the same like in series.

```js
var stats = createStats( 3 ) ;
var whileCount = 0 ;

async.while( function( error , results , callback ) {
	whileCount ++ ;
	callback( whileCount <= 3 ) ;
} )
.do( [
	[ asyncJob , stats , 0 , 30 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 15 , {} , [ undefined , 'result' ] ]
] )
.parallel( Infinity )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( whileCount ).to.be.equal( 4 ) ;
	expect( stats.endCounter ).to.be.eql( [ 3, 3, 3 ] ) ;
	expect( stats.order ).to.be.eql( [ 1, 2, 0, 1, 2, 0, 1, 2, 0 ] ) ;
	done() ;
} ) ;
```

when the first call to while()'s callback's result is false, no jobs are even started, and the final result is empty.

```js
var stats = createStats( 3 ) ;
var whileCount = 0 ;

async.while( function( error , results , callback ) {
	whileCount ++ ;
	callback( false ) ;
} )
.do( [
	[ asyncJob , stats , 0 , 30 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 15 , {} , [ undefined , 'result' ] ]
] )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [] ) ;
	expect( whileCount ).to.be.equal( 1 ) ;
	expect( stats.endCounter ).to.be.eql( [ 0, 0, 0 ] ) ;
	expect( stats.order ).to.be.eql( [] ) ;
	done() ;
} ) ;
```

<a name="asyncdowhile"></a>
# async.do().while()
should work the same way as async.while() except that the while()'s callback's is evaluated at the end of the loop.

```js
var stats = createStats( 3 ) ;
var whileCount = 0 ;

async.do( [
	[ asyncJob , stats , 0 , 30 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 15 , {} , [ undefined , 'result' ] ]
] )
.while( function( error , results , callback ) {
	whileCount ++ ;
	callback( whileCount <= 3 ) ;
} )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( whileCount ).to.be.equal( 4 ) ;
	expect( stats.endCounter ).to.be.eql( [ 4, 4, 4 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

so even if the first call to while()'s callback's result is false, the first iteration is already done.

```js
var stats = createStats( 3 ) ;
var whileCount = 0 ;

async.do( [
	[ asyncJob , stats , 0 , 30 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 15 , {} , [ undefined , 'result' ] ]
] )
.while( function( error , results , callback ) {
	whileCount ++ ;
	callback( false ) ;
} )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( whileCount ).to.be.equal( 1 ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

<a name="asyncdorepeat"></a>
# async.do().repeat()
should repeat the action the given time.

```js
var stats = createStats( 3 ) ;

async.do( [
	[ asyncJob , stats , 0 , 20 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 10 , {} , [ undefined , 'result' ] ]
] )
.repeat( 4 )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 4, 4, 4 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

<a name="async-conditionnal"></a>
# Async conditionnal
<a name="async-conditionnal-asyncifand"></a>
## async.if.and()
should evaluate async truthy && truthy && truthy to true, and run all jobs.

```js
var stats = createStats( 3 ) ;

async.if.and( [
	[ asyncJob , stats , 0 , 0 , {} , [ true ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ 'wonderful' ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( true ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	done() ;
} ) ;
```

should evaluate async truthy && falsy && truthy to false, and run just the first and second jobs.

```js
var stats = createStats( 3 ) ;

async.if.and( [
	[ asyncJob , stats , 0 , 0 , {} , [ true ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ null ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ 'wonderful' ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( false ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
	done() ;
} ) ;
```

should evaluate async falsy && falsy && falsy to false, and run just the first job.

```js
var stats = createStats( 3 ) ;

async.if.and( [
	[ asyncJob , stats , 0 , 0 , {} , [ undefined ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ null ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ false ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( false ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 0, 0 ] ) ;
	done() ;
} ) ;
```

<a name="async-conditionnal-asyncifor"></a>
## async.if.or()
should evaluate async truthy || truthy || truthy to true, and run only the first jobs.

```js
var stats = createStats( 3 ) ;

async.if.or( [
	[ asyncJob , stats , 0 , 0 , {} , [ true ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ 'wonderful' ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( true ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 0, 0 ] ) ;
	done() ;
} ) ;
```

should evaluate async falsy || truthy || falsy to true, and run just the first and second jobs.

```js
var stats = createStats( 3 ) ;

async.if.or( [
	[ asyncJob , stats , 0 , 0 , {} , [ undefined ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ false ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( true ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
	done() ;
} ) ;
```

should evaluate async falsy || falsy || falsy to false, and run all jobs.

```js
var stats = createStats( 3 ) ;

async.if.or( [
	[ asyncJob , stats , 0 , 0 , {} , [ undefined ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ null ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ false ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( false ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	done() ;
} ) ;
```

<a name="async-conditionnal-asyncand"></a>
## async.and()
should evaluate async true && 7 && 'wonderful' to 'wonderful', and run all jobs.

```js
var stats = createStats( 3 ) ;

async.and( [
	[ asyncJob , stats , 0 , 0 , {} , [ true ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ 'wonderful' ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( 'wonderful' ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	done() ;
} ) ;
```

should evaluate async true && 0 && 'wonderful' to 0, and run just the first and second jobs.

```js
var stats = createStats( 3 ) ;

async.and( [
	[ asyncJob , stats , 0 , 0 , {} , [ true ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ 0 ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ 'wonderful' ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( 0 ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
	done() ;
} ) ;
```

should evaluate async undefined && null && false to undefined, and run just the first job.

```js
var stats = createStats( 3 ) ;

async.and( [
	[ asyncJob , stats , 0 , 0 , {} , [ undefined ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ null ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ false ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( undefined ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 0, 0 ] ) ;
	done() ;
} ) ;
```

<a name="async-conditionnal-asyncor"></a>
## async.or()
should evaluate async 7 || true || 'wonderful' to 7, and run only the first jobs.

```js
var stats = createStats( 3 ) ;

async.or( [
	[ asyncJob , stats , 0 , 0 , {} , [ 7 ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ true ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ 'wonderful' ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( 7 ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 0, 0 ] ) ;
	done() ;
} ) ;
```

should evaluate async undefined || 7 || false to 7, and run just the first and second jobs.

```js
var stats = createStats( 3 ) ;

async.or( [
	[ asyncJob , stats , 0 , 0 , {} , [ undefined ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ false ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( 7 ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
	done() ;
} ) ;
```

should evaluate async undefined || null || '' to '', and run all jobs.

```js
var stats = createStats( 3 ) ;

async.or( [
	[ asyncJob , stats , 0 , 0 , {} , [ undefined ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ null ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ '' ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( '' ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	done() ;
} ) ;
```

<a name="async-conditionnal-nested-asyncor-and-asyncand-in-asyncif"></a>
## nested async.or() and async.and() in async.if()
should evaluate async ( truthy || falsy ) && truthy to true, and run first and third jobs.

```js
var stats = createStats( 3 ) ;

async.if.and( [
	async.or( [
		[ asyncJob , stats , 0 , 0 , {} , [ 'wonderful' ] ] ,
		[ asyncJob , stats , 1 , 0 , {} , [ false ] ]
	] ) ,
	[ asyncJob , stats , 2 , 0 , {} , [ true ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( true ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 0, 1 ] ) ;
	done() ;
} ) ;
```

should evaluate async ( falsy || truthy ) && falsy to false, and run all jobs.

```js
var stats = createStats( 3 ) ;

async.if.and( [
	async.or( [
		[ asyncJob , stats , 0 , 0 , {} , [ undefined ] ] ,
		[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ]
	] ) ,
	[ asyncJob , stats , 2 , 0 , {} , [ 0 ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( false ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	done() ;
} ) ;
```

should evaluate async ( truthy && falsy ) || truthy to true, and run all jobs.

```js
var stats = createStats( 3 ) ;

async.if.or( [
	async.and( [
		[ asyncJob , stats , 0 , 0 , {} , [ 'wonderful' ] ] ,
		[ asyncJob , stats , 1 , 0 , {} , [ false ] ]
	] ) ,
	[ asyncJob , stats , 2 , 0 , {} , [ true ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( true ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	done() ;
} ) ;
```

should evaluate async ( falsy && truthy ) || falsy to false, and run the first and third jobs.

```js
var stats = createStats( 3 ) ;

async.if.or( [
	async.and( [
		[ asyncJob , stats , 0 , 0 , {} , [ undefined ] ] ,
		[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ]
	] ) ,
	[ asyncJob , stats , 2 , 0 , {} , [ 0 ] ]
] )
.exec( function( result ) {
	expect( result ).to.be.equal( false ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 0, 1 ] ) ;
	done() ;
} ) ;
```

<a name="async-conditionnal-asyncplanprototypeboolean"></a>
## async.Plan.prototype.boolean()
should force async.and()'s result to be a boolean, so 'wonderful' && 7 should evaluate to true.

```js
var stats = createStats( 2 ) ;

async.and( [
	[ asyncJob , stats , 0 , 0 , {} , [ 'wonderful' ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ]
] )
.boolean()
.exec( function( result ) {
	expect( result ).to.be.equal( true ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1 ] ) ;
	done() ;
} ) ;
```

using .boolean( false ), it should force async.if.and()'s result to preserve the last evaluated value (the javascript way), so 'wonderful' && 7 should evaluate to 7.

```js
var stats = createStats( 2 ) ;

async.if.and( [
	[ asyncJob , stats , 0 , 0 , {} , [ 'wonderful' ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ]
] )
.boolean( false )
.exec( function( result ) {
	expect( result ).to.be.equal( 7 ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1 ] ) ;
	done() ;
} ) ;
```

<a name="asyncplanprototypethen-else-catch-finally-execthencatch-execthenelse-and-execthenelsecatch"></a>
# async.Plan.prototype.then(), .else(), .catch(), .finally(), .execThenCatch(), .execThenElse() and .execThenElseCatch()
should run a series of successful jobs and trigger in-plan and in-exec then() and finally().

```js
var stats = createStats( 3 ) ;

async.do( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.then( function( results ) {
	stats.plan.then ++ ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
} )
.catch( function( error , results ) {
	stats.plan.catch ++ ;
	done( new Error( "Should not trigger catch()" ) ) ;
} )
.finally( function( error , results ) {
	stats.plan.finally ++ ;
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
} )
.execThenCatch( 
	function( results ) {
		stats.exec.then ++ ;
		expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
		expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
		expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	} ,
	function( error , results ) {
		stats.exec.catch ++ ;
		done( new Error( "Should not trigger catch()" ) ) ;
	} ,
	function( error , results ) {
		expect( error ).not.to.be.an( Error ) ;
		expect( results ).to.be.eql( [ [ undefined , 'my' ], [ undefined , 'wonderful' ], [ undefined , 'result' ] ] ) ;
		expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
		expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
		expect( stats.plan.then ).to.be.equal( 1 ) ;
		expect( stats.plan.catch ).to.be.equal( 0 ) ;
		expect( stats.plan.finally ).to.be.equal( 1 ) ;
		expect( stats.exec.then ).to.be.equal( 1 ) ;
		expect( stats.exec.catch ).to.be.equal( 0 ) ;
		done() ;
	}
) ;
```

should run a series of jobs, interrupted by an error, and trigger in-plan and in-exec catch() and finally().

```js
var stats = createStats( 3 ) ;

async.do( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ new Error() , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.then( function( results ) {
	stats.plan.then ++ ;
	done( new Error( "Should not trigger then()" ) ) ;
} )
.catch( function( error , results ) {
	stats.plan.catch ++ ;
	expect( error ).to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ new Error() , 'wonderful' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1 ] ) ;
} )
.finally( function( error , results ) {
	stats.plan.finally ++ ;
	expect( error ).to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ new Error() , 'wonderful' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1 ] ) ;
} )
.execThenCatch(
	function( results ) {
		stats.exec.then ++ ;
		done( new Error( "Should not trigger then()" ) ) ;
	} ,
	function( error , results ) {
		stats.exec.catch ++ ;
		expect( error ).to.be.an( Error ) ;
		expect( results ).to.be.eql( [ [ undefined , 'my' ], [ new Error() , 'wonderful' ] ] ) ;
		expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
		expect( stats.order ).to.be.eql( [ 0, 1 ] ) ;
	} ,
	function( error , results ) {
		expect( error ).to.be.an( Error ) ;
		expect( results ).to.be.eql( [ [ undefined , 'my' ], [ new Error() , 'wonderful' ] ] ) ;
		expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
		expect( stats.order ).to.be.eql( [ 0, 1 ] ) ;
		expect( stats.plan.then ).to.be.equal( 0 ) ;
		expect( stats.plan.catch ).to.be.equal( 1 ) ;
		expect( stats.plan.finally ).to.be.equal( 1 ) ;
		expect( stats.exec.then ).to.be.equal( 0 ) ;
		expect( stats.exec.catch ).to.be.equal( 1 ) ;
		done() ;
	}
) ;
```

should evaluate async truthy && truthy && truthy to true, and trigger in-plan and in-exec then() and finally().

```js
var stats = createStats( 3 ) ;

async.if.and( [
	[ asyncJob , stats , 0 , 0 , {} , [ true ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ 7 ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ 'wonderful' ] ]
] )
.then( function( result ) {
	stats.plan.then ++ ;
	expect( result ).to.be.equal( true ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
} )
.else( function( result ) {
	stats.plan.else ++ ;
	done( new Error( "Should not trigger else()" ) ) ;
} )
.catch( function( error ) {
	stats.plan.catch ++ ;
	done( new Error( "Should not trigger catch()" ) ) ;
} )
.finally( function( result ) {
	stats.plan.finally ++ ;
	expect( result ).to.be.equal( true ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
} )
.execThenElseCatch(
	function( result ) {
		stats.exec.then ++ ;
		expect( result ).to.be.equal( true ) ;
		expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	} ,
	function( result ) {
		stats.exec.else ++ ;
		done( new Error( "Should not trigger else()" ) ) ;
	} ,
	function( error ) {
		stats.exec.catch ++ ;
		done( new Error( "Should not trigger catch()" ) ) ;
	} ,
	function( result ) {
		expect( result ).to.be.equal( true ) ;
		expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
		expect( stats.plan.then ).to.be.equal( 1 ) ;
		expect( stats.plan.else ).to.be.equal( 0 ) ;
		expect( stats.plan.catch ).to.be.equal( 0 ) ;
		expect( stats.plan.finally ).to.be.equal( 1 ) ;
		expect( stats.exec.then ).to.be.equal( 1 ) ;
		expect( stats.exec.else ).to.be.equal( 0 ) ;
		expect( stats.exec.catch ).to.be.equal( 0 ) ;
		done() ;
	}
) ;
```

should evaluate async truthy && falsy && truthy to false, and trigger in-plan and in-exec else() and finally().

```js
var stats = createStats( 3 ) ;

async.if.and( [
	[ asyncJob , stats , 0 , 0 , {} , [ true ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ 0 ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ 'wonderful' ] ]
] )
.then( function( result ) {
	stats.plan.then ++ ;
	done( new Error( "Should not trigger then()" ) ) ;
} )
.else( function( result ) {
	stats.plan.else ++ ;
	expect( result ).to.be.equal( false ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
} )
.catch( function( error ) {
	stats.plan.catch ++ ;
	done( new Error( "Should not trigger catch()" ) ) ;
} )
.finally( function( result ) {
	stats.plan.finally ++ ;
	expect( result ).to.be.equal( false ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
} )
.execThenElseCatch(
	function( result ) {
		stats.exec.then ++ ;
		done( new Error( "Should not trigger then()" ) ) ;
	} ,
	function( result ) {
		stats.exec.else ++ ;
		expect( result ).to.be.equal( false ) ;
		expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
	} ,
	function( error ) {
		stats.exec.catch ++ ;
		done( new Error( "Should not trigger catch()" ) ) ;
	} ,
	function( result ) {
		expect( result ).to.be.equal( false ) ;
		expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
		expect( stats.plan.then ).to.be.equal( 0 ) ;
		expect( stats.plan.else ).to.be.equal( 1 ) ;
		expect( stats.plan.catch ).to.be.equal( 0 ) ;
		expect( stats.plan.finally ).to.be.equal( 1 ) ;
		expect( stats.exec.then ).to.be.equal( 0 ) ;
		expect( stats.exec.else ).to.be.equal( 1 ) ;
		expect( stats.exec.catch ).to.be.equal( 0 ) ;
		done() ;
	}
) ;
```

should evaluate async truthy && Error && truthy to Error, and trigger in-plan and in-exec catch() and finally().

```js
var stats = createStats( 3 ) ;

async.if.and( [
	[ asyncJob , stats , 0 , 0 , {} , [ true ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ new Error() ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ 'wonderful' ] ]
] )
.then( function( result ) {
	stats.plan.then ++ ;
	done( new Error( "Should not trigger then()" ) ) ;
} )
.else( function( result ) {
	stats.plan.else ++ ;
	done( new Error( "Should not trigger else()" ) ) ;
} )
.catch( function( error ) {
	stats.plan.catch ++ ;
	expect( error ).to.be.an( Error ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
} )
.finally( function( result ) {
	stats.plan.finally ++ ;
	expect( result ).to.be.an( Error ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
} )
.execThenElseCatch(
	function( result ) {
		stats.exec.then ++ ;
		done( new Error( "Should not trigger then()" ) ) ;
	} ,
	function( result ) {
		stats.exec.else ++ ;
		done( new Error( "Should not trigger else()" ) ) ;
	} ,
	function( error ) {
		stats.exec.catch ++ ;
		expect( error ).to.be.an( Error ) ;
		expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
	} ,
	function( result ) {
		expect( result ).to.be.an( Error ) ;
		expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
		expect( stats.plan.then ).to.be.equal( 0 ) ;
		expect( stats.plan.else ).to.be.equal( 0 ) ;
		expect( stats.plan.catch ).to.be.equal( 1 ) ;
		expect( stats.plan.finally ).to.be.equal( 1 ) ;
		expect( stats.exec.then ).to.be.equal( 0 ) ;
		expect( stats.exec.else ).to.be.equal( 0 ) ;
		expect( stats.exec.catch ).to.be.equal( 1 ) ;
		done() ;
	}
) ;
```

when there isn't any catch() and a job has an error, it should trigger in-plan and in-exec else() and finally().

```js
var stats = createStats( 3 ) ;

async.if.and( [
	[ asyncJob , stats , 0 , 0 , {} , [ true ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ new Error() ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ 'wonderful' ] ]
] )
.then( function( result ) {
	stats.plan.then ++ ;
	done( new Error( "Should not trigger then()" ) ) ;
} )
.else( function( result ) {
	stats.plan.else ++ ;
	expect( result ).to.be( false ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
} )
.finally( function( result ) {
	stats.plan.finally ++ ;
	expect( result ).to.be( false ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
} )
.execThenElse(
	function( result ) {
		stats.exec.then ++ ;
		done( new Error( "Should not trigger then()" ) ) ;
	} ,
	function( result ) {
		stats.exec.else ++ ;
		expect( result ).to.be( false ) ;
		expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
	} ,
	function( result ) {
		expect( result ).to.be( false ) ;
		expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
		expect( stats.plan.then ).to.be.equal( 0 ) ;
		expect( stats.plan.else ).to.be.equal( 1 ) ;
		expect( stats.plan.finally ).to.be.equal( 1 ) ;
		expect( stats.exec.then ).to.be.equal( 0 ) ;
		expect( stats.exec.else ).to.be.equal( 1 ) ;
		done() ;
	}
) ;
```

<a name="asyncplanprototypetimeout"></a>
# async.Plan.prototype.timeout()
should abort job in a series that take too much time to complete, its result should be an error.

```js
var stats = createStats( 3 ) ;

async.series( [
	[ asyncJob , stats , 0 , 0 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 50 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.timeout( 20 )
.exec( function( error , results ) {
	expect( error ).to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ] , [ new Error() ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 0, 0 ] ) ;
	expect( stats.order ).to.be.eql( [ 0 ] ) ;
	done() ; 
} ) ;
```

should abort job in a parallel flow that take too much time to complete, its result should be an error.

```js
var stats = createStats( 3 ) ;

async.parallel( [
	[ asyncJob , stats , 0 , 0 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 50 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.timeout( 20 )
.exec( function( error , results ) {
	expect( error ).to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ] , [ new Error() ] , [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 0, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 2 ] ) ;
	done() ; 
} ) ;
```

<a name="asyncplanprototyperetry"></a>
# async.Plan.prototype.retry()
should retry a series of job with failure the good amount of time, in the good order, then succeed and return the good results.

```js
var stats = createStats( 3 ) ;

async.do( [
	[ asyncJob , stats , 0 , 20 , { failCount: 3 } , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 10 , { failCount: 5 } , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 5 , { failCount: 2 } , [ undefined , 'result' ] ]
] )
.retry( 10 , 5 )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ] , [ undefined , 'wonderful' ] , [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 4, 6, 3 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2 ] ) ;
	done() ; 
} ) ;
```

should retry parallel jobs with failure the good amount of time, then succeed and return the good results.

```js
var stats = createStats( 3 ) ;

async.parallel( [
	[ asyncJob , stats , 0 , 20 , { failCount: 3 } , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 10 , { failCount: 5 } , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 5 , { failCount: 2 } , [ undefined , 'result' ] ]
] )
.retry( 10 , 5 )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ] , [ undefined , 'wonderful' ] , [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 4, 6, 3 ] ) ;
	// stats.order is not relevant here
	done() ; 
} ) ;
```

<a name="mixing-asyncplanprototyperetry--asyncplanprototypetimeout"></a>
# Mixing async.Plan.prototype.retry() & async.Plan.prototype.timeout()
when a job timeout and is still pending, it should be retried, if the second try complete before, it transmit its result.

```js
var stats = createStats( 3 ) ;

async.do( [
	[ asyncJob , stats , 0 , 5 , {} , [ undefined , 'my' ] ] ,
	function( callback ) {
		var timeout , result ;
		
		stats.startCounter[ 1 ] ++ ;
		timeout = 0 ;
		
		switch ( stats.startCounter[ 1 ] )
		{
			case 1 : result = '1st' ; timeout = 100 ; break ;
			case 2 : result = '2nd' ; break ;
			case 3 : result = '3rd' ; break ;
			default : result = '' + stats.startCounter[ 1 ] + 'th' ; break ;
		}
		
		setTimeout( function() {
			stats.endCounter[ 1 ] ++ ;
			stats.order.push( 1 ) ;
			callback( undefined , result ) ;
		} , timeout ) ;
	} ,
	[ asyncJob , stats , 2 , 5 , {} , [ undefined , 'result' ] ]
] )
.timeout( 20 )
.retry( 5 )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ] , [ undefined , '2nd' ] , [ undefined , 'result' ] ] ) ;
	expect( stats.startCounter ).to.be.eql( [ 1, 2, 1 ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ; 
} ) ;
```

be careful when mixing .timeout() and .retry(), if a job timeout and retry, the first try may finally complete before other try, so it should return the result of the first try to complete.

```js
var stats = createStats( 3 ) ;

async.do( [
	[ asyncJob , stats , 0 , 5 , {} , [ undefined , 'my' ] ] ,
	function( callback ) {
		var timeout , result ;
		
		stats.startCounter[ 1 ] ++ ;
		timeout = 50 ;
		
		switch ( stats.startCounter[ 1 ] )
		{
			case 1 : result = '1st' ; break ;
			case 2 : result = '2nd' ; break ;
			case 3 : result = '3rd' ; break ;
			default : result = '' + stats.startCounter[ 1 ] + 'th' ; break ;
		}
		
		setTimeout( function() {
			stats.endCounter[ 1 ] ++ ;
			stats.order.push( 1 ) ;
			callback( undefined , result ) ;
		} , timeout ) ;
	} ,
	[ asyncJob , stats , 2 , 5 , {} , [ undefined , 'result' ] ]
] )
.timeout( 20 )
.retry( 5 )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ] , [ undefined , '1st' ] , [ undefined , 'result' ] ] ) ;
	expect( stats.startCounter ).to.be.eql( [ 1, 3, 1 ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ; 
} ) ;
```

<a name="asyncplanprototypeparallel"></a>
# async.Plan.prototype.parallel()
should run parallel jobs, with a limit of jobs running at a time.

```js
var stats = createStats( 6 ) ;

async.parallel( [
	[ asyncJob , stats , 0 , 60 , {} , [ undefined , 'one' ] ] ,	// @60
	[ asyncJob , stats , 1 , 20 , {} , [ undefined , 'two' ] ] ,	// @20
	[ asyncJob , stats , 2 , 40 , {} , [ undefined , 'three' ] ] ,	// @40
	[ asyncJob , stats , 3 , 0 , {} , [ undefined , 'four' ] ] ,	// @20+
	[ asyncJob , stats , 4 , 30 , {} , [ undefined , 'five' ] ] ,	// @50+
	[ asyncJob , stats , 5 , 0 , {} , [ undefined , 'six' ] ]	// @40+
] )
.parallel( 3 )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined, 'one' ], [ undefined, 'two' ], [ undefined, 'three' ], [ undefined, 'four' ], [ undefined, 'five' ], [ undefined, 'six' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1, 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 1, 3, 2, 5, 4, 0 ] ) ;
	done() ;
} ) ;
```

<a name="asyncplanprototypefatal"></a>
# async.Plan.prototype.fatal()
should run the series of job and continue on error.

```js
var stats = createStats( 3 ) ;

async.do( [
	[ asyncJob , stats , 0 , 20 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ new Error() , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 10 , {} , [ undefined , 'result' ] ]
] )
.fatal( false )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ new Error() , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

should run parallel jobs and continue on error.

```js
var stats = createStats( 3 ) ;

async.parallel( [
	[ asyncJob , stats , 0 , 20 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 0 , {} , [ new Error() , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 10 , {} , [ undefined , 'result' ] ]
] )
.fatal( false )
.exec( function( error , results ) {
	expect( error ).not.to.be.an( Error ) ;
	expect( results ).to.be.eql( [ [ undefined , 'my' ], [ new Error() , 'wonderful' ], [ undefined , 'result' ] ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 1, 2, 0 ] ) ;
	done() ;
} ) ;
```

<a name="asyncplanprototypelastjobonly"></a>
# async.Plan.prototype.lastJobOnly()
should run the series of job and pass only the results of the last job.

```js
var stats = createStats( 3 ) ;

async.series( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.lastJobOnly()
.exec( function() {
	var args = Array.prototype.slice.call( arguments ) ;
	expect( args ).to.be.eql( [ undefined , 'result' ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 0, 1, 2 ] ) ;
	done() ;
} ) ;
```

should run jobs in parallel and pass only the results of the last job - can produce random result with parallel mode!.

```js
var stats = createStats( 3 ) ;

async.parallel( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.lastJobOnly()
.exec( function() {
	var args = Array.prototype.slice.call( arguments ) ;
	expect( args ).to.be.eql( [ undefined , 'wonderful' ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 2, 0, 1 ] ) ;
	done() ;
} ) ;
```

<a name="asyncplanprototypemapping1to1"></a>
# async.Plan.prototype.mapping1to1()
the results should map one to one the job's list, any extra arguments passed to the job's callback should be ignored.

```js
var stats = createStats( 3 ) ;

async.parallel( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' , 'extra argument that will be dropped' ] ]
] )
.mapping1to1()
.exec( function( error , results ) {
	expect( results ).to.be.eql( [ 'my' , 'wonderful' , 'result' ] ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 2, 0, 1 ] ) ;
	done() ;
} ) ;
```

when using an object as the job's list, the result is an object mapping one to one the job's list.

```js
var stats = createStats( 3 ) ;

async.parallel( {
	one: [ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	two: [ asyncJob , stats , 1 , 100 , {} , [ undefined , 'wonderful' ] ] ,
	three: [ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' , 'extra argument that will be dropped' ] ]
} )
.mapping1to1()
.exec( function( error , results ) {
	expect( results ).to.be.eql( { one: 'my' , two: 'wonderful' , three: 'result' } ) ;
	expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
	expect( stats.order ).to.be.eql( [ 2, 0, 1 ] ) ;
	done() ;
} ) ;
```

<a name="asyncplanprototypeexeckv"></a>
# async.Plan.prototype.execKV()
should pass an object with inputs arguments in 'inputs' property and 'then' & 'finally' callback in properties of the same name.

```js
var stats = createStats( 3 ) ;
var then ;

async.parallel( [
	function( describe , body , callback ) {
		var id = 0 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "DESCRIPTION: " + describe ) ;
		} , 20 ) ;
	} ,
	function( describe , body , callback ) {
		var id = 1 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "LENGTH: " + body.length ) ;
		} , 10 ) ;
	} ,
	function( describe , body , callback ) {
		var id = 2 ;
		stats.startCounter[ id ] ++ ;
		setTimeout( function() {
			stats.endCounter[ id ] ++ ;
			stats.order.push( id ) ;
			callback( undefined , "BODY: " + body ) ;
		} , 0 ) ;
	}
] )
.execKV( {
	inputs: [ 'some data' , 'blahblihblah' ],
	then: function( results ) {
		then = true ;
		expect( results ).to.be.eql( [
			[ undefined , 'DESCRIPTION: some data' ] ,
			[ undefined , 'LENGTH: 12' ] ,
			[ undefined , 'BODY: blahblihblah' ]
		] ) ;
	} ,
	'finally': function( error , results ) {
		expect( error ).not.to.be.an( Error ) ;
		expect( then ).to.be.equal( true ) ;
		expect( results ).to.be.eql( [
			[ undefined , 'DESCRIPTION: some data' ] ,
			[ undefined , 'LENGTH: 12' ] ,
			[ undefined , 'BODY: blahblihblah' ]
		] ) ;
		expect( stats.endCounter ).to.be.eql( [ 1, 1, 1 ] ) ;
		expect( stats.order ).to.be.eql( [ 2, 1, 0 ] ) ;
		done() ;
	}
} ) ;
```

should accept 'catch' callback in the 'catch' property.

```js
var stats = createStats( 3 ) ;
var then , catch_ ;

async.series( [
	[ asyncJob , stats , 0 , 50 , {} , [ undefined , 'my' ] ] ,
	[ asyncJob , stats , 1 , 100 , {} , [ new Error() , 'wonderful' ] ] ,
	[ asyncJob , stats , 2 , 0 , {} , [ undefined , 'result' ] ]
] )
.execKV( {
	inputs: [ 'some data' , 'blahblihblah' ],
	then: function( results ) {
		then = true ;
	} ,
	'catch': function( results ) {
		catch_ = true ;
	} ,
	'finally': function( error , results ) {
		expect( error ).to.be.an( Error ) ;
		expect( stats.endCounter ).to.be.eql( [ 1, 1, 0 ] ) ;
		expect( stats.order ).to.be.eql( [ 0, 1 ] ) ;
		expect( then ).to.not.be.equal( true ) ;
		expect( catch_ ).to.be.equal( true ) ;
		expect( results ).to.be.eql( [ [ undefined , 'my' ], [ new Error() , 'wonderful' ] ] ) ;
		done() ;
	}
} ) ;
```

should accept the aggegate property as well.

```js
var myArray = [ 'my' , 'wonderful' , 'result' ] ;
var then ;

async.reduce( myArray , 5 , function( aggregate , element , callback ) {
	
	setTimeout( function() {
		callback( undefined , aggregate + element.length ) ;
	} , 0 ) ;
} )
.execKV( {
	aggregate: 11,
	'then': function( results ) {
		then = true ;
		expect( results ).to.be.eql( 28 ) ;
	} ,
	'finally': function( error , results ) {
		expect( error ).not.to.be.an( Error ) ;
		expect( then ).to.be.equal( true ) ;
		expect( results ).to.be.eql( 28 ) ;
		done() ;
	}
} ) ;
```

