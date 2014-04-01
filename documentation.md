
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
async.do.series( [
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

If one job fails (ie it calls its callback with an error or any truthy value), all remaining jobs are skipped 
and the *exec*'s callback is instantly called with that error.

When every jobs are finished, the *exec*'s callback is called, the *results* argument contains an array of the *arguments* passed by each job to its callback.



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
var plan = async.do.series( [
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

In most case, callbacks work in the node.js fashion, except explicitly expressed otherwise.
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
async.do.waterfall( [
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
  that URL and call its callback the node.js way: `callback( error , contents )`
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

* /!\ Work in progress /!\ *



## Factories

Unless specified otherwise, they all return an async.Plan object, and set the jobs list.


### async.do( jobsList )

* jobsList `Array` or `Object`

This is the most generic factory.
It creates an async.Plan object, set up the job's list, and almost everything remain possible.

Note that an async.Plan do not perform anything until its `.exec()` method is called (see Class async.Plan for details).
The following informations describe what happend when the plan is executed.

By default, jobs are processed one at a time.

If an error occurs, no new jobs will be processed.

The `finally` callback (see below) is triggered when the first error occurs or when all jobs are done.

Note: **all others factories are described relative to this one as a point of reference.**
Only differences will be put.



### async.do.series( jobsList ) , async.doSeries( jobsList )

* jobsList `Array` or `Object`

Set up a job's list to be processed in series.

**Calling `.parallel()` on it has no effect, it will process jobs one at a time anyway.**



### async.do.parallel( jobsList ) , async.doParallel( jobsList )

* jobsList `Array` or `Object`

Set up a job's list to be processed in parallel.
The parallel limit is set to `Infinity` by default.



### async.do.race( jobsList )

* jobsList `Array` or `Object`

Set up a job's list to be processed in parallel.
The parallel limit is set to `Infinity` by default.

The `finally` callback is triggered when the first job finish without error, or when all jobs have failed.
Jobs processing continue on error, but no new jobs will be processed when one job succeed.



### async.do.waterfall( jobsList ) , async.doSeries( jobsList )

* jobsList `Array` or `Object`

Set up a job's list to be processed in series, in waterfall mode.
Each job is called with the previous job output as arguments.

By default, the `exec()` method accept arguments to pass to the first job.

**Calling `.parallel()` on it has no effect, it will process jobs one at a time anyway.**

```js
async.waterfall( [
	function( str , callback ) {
		callback( undefined , str + ' my' ) ;
	} ,
	function( str , callback ) {
		callback( undefined , str + ' wonderful' ) ;
	} ,
	function( str , callback ) {
		callback( undefined , str + ' result' ) ;
	}
] )
.exec( 'oh' , function( error , results ) {
	// produce 'oh my wonderful result'
	console.log( results ) ;
} ) ;
```



### async.do.foreach( container , iterator ) , async.doSeries( jobsList )

* container `Array` or `Object` to iterate
* iterator `Function( element , callback )` where:
	* element `mixed` the current array element or object's property value
	* callback `Function` to be called on completion

```js
async.foreach( myArray , function( element , callback ) {
	doSomethingAsyncWithElement( element , callback ) ;
} )
.exec( function() {
	console.log( "Finished!" ) ;
} ) ;
```


## Class

### async.Plan



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


