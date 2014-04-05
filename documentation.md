
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
	* [async.while().do()](#ref.async.while)
* [*Conditionnal* family factories](#ref.conditionnal.factories)
	* [async.and()](#ref.async.and)
	* [async.or()](#ref.async.or)
	* [async.if.and()](#ref.async.if.and)
	* [async.if.or()](#ref.async.if.or)
	* [Nested condition()](#ref.nested)
* [Class async.Plan](#ref.async.Plan)
	* [.fatal()](#ref..fatal)
	* [.boolean()](#ref..boolean)
	* [.transmitError()](#ref..transmitError)
	* [.timeout()](#ref..timeout)
	* [.lastJobOnly()](#ref..lastJobOnly)



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

The `finally` callback is triggered when the first job finish without error, or when all jobs have failed.
Jobs processing continue on error, but no new jobs will be processed when one job succeed.



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



<a name="ref.async.while"></a>
### async.while( whileCallback ).do( jobsList )

* conditionCallback `Function( error , results , logicCallback )` triggered for checking if we have to continue or not, where:
	* error `mixed` any truthy means error
	* results `Array` or `Object` that maps the *jobsList*
	* logicCallback `Function( [error] , result )` where:
		* error `mixed` any truthy means error
		* result `mixed`
* jobsList `Array` or `Object`

It performs an async while loop.

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
	ifSomeConditionAreMetAnd
	async.or( [
		ifSomeMoreConditionAreMet
		orIfSomeAlternativeConditionAreMet
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
`ifSomeConditionAreMetAnd`, `ifSomeMoreConditionAreMet` and `orIfSomeAlternativeConditionAreMet` 
are user functions asyncly checking if some condition are met or not.

This works because if a job is an instance of `async.Plan`, the `.exec()` method will be used as a callback.

We can use as many nested async conditionnal as we want.



<a name="ref.async.Plan"></a>
## Class async.Plan

Each factory come with a default set of behaviour. 
Almost all behaviours can be modified by methods.

However, modifier methods have no effect as soon as an `.exec()` family method is used on the current `async.Plan`.



<a name="ref..fatal"></a>
### .fatal( [errorsAreFatal] )

* errorsAreFatal `Boolean`, if omitted: true.

If errors are fatal (the default in most factories), then whenever a job fails the whole process is aborted immediately.

If error are not fatal, others jobs will be processed even if some errors occurs.



<a name="ref..boolean"></a>
### .boolean( [castToBoolean] )

* castToBoolean `Boolean`, if omitted: true.

This only have effects in *Conditionnal* family `async.Plan`.

If *castToBoolean* is true, the outcome of jobs and the final outcome is always `true` or `false`:
this is what happens with `async.if.and()` and `async.if.or()` factories by default.

If *castToBoolean* is false, the outcome of each job remains unchanged, and the final outcome is 
the outcome of the last job: this is what happens with `async.and()` and `async.or()` factories by default.



<a name="ref..transmitError"></a>
### .transmitError( [transmit] )

* transmit `Boolean`, if omitted: true.

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

If the job trigger its callback later, it will be ignored.

It comes in handy in any network or service dependant async jobs, like database queries, HTTP request, and so on.



<a name="ref..lastJobOnly"></a>
### .lastJobOnly( [returnLastJobOnly] )

* returnLastJobOnly `boolean`, if omited: `true`.

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

**BE CAREFUL:** when using `.lastJobOnly()` in parallel mode, this is the job that finish last which transmit its results.
This is **\*NOT\* necessarly** the last job in the job's list.
Note that `.lastJobOnly()` is used in `async.race()` factory, but here the whole process abort when the first job finish
without error, so the first job and the last job are the same.





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


